// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract PactlyTreasury {
    event Slashed(address indexed from, uint256 amount);

    receive() external payable {
        emit Slashed(msg.sender, msg.value);
    }
}
