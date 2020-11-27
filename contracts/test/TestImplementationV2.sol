pragma solidity ^0.6.2;

contract TestImplementationV2 {
    string private _name;

    function initialize2(string memory name) public {
        _name = name;
    }

    function setName(string calldata name) external {
        _name = string(abi.encodePacked(name, "_SET"));
    }

    function getName() public view returns (string memory) {
        return string(abi.encodePacked(_name, "_MODIFIED"));
    }
}
