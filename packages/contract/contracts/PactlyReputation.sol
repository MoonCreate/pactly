// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract PactlyReputation is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    struct Stats {
        uint64 datesProposed;
        uint64 datesAccepted;
        uint64 datesMet;
        uint64 datesGhosted;
        uint64 safetyFlagsReceived;
    }

    address public escrow;
    mapping(address => Stats) private stats;

    uint256[48] private __gap;

    event EscrowSet(address indexed escrow);
    event ProposedRecorded(address indexed user);
    event AcceptedRecorded(address indexed user);
    event MetRecorded(address indexed user);
    event GhostedRecorded(address indexed user);
    event SafetyFlagRecorded(address indexed user);

    error NotEscrow();

    modifier onlyEscrow() {
        if (msg.sender != escrow) revert NotEscrow();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner) external initializer {
        __Ownable_init(initialOwner);
    }

    function setEscrow(address _escrow) external onlyOwner {
        escrow = _escrow;
        emit EscrowSet(_escrow);
    }

    function recordProposed(address user) external onlyEscrow {
        stats[user].datesProposed += 1;
        emit ProposedRecorded(user);
    }

    function recordAccepted(address user) external onlyEscrow {
        stats[user].datesAccepted += 1;
        emit AcceptedRecorded(user);
    }

    function recordMet(address user) external onlyEscrow {
        stats[user].datesMet += 1;
        emit MetRecorded(user);
    }

    function recordGhosted(address user) external onlyEscrow {
        stats[user].datesGhosted += 1;
        emit GhostedRecorded(user);
    }

    function recordSafetyFlag(address user) external onlyEscrow {
        stats[user].safetyFlagsReceived += 1;
        emit SafetyFlagRecorded(user);
    }

    function statsOf(address user) external view returns (Stats memory) {
        return stats[user];
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
