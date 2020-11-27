pragma solidity ^0.6.2;

import "../DHedgeFactory.sol";

contract DHedgeFactoryV3 is DHedgeFactory {
    function getMaximumSupportedAssetCount() external view override returns (uint256) {
        return 1000;
    }
}