pragma solidity ^0.6.2;

import "../ISynthetix.sol";
import "./MockExchangeRates.sol";
import "./MockSystemStatus.sol";
import "./MockSynth.sol";

contract MockSynthetix is ISynthetix {
    bytes32
        private _susd = 0x7355534400000000000000000000000000000000000000000000000000000000;
    bytes32
        private _seth = 0x7345544800000000000000000000000000000000000000000000000000000000;
    bytes32
        private _ieth = 0x6945544800000000000000000000000000000000000000000000000000000000;
    bytes32
        private _sbtc = 0x7342544300000000000000000000000000000000000000000000000000000000;
    bytes32
        private _ibtc = 0x6942544300000000000000000000000000000000000000000000000000000000;
    bytes32
        private _slink = 0x734c494e4b000000000000000000000000000000000000000000000000000000;

    MockExchangeRates private _mockExchangeRates;
    MockSystemStatus private _mockSystemStatus;

    mapping(bytes32 => MockSynth) private _coins;

    constructor(
        MockExchangeRates mockExchangeRates,
        MockSystemStatus mockSystemStatus,
        MockSynth sUsd,
        MockSynth sEth,
        MockSynth iEth,
        MockSynth sBtc,
        MockSynth iBtc,
        MockSynth sLink
    ) public {
        _mockExchangeRates = mockExchangeRates;
        _mockSystemStatus = mockSystemStatus;
        _coins[_susd] = sUsd;
        _coins[_seth] = sEth;
        _coins[_ieth] = iEth;
        _coins[_sbtc] = sBtc;
        _coins[_ibtc] = iBtc;
        _coins[_slink] = sLink;
    }

    function exchange(
        bytes32 sourceCurrencyKey,
        uint256 sourceAmount,
        bytes32 destinationCurrencyKey
    ) external override returns (uint256 amountReceived) {
        uint256 targetAmount = _mockExchangeRates.effectiveValue(
            sourceCurrencyKey,
            sourceAmount,
            destinationCurrencyKey
        );

        _coins[sourceCurrencyKey].forceBurn(msg.sender, sourceAmount);
        _coins[destinationCurrencyKey].mint(msg.sender, targetAmount);

        return targetAmount;
    }

    function exchangeWithTracking(
        bytes32 sourceCurrencyKey,
        uint sourceAmount,
        bytes32 destinationCurrencyKey,
        address /*originator*/,
        bytes32 /*trackingCode*/
    ) external override returns (uint256 amountReceived) {
        uint256 targetAmount = _mockExchangeRates.effectiveValue(
            sourceCurrencyKey,
            sourceAmount,
            destinationCurrencyKey
        );

        _coins[sourceCurrencyKey].forceBurn(msg.sender, sourceAmount);
        _coins[destinationCurrencyKey].mint(msg.sender, targetAmount);

        return targetAmount;
    }

    function synths(bytes32 key)
        external
        override
        view
        returns (address synthTokenAddress)
    {
        return address(_coins[key]);
    }

    function settle(bytes32 currencyKey)
        external
        override
        returns (
            uint256 reclaimed,
            uint256 refunded,
            uint256 numEntriesSettled
        )
    {
        _mockSystemStatus.requireSynthActive(currencyKey);

        return (0, 0, 0);
    }
}
