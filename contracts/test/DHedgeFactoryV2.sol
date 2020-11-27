pragma solidity ^0.6.2;

import "../DHedgeFactory.sol";

contract DHedgeFactoryV2 is DHedgeFactory {
    function newMethod() public pure returns (uint256) {
        return 42;
    }
}