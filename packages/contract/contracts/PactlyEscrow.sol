// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {PactlyReputation} from "./PactlyReputation.sol";

contract PactlyEscrow is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    enum DateStatus {
        Proposed,
        Accepted,
        Resolved,
        Cancelled
    }

    enum Confirmation {
        None,
        Met,
        Ghost
    }

    struct Date {
        address proposer;
        address counterparty;
        uint256 stakeAmount;
        uint256 dateTimestamp;
        bytes32 detailsHash;
        DateStatus status;
        Confirmation proposerConfirm;
        Confirmation counterpartyConfirm;
        uint256 resolveDeadline;
        bool proposerSafetyRefunded;
        bool counterpartySafetyRefunded;
    }

    uint256 public constant RESOLVE_WINDOW = 48 hours;

    address payable public treasury;
    PactlyReputation public reputation;

    uint256 public nextDateId;
    mapping(uint256 => Date) private dates;

    uint256[46] private __gap;

    event DateProposed(
        uint256 indexed dateId,
        address indexed proposer,
        address indexed counterparty,
        uint256 stakeAmount,
        uint256 dateTimestamp,
        bytes32 detailsHash
    );
    event DateAccepted(uint256 indexed dateId, address indexed counterparty);
    event DateCancelled(uint256 indexed dateId);
    event Confirmed(uint256 indexed dateId, address indexed user, Confirmation choice);
    event SafetyFlagged(uint256 indexed dateId, address indexed flagger, address indexed against);
    event DateResolved(
        uint256 indexed dateId,
        Confirmation proposerConfirm,
        Confirmation counterpartyConfirm,
        bool stakesReturned
    );
    event TreasuryUpdated(address indexed treasury);
    event ReputationUpdated(address indexed reputation);

    error InvalidCounterparty();
    error StakeRequired();
    error DateInPast();
    error DateNotFound();
    error WrongStatus();
    error WrongStakeAmount();
    error NotProposer();
    error NotParticipant();
    error AlreadyConfirmed();
    error TooEarly();
    error ResolveWindowOpen();
    error TransferFailed();
    error AlreadyFlagged();
    error ZeroAddress();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address payable _treasury,
        address _reputation,
        address initialOwner
    ) external initializer {
        if (_treasury == address(0) || _reputation == address(0)) revert ZeroAddress();
        __Ownable_init(initialOwner);
        treasury = _treasury;
        reputation = PactlyReputation(_reputation);
    }

    function setTreasury(address payable _treasury) external onlyOwner {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function setReputation(address _reputation) external onlyOwner {
        if (_reputation == address(0)) revert ZeroAddress();
        reputation = PactlyReputation(_reputation);
        emit ReputationUpdated(_reputation);
    }

    function proposeDate(
        address counterparty,
        uint256 dateTimestamp,
        bytes32 detailsHash
    ) external payable returns (uint256 dateId) {
        if (counterparty == address(0) || counterparty == msg.sender) revert InvalidCounterparty();
        if (msg.value == 0) revert StakeRequired();
        if (dateTimestamp <= block.timestamp) revert DateInPast();

        dateId = nextDateId++;
        dates[dateId] = Date({
            proposer: msg.sender,
            counterparty: counterparty,
            stakeAmount: msg.value,
            dateTimestamp: dateTimestamp,
            detailsHash: detailsHash,
            status: DateStatus.Proposed,
            proposerConfirm: Confirmation.None,
            counterpartyConfirm: Confirmation.None,
            resolveDeadline: 0,
            proposerSafetyRefunded: false,
            counterpartySafetyRefunded: false
        });

        reputation.recordProposed(msg.sender);
        emit DateProposed(dateId, msg.sender, counterparty, msg.value, dateTimestamp, detailsHash);
    }

    function acceptDate(uint256 dateId) external payable {
        Date storage d = _get(dateId);
        if (d.status != DateStatus.Proposed) revert WrongStatus();
        if (msg.sender != d.counterparty) revert NotParticipant();
        if (msg.value != d.stakeAmount) revert WrongStakeAmount();

        d.status = DateStatus.Accepted;
        d.resolveDeadline = d.dateTimestamp + RESOLVE_WINDOW;

        reputation.recordAccepted(msg.sender);
        emit DateAccepted(dateId, msg.sender);
    }

    function cancelDateBeforeAccept(uint256 dateId) external {
        Date storage d = _get(dateId);
        if (d.status != DateStatus.Proposed) revert WrongStatus();
        if (msg.sender != d.proposer) revert NotProposer();

        uint256 refund = d.stakeAmount;
        d.status = DateStatus.Cancelled;
        d.stakeAmount = 0;

        emit DateCancelled(dateId);
        _send(payable(d.proposer), refund);
    }

    function confirmMet(uint256 dateId) external {
        _confirm(dateId, Confirmation.Met);
    }

    function reportGhost(uint256 dateId) external {
        _confirm(dateId, Confirmation.Ghost);
    }

    function flagUnsafe(uint256 dateId) external {
        Date storage d = _get(dateId);
        if (d.status != DateStatus.Accepted) revert WrongStatus();

        uint256 refund = d.stakeAmount;
        if (msg.sender == d.proposer) {
            if (d.proposerSafetyRefunded) revert AlreadyFlagged();
            d.proposerSafetyRefunded = true;
            reputation.recordSafetyFlag(d.counterparty);
            emit SafetyFlagged(dateId, msg.sender, d.counterparty);
            _send(payable(d.proposer), refund);
        } else if (msg.sender == d.counterparty) {
            if (d.counterpartySafetyRefunded) revert AlreadyFlagged();
            d.counterpartySafetyRefunded = true;
            reputation.recordSafetyFlag(d.proposer);
            emit SafetyFlagged(dateId, msg.sender, d.proposer);
            _send(payable(d.counterparty), refund);
        } else {
            revert NotParticipant();
        }

        if (d.proposerSafetyRefunded && d.counterpartySafetyRefunded) {
            d.status = DateStatus.Resolved;
            emit DateResolved(dateId, d.proposerConfirm, d.counterpartyConfirm, true);
        }
    }

    function resolveDate(uint256 dateId) external {
        Date storage d = _get(dateId);
        if (d.status != DateStatus.Accepted) revert WrongStatus();
        if (block.timestamp < d.resolveDeadline) revert ResolveWindowOpen();

        Confirmation pc = d.proposerConfirm;
        Confirmation cc = d.counterpartyConfirm;
        uint256 stake = d.stakeAmount;

        d.status = DateStatus.Resolved;

        bool returnStakes = _shouldReturnStakes(pc, cc);
        emit DateResolved(dateId, pc, cc, returnStakes);

        if (pc == Confirmation.Met && cc == Confirmation.Met) {
            reputation.recordMet(d.proposer);
            reputation.recordMet(d.counterparty);
        } else if (!(pc == Confirmation.None && cc == Confirmation.None)) {
            // Conflict or silence-as-ghost: mark the ghost / silent party.
            if (pc != Confirmation.Met) reputation.recordGhosted(d.proposer);
            if (cc != Confirmation.Met) reputation.recordGhosted(d.counterparty);
        }

        if (returnStakes) {
            uint256 proposerRefund = d.proposerSafetyRefunded ? 0 : stake;
            uint256 counterpartyRefund = d.counterpartySafetyRefunded ? 0 : stake;
            if (proposerRefund > 0) _send(payable(d.proposer), proposerRefund);
            if (counterpartyRefund > 0) _send(payable(d.counterparty), counterpartyRefund);
        } else {
            uint256 burnAmount;
            if (!d.proposerSafetyRefunded) burnAmount += stake;
            if (!d.counterpartySafetyRefunded) burnAmount += stake;
            if (burnAmount > 0) _send(treasury, burnAmount);
        }
    }

    function getDate(uint256 dateId) external view returns (Date memory) {
        return dates[dateId];
    }

    function _confirm(uint256 dateId, Confirmation choice) internal {
        Date storage d = _get(dateId);
        if (d.status != DateStatus.Accepted) revert WrongStatus();
        if (block.timestamp < d.dateTimestamp) revert TooEarly();

        if (msg.sender == d.proposer) {
            if (d.proposerConfirm != Confirmation.None) revert AlreadyConfirmed();
            d.proposerConfirm = choice;
        } else if (msg.sender == d.counterparty) {
            if (d.counterpartyConfirm != Confirmation.None) revert AlreadyConfirmed();
            d.counterpartyConfirm = choice;
        } else {
            revert NotParticipant();
        }

        emit Confirmed(dateId, msg.sender, choice);
    }

    function _shouldReturnStakes(Confirmation pc, Confirmation cc) internal pure returns (bool) {
        if (pc == Confirmation.Met && cc == Confirmation.Met) return true;
        if (pc == Confirmation.None && cc == Confirmation.None) return true;
        return false;
    }

    function _get(uint256 dateId) internal view returns (Date storage d) {
        d = dates[dateId];
        if (d.proposer == address(0)) revert DateNotFound();
    }

    function _send(address payable to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
