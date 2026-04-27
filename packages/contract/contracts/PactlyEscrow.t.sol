// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {PactlyEscrow} from "./PactlyEscrow.sol";
import {PactlyReputation} from "./PactlyReputation.sol";
import {PactlyTreasury} from "./PactlyTreasury.sol";

/// @dev Subclass that bumps a public version number — used to prove the proxy upgrades.
contract PactlyEscrowV2 is PactlyEscrow {
    function version() external pure returns (uint256) {
        return 2;
    }
}

contract PactlyEscrowTest is Test {
    PactlyEscrow internal escrow;
    PactlyReputation internal reputation;
    PactlyTreasury internal treasury;

    address internal owner = address(this);
    address internal proposer = address(0xA11CE);
    address internal counterparty = address(0xB0B);
    address internal stranger = address(0xCAFE);

    uint256 internal constant STAKE = 1 ether;
    bytes32 internal constant DETAILS = keccak256("Coffee at Anomali, Sat 7pm");

    function setUp() public {
        treasury = new PactlyTreasury();

        // Reputation impl + proxy
        PactlyReputation reputationImpl = new PactlyReputation();
        ERC1967Proxy reputationProxy = new ERC1967Proxy(
            address(reputationImpl),
            abi.encodeCall(PactlyReputation.initialize, (owner))
        );
        reputation = PactlyReputation(address(reputationProxy));

        // Escrow impl + proxy
        PactlyEscrow escrowImpl = new PactlyEscrow();
        ERC1967Proxy escrowProxy = new ERC1967Proxy(
            address(escrowImpl),
            abi.encodeCall(
                PactlyEscrow.initialize,
                (payable(address(treasury)), address(reputation), owner)
            )
        );
        escrow = PactlyEscrow(address(escrowProxy));

        reputation.setEscrow(address(escrow));

        vm.deal(proposer, 10 ether);
        vm.deal(counterparty, 10 ether);
        vm.deal(stranger, 10 ether);
    }

    // -------- helpers --------

    function _propose(uint256 dateAt) internal returns (uint256 dateId) {
        vm.prank(proposer);
        dateId = escrow.proposeDate{value: STAKE}(counterparty, dateAt, DETAILS);
    }

    function _accept(uint256 dateId) internal {
        vm.prank(counterparty);
        escrow.acceptDate{value: STAKE}(dateId);
    }

    function _proposeAndAccept() internal returns (uint256 dateId, uint256 dateAt) {
        dateAt = block.timestamp + 1 days;
        dateId = _propose(dateAt);
        _accept(dateId);
    }

    function _afterDate(uint256 dateAt) internal {
        vm.warp(dateAt + 1);
    }

    function _afterResolve(uint256 dateAt) internal {
        vm.warp(dateAt + 48 hours + 1);
    }

    // -------- propose / accept / cancel --------

    function test_Propose_LocksStake() public {
        uint256 dateAt = block.timestamp + 1 days;
        uint256 id = _propose(dateAt);
        assertEq(address(escrow).balance, STAKE);
        PactlyEscrow.Date memory d = escrow.getDate(id);
        assertEq(d.proposer, proposer);
        assertEq(d.counterparty, counterparty);
        assertEq(d.stakeAmount, STAKE);
        assertEq(uint8(d.status), uint8(PactlyEscrow.DateStatus.Proposed));
        assertEq(reputation.statsOf(proposer).datesProposed, 1);
    }

    function test_Propose_RevertsOnSelf() public {
        vm.prank(proposer);
        vm.expectRevert(PactlyEscrow.InvalidCounterparty.selector);
        escrow.proposeDate{value: STAKE}(proposer, block.timestamp + 1 days, DETAILS);
    }

    function test_Propose_RevertsOnPastDate() public {
        vm.warp(1000);
        vm.prank(proposer);
        vm.expectRevert(PactlyEscrow.DateInPast.selector);
        escrow.proposeDate{value: STAKE}(counterparty, 500, DETAILS);
    }

    function test_Propose_RevertsOnZeroStake() public {
        vm.prank(proposer);
        vm.expectRevert(PactlyEscrow.StakeRequired.selector);
        escrow.proposeDate{value: 0}(counterparty, block.timestamp + 1 days, DETAILS);
    }

    function test_Accept_Locks() public {
        (uint256 id, ) = _proposeAndAccept();
        assertEq(address(escrow).balance, 2 * STAKE);
        PactlyEscrow.Date memory d = escrow.getDate(id);
        assertEq(uint8(d.status), uint8(PactlyEscrow.DateStatus.Accepted));
        assertEq(reputation.statsOf(counterparty).datesAccepted, 1);
    }

    function test_Accept_RevertsOnWrongStake() public {
        uint256 dateAt = block.timestamp + 1 days;
        uint256 id = _propose(dateAt);
        vm.prank(counterparty);
        vm.expectRevert(PactlyEscrow.WrongStakeAmount.selector);
        escrow.acceptDate{value: STAKE - 1}(id);
    }

    function test_Accept_RevertsOnStranger() public {
        uint256 dateAt = block.timestamp + 1 days;
        uint256 id = _propose(dateAt);
        vm.prank(stranger);
        vm.expectRevert(PactlyEscrow.NotParticipant.selector);
        escrow.acceptDate{value: STAKE}(id);
    }

    function test_CancelBeforeAccept_RefundsProposer() public {
        uint256 dateAt = block.timestamp + 1 days;
        uint256 id = _propose(dateAt);
        uint256 balBefore = proposer.balance;
        vm.prank(proposer);
        escrow.cancelDateBeforeAccept(id);
        assertEq(proposer.balance, balBefore + STAKE);
        assertEq(uint8(escrow.getDate(id).status), uint8(PactlyEscrow.DateStatus.Cancelled));
    }

    function test_CancelBeforeAccept_RevertsAfterAccept() public {
        (uint256 id, ) = _proposeAndAccept();
        vm.prank(proposer);
        vm.expectRevert(PactlyEscrow.WrongStatus.selector);
        escrow.cancelDateBeforeAccept(id);
    }

    // -------- 7 outcome paths --------

    function test_Outcome_MetMet_Returns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.confirmMet(id);
        vm.prank(counterparty);
        escrow.confirmMet(id);
        _afterResolve(dateAt);

        uint256 pBefore = proposer.balance;
        uint256 cBefore = counterparty.balance;
        escrow.resolveDate(id);

        assertEq(proposer.balance, pBefore + STAKE);
        assertEq(counterparty.balance, cBefore + STAKE);
        assertEq(reputation.statsOf(proposer).datesMet, 1);
        assertEq(reputation.statsOf(counterparty).datesMet, 1);
        assertEq(address(treasury).balance, 0);
    }

    function test_Outcome_GhostGhost_Burns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.reportGhost(id);
        vm.prank(counterparty);
        escrow.reportGhost(id);
        _afterResolve(dateAt);
        escrow.resolveDate(id);

        assertEq(address(treasury).balance, 2 * STAKE);
        assertEq(reputation.statsOf(proposer).datesGhosted, 1);
        assertEq(reputation.statsOf(counterparty).datesGhosted, 1);
    }

    function test_Outcome_MetGhost_Burns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.confirmMet(id);
        vm.prank(counterparty);
        escrow.reportGhost(id);
        _afterResolve(dateAt);
        escrow.resolveDate(id);

        assertEq(address(treasury).balance, 2 * STAKE);
        assertEq(reputation.statsOf(proposer).datesGhosted, 0);
        assertEq(reputation.statsOf(counterparty).datesGhosted, 1);
    }

    function test_Outcome_GhostMet_Burns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.reportGhost(id);
        vm.prank(counterparty);
        escrow.confirmMet(id);
        _afterResolve(dateAt);
        escrow.resolveDate(id);

        assertEq(address(treasury).balance, 2 * STAKE);
        assertEq(reputation.statsOf(proposer).datesGhosted, 1);
        assertEq(reputation.statsOf(counterparty).datesGhosted, 0);
    }

    function test_Outcome_NoneNone_AutoReturns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterResolve(dateAt);
        uint256 pBefore = proposer.balance;
        uint256 cBefore = counterparty.balance;
        escrow.resolveDate(id);

        assertEq(proposer.balance, pBefore + STAKE);
        assertEq(counterparty.balance, cBefore + STAKE);
        assertEq(address(treasury).balance, 0);
        assertEq(reputation.statsOf(proposer).datesGhosted, 0);
        assertEq(reputation.statsOf(counterparty).datesGhosted, 0);
    }

    function test_Outcome_MetNone_Burns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.confirmMet(id);
        _afterResolve(dateAt);
        escrow.resolveDate(id);

        assertEq(address(treasury).balance, 2 * STAKE);
        assertEq(reputation.statsOf(counterparty).datesGhosted, 1);
        assertEq(reputation.statsOf(proposer).datesGhosted, 0);
    }

    function test_Outcome_NoneMet_Burns() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(counterparty);
        escrow.confirmMet(id);
        _afterResolve(dateAt);
        escrow.resolveDate(id);

        assertEq(address(treasury).balance, 2 * STAKE);
        assertEq(reputation.statsOf(proposer).datesGhosted, 1);
        assertEq(reputation.statsOf(counterparty).datesGhosted, 0);
    }

    // -------- guards --------

    function test_Resolve_RevertsBeforeWindow() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.expectRevert(PactlyEscrow.ResolveWindowOpen.selector);
        escrow.resolveDate(id);
    }

    function test_Resolve_RevertsTwice() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterResolve(dateAt);
        escrow.resolveDate(id);
        vm.expectRevert(PactlyEscrow.WrongStatus.selector);
        escrow.resolveDate(id);
    }

    function test_Confirm_RevertsBeforeDate() public {
        (uint256 id, ) = _proposeAndAccept();
        vm.prank(proposer);
        vm.expectRevert(PactlyEscrow.TooEarly.selector);
        escrow.confirmMet(id);
    }

    function test_Confirm_RevertsTwiceSameUser() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.confirmMet(id);
        vm.prank(proposer);
        vm.expectRevert(PactlyEscrow.AlreadyConfirmed.selector);
        escrow.reportGhost(id);
    }

    function test_Confirm_RevertsForStranger() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        _afterDate(dateAt);
        vm.prank(stranger);
        vm.expectRevert(PactlyEscrow.NotParticipant.selector);
        escrow.confirmMet(id);
    }

    // -------- safety override --------

    function test_FlagUnsafe_RefundsFlaggerAndMarksOther() public {
        (uint256 id, ) = _proposeAndAccept();
        uint256 cBefore = counterparty.balance;
        vm.prank(counterparty);
        escrow.flagUnsafe(id);

        assertEq(counterparty.balance, cBefore + STAKE);
        assertEq(reputation.statsOf(proposer).safetyFlagsReceived, 1);
        assertEq(address(escrow).balance, STAKE);
    }

    function test_FlagUnsafe_BothPartiesRefund_Resolves() public {
        (uint256 id, ) = _proposeAndAccept();
        vm.prank(proposer);
        escrow.flagUnsafe(id);
        vm.prank(counterparty);
        escrow.flagUnsafe(id);

        assertEq(address(escrow).balance, 0);
        assertEq(uint8(escrow.getDate(id).status), uint8(PactlyEscrow.DateStatus.Resolved));
    }

    function test_FlagUnsafe_ThenResolveBurnOnConflict() public {
        (uint256 id, uint256 dateAt) = _proposeAndAccept();
        vm.prank(counterparty);
        escrow.flagUnsafe(id);

        _afterDate(dateAt);
        vm.prank(proposer);
        escrow.reportGhost(id);
        _afterResolve(dateAt);
        escrow.resolveDate(id);

        assertEq(address(treasury).balance, STAKE);
    }

    function test_FlagUnsafe_RevertsForStranger() public {
        (uint256 id, ) = _proposeAndAccept();
        vm.prank(stranger);
        vm.expectRevert(PactlyEscrow.NotParticipant.selector);
        escrow.flagUnsafe(id);
    }

    // -------- proxy / upgrade --------

    function test_Initialize_RevertsIfCalledTwice() public {
        vm.expectRevert();
        escrow.initialize(payable(address(treasury)), address(reputation), owner);
    }

    function test_Upgrade_PreservesStateAndExposesNewMethod() public {
        // Create some state on V1.
        (uint256 id, ) = _proposeAndAccept();

        // Upgrade to V2.
        PactlyEscrowV2 v2Impl = new PactlyEscrowV2();
        escrow.upgradeToAndCall(address(v2Impl), "");

        // State preserved.
        PactlyEscrow.Date memory d = escrow.getDate(id);
        assertEq(d.stakeAmount, STAKE);
        assertEq(uint8(d.status), uint8(PactlyEscrow.DateStatus.Accepted));
        assertEq(address(escrow).balance, 2 * STAKE);

        // New method available.
        assertEq(PactlyEscrowV2(address(escrow)).version(), 2);
    }

    function test_Upgrade_RevertsForNonOwner() public {
        PactlyEscrowV2 v2Impl = new PactlyEscrowV2();
        vm.prank(stranger);
        vm.expectRevert();
        escrow.upgradeToAndCall(address(v2Impl), "");
    }

    function test_SetTreasury_OnlyOwner() public {
        address payable newTreasury = payable(address(new PactlyTreasury()));
        escrow.setTreasury(newTreasury);
        assertEq(escrow.treasury(), newTreasury);

        vm.prank(stranger);
        vm.expectRevert();
        escrow.setTreasury(payable(address(treasury)));
    }
}
