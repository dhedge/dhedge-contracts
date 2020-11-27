const { deployProxy, admin } = require('@openzeppelin/truffle-upgrades')

const DHedge = artifacts.require("./DHedge.sol");
const DHedgeFactory = artifacts.require('./DHedgeFactory.sol');

const MockExchangeRates = artifacts.require("./mocks/MockExchangeRates.sol");
const MockExchanger = artifacts.require("./mocks/MockExchanger.sol");
const MockSynthetix = artifacts.require("./mocks/MockSynthetix.sol");
const MockSystemStatus = artifacts.require("./mocks/MockSystemStatus.sol");
const MockAddressResolver = artifacts.require("./mocks/MockAddressResolver.sol");

const SusdToken = artifacts.require("./mocks/SusdToken.sol");
const SethToken = artifacts.require("./mocks/SethToken.sol");
const IethToken = artifacts.require("./mocks/IethToken.sol");
const SbtcToken = artifacts.require("./mocks/SbtcToken.sol");
const IbtcToken = artifacts.require("./mocks/IbtcToken.sol");
const SlinkToken = artifacts.require("./mocks/SlinkToken.sol");

const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE');

const MAINNET_ADDRESS_RESOLVER = '0x4E3b31eB0E5CB73641EE1E65E7dCEFe520bA3ef2';
const MAINNET_DAO = '0xB76E40277B79B78dFa954CBEc863D0e4Fd0656ca';
const MAINNET_PROTOCOL_DAO = '0x5a76f841bFe5182f04bf511fC0Ecf88C27189FCB';
const ROPSTEN_ADDRESS_RESOLVER = '0x4da3B8fb742BC69531Ec7AdBAa06effDEd1A22BA';
const KOVAN_ADDRESS_RESOLVER = '0x242a3DF52c375bEe81b1c668741D7c63aF68FDD2';
const TESTNET_DAO = '0xab0c25f17e993F90CaAaec06514A2cc28DEC340b';
const TESTNET_PROTOCOL_DAO = '0x9fa1356dB00939CBB9dCf2e25A02d72b1f0788a8';

async function doDeployWithMocks(deployer, accounts) {
    let admin = accounts[0];
    //let dao = accounts[1];
    let manager = accounts[2];
    let investor = accounts[3];

    let mockExchangeRates = await deployer.deploy(MockExchangeRates);

    let sUsdToken = await deployer.deploy(SusdToken);
    let sEthToken = await deployer.deploy(SethToken);
    let iEthToken = await deployer.deploy(IethToken);
    let sBtcToken = await deployer.deploy(SbtcToken);
    let iBtcToken = await deployer.deploy(IbtcToken);
    let sLinkToken = await deployer.deploy(SlinkToken);

    let mockExchanger = await deployer.deploy(MockExchanger)
    let mockSystemStatus = await deployer.deploy(MockSystemStatus)

    let mockSynthetix = await deployer.deploy(MockSynthetix,
        mockExchangeRates.address, mockSystemStatus.address,
        sUsdToken.address, sEthToken.address, iEthToken.address,
        sBtcToken.address, iBtcToken.address, sLinkToken.address);

    let mockAddressResolver = await deployer.deploy(MockAddressResolver, {from: admin});
    await mockAddressResolver.setAddress("ExchangeRates", mockExchangeRates.address);
    await mockAddressResolver.setAddress("Synthetix", mockSynthetix.address);
    await mockAddressResolver.setAddress("Exchanger", mockExchanger.address);
    await mockAddressResolver.setAddress("SystemStatus", mockSystemStatus.address)

    await sUsdToken.grantRole(MINTER_ROLE, mockSynthetix.address);
    await sEthToken.grantRole(MINTER_ROLE, mockSynthetix.address);
    await iEthToken.grantRole(MINTER_ROLE, mockSynthetix.address);
    await sBtcToken.grantRole(MINTER_ROLE, mockSynthetix.address);
    await iBtcToken.grantRole(MINTER_ROLE, mockSynthetix.address);
    await sLinkToken.grantRole(MINTER_ROLE, mockSynthetix.address);
    
    await sUsdToken.mint(manager, '200000000000000000000000', {from: admin});
    await sUsdToken.mint(investor, '200000000000000000000000', {from: admin});

    let logic = await deployer.deploy(DHedge, {from: admin})

    const options = {
        deployer: deployer,
        initializer: 'initialize',
    }

    let factory = await deployProxy(DHedgeFactory, [mockAddressResolver.address, logic.address, admin], options)

    console.log('Factory', factory.address)
}

async function doDeploy(deployer, accounts, addressResolver, addressDao, addressProtocolDao) {
    let poolLogic = await deployer.deploy(DHedge);

    const options = {
        deployer: deployer,
        initializer: 'initialize'
    }
      
    let factory = await deployProxy(DHedgeFactory, [addressResolver, poolLogic.address, addressDao], options)

    await factory.transferOwnership(addressProtocolDao);

    await admin.transferProxyAdminOwnership(addressProtocolDao, { deployer })
}


module.exports = (deployer, network, accounts) => {
    deployer.then(async () => {
        switch (network) {
            case 'mainnet':
            case 'mainnet-fork':
                await doDeploy(deployer, accounts, MAINNET_ADDRESS_RESOLVER, MAINNET_DAO, MAINNET_PROTOCOL_DAO);
                break;

            case 'ropsten':
            case 'ropsten-fork':
                    await doDeploy(deployer, accounts, ROPSTEN_ADDRESS_RESOLVER, TESTNET_DAO, TESTNET_PROTOCOL_DAO);
                break;

            case 'kovan':
            case 'kovan-fork':
                    await doDeploy(deployer, accounts, KOVAN_ADDRESS_RESOLVER, TESTNET_DAO, TESTNET_PROTOCOL_DAO);
                break;

            default:
                await doDeployWithMocks(deployer, accounts);
        }        
    });
};
