pragma solidity ^0.6.2;

import "../IExchangeRates.sol";

//0x9D7F70AF5DF5D5CC79780032d47a34615D1F1d77
//WARNING: does not take fees
contract MockExchangeRates is IExchangeRates {
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

    mapping(bytes32 => mapping(bytes32 => uint256)) private _rates;

    constructor() public {
        _rates[_susd][_susd] = 1000000000000000000;

        _rates[_susd][_seth] = 4356689622736694;
        _rates[_seth][_susd] = 229532072879646854400;

        _rates[_susd][_ieth] = 4751317759822683;
        _rates[_ieth][_susd] = 210467927120353145600;

        _rates[_susd][_sbtc] = 110348825771424;
        _rates[_sbtc][_susd] = 9062171645318604291200;

        _rates[_susd][_ibtc] = 82387060582737;
        _rates[_ibtc][_susd] = 12137828354681395708800;

        _rates[_susd][_slink] = 141031059694460590;
        _rates[_slink][_susd] = 10635954968002817292;
        // 10635954968002817292; // x1.5
        // 7090636645335211528; // original
    }

    function effectiveValue(
        bytes32 sourceCurrencyKey,
        uint256 sourceAmount,
        bytes32 destinationCurrencyKey
    ) external override view returns (uint256) {
        return
            (_rates[sourceCurrencyKey][_susd] *
                sourceAmount *
                _rates[_susd][destinationCurrencyKey]) /
            (_rates[_susd][_susd] * _rates[_susd][_susd]);
    }

    function rateForCurrency(bytes32 currencyKey)
        external
        override
        view
        returns (uint256)
    {
        return _rates[currencyKey][_susd];
    }
}
