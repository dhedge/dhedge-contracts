pragma solidity ^0.6.2;

import "../DHedge.sol";

contract DHedgeV2 is DHedge {
    function totalFundValue() public override view returns (uint256) {
        uint256 total = 0;
        uint256 assetCount = supportedAssets.length;

        for (uint256 i = 0; i < assetCount; i++) {
            total = total.add(assetValue(supportedAssets[i]));
        }
        return total * 10;
    }
}
