pragma solidity ^0.6.2;

import "./MockSynth.sol";

contract SlinkToken is MockSynth {
    constructor() public {
        MockSynth.initialize("Synthetic LINK", "sLINK");
    }
}
