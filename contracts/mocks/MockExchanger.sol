pragma solidity ^0.6.2;

import "../IExchanger.sol";

contract MockExchanger is IExchanger {

    function settle(address /*from*/, bytes32 /*currencyKey*/)
        external
        override
        returns (
            uint256 reclaimed,
            uint256 refunded,
            uint256 numEntriesSettled
        )
    {
        return (0, 0, 0);
    }

    function maxSecsLeftInWaitingPeriod(address /*account*/, bytes32 /*currencyKey*/) public view override returns (uint) {
        return 0;
    }
}
