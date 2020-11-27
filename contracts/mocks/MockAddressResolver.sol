pragma solidity ^0.6.2;

import "../IAddressResolver.sol";

contract MockAddressResolver is IAddressResolver {
    event AddressAdded(bytes32 key, address target);

    mapping(bytes32 => address) private _resolver;

    function _stringToBytes32(string memory source)
        private
        pure
        returns (bytes32 result)
    {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }
        // solhint-disable-next-line no-inline-assembly
        assembly {
            result := mload(add(source, 32))
        }
    }

    function setAddress(string memory name, address target) public {
        bytes32 _name = _stringToBytes32(name);
        _resolver[_name] = target;
        emit AddressAdded(_name, target);
    }

    function getAddress(bytes32 name) external override view returns (address) {
        return _resolver[name];
    }
}
