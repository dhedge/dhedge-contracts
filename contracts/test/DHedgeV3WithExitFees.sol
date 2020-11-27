pragma solidity ^0.6.2;

import "../DHedge.sol";

contract DHedgeV3WithExitFees is DHedge {
    //withdraw % of available supported tokens
    //deposit fund tokens
    function withdraw(uint256 _fundTokenAmount) public override {
        require(
            balanceOf(msg.sender) >= _fundTokenAmount,
            "insufficient balance of fund tokens"
        );

        uint256 fundValue = totalFundValue();

        //calculate the proportion
        uint256 portion = _fundTokenAmount.mul(10**18).div(totalSupply());
        //this cannot be below 1

        //first return funded tokens
        lastDeposit[msg.sender] = 0;
        _burn(msg.sender, _fundTokenAmount);

        uint256 assetCount = supportedAssets.length;

        for (uint256 i = 0; i < assetCount; i++) {
            address proxy = getAssetProxy(supportedAssets[i]);
            uint256 totalAssetBalance = IERC20(proxy).balanceOf(address(this));
            uint256 portionOfAssetBalance = totalAssetBalance.mul(portion).div(
                10**18
            );

            uint256 exitFee = portionOfAssetBalance.mul(10).div(100); // 10% exit fee
            uint256 leftoverAssetBalance = portionOfAssetBalance.sub(exitFee);

            if (exitFee > 0) {
                ISynth(proxy).transferAndSettle(manager(), exitFee);
            }
            if (leftoverAssetBalance > 0) {
                ISynth(proxy).transferAndSettle(
                    msg.sender,
                    leftoverAssetBalance
                );
            }
        }

        uint256 valueWithdrawn = portion.mul(fundValue);

        emit Withdrawal(
            address(this),
            msg.sender,
            valueWithdrawn,
            _fundTokenAmount,
            balanceOf(msg.sender),
            totalFundValue(),
            totalSupply(),
            now
        );
    }
}
