// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Counter {
    uint256 public value;

    event Incremented(uint256 by, uint256 value);

    function incrementBy(uint256 by) external {
        require(by > 0, "increment must be positive");
        value += by;
        emit Incremented(by, value);
    }
}
