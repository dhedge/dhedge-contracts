pragma solidity ^0.6.2;

contract TestImplementationV1 {
    string private _name;

    function initialize2(string memory name) public {
        _name = name;
    }

    function setName(string calldata name) external {
        _name = name;
    }

    function getName() public view returns (string memory) {
        return _name;
    }
}
