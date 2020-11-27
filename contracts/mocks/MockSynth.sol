pragma solidity ^0.6.2;

import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/GSN/Context.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/Initializable.sol";
import "../ISynth.sol";

contract MockSynth is
    ISynth,
    Initializable,
    ContextUpgradeSafe,
    AccessControlUpgradeSafe,
    ERC20BurnableUpgradeSafe
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    function initialize(string memory name, string memory symbol) public {
        __MockSynth_init(name, symbol);
    }

    function __MockSynth_init(string memory name, string memory symbol)
        internal
        initializer
    {
        __Context_init_unchained();
        __AccessControl_init_unchained();
        __ERC20_init_unchained(name, symbol);
        __ERC20Burnable_init_unchained();
        __MockSynth_init_unchained();
    }

    function __MockSynth_init_unchained() internal initializer {
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _setupRole(MINTER_ROLE, _msgSender());
    }

    function mint(address to, uint256 amount) public {
        require(
            hasRole(MINTER_ROLE, _msgSender()),
            "MockSynth: must have minter role to mint"
        );
        _mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20UpgradeSafe) {
        super._beforeTokenTransfer(from, to, amount);
    }

    function forceBurn(address account, uint256 amount) public {
        _burn(account, amount);
    }

    function proxy() external override view returns (address) {
        return address(this);
    }

    function transferAndSettle(address to, uint256 value)
        external
        override
        returns (bool)
    {
        return transfer(to, value);
    }

    function transferFromAndSettle(
        address from,
        address to,
        uint256 value
    ) external override returns (bool) {
        return transferFrom(from, to, value);
    }

    uint256[50] private __gap;
}
