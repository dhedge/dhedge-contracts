const BigNumber = require('bignumber.js')
const { deployProxy, upgradeProxy } = require('@openzeppelin/truffle-upgrades')

const MockExchangeRates = artifacts.require('./mocks/MockExchangeRates.sol')
const MockSynthetix = artifacts.require('./mocks/MockSynthetix.sol')
const MockSystemStatus = artifacts.require('./mocks/MockSystemStatus')

const DHedge = artifacts.require('./DHedge.sol')
const DHedgeFactory = artifacts.require('./DHedgeFactory.sol')
const DHedgeFactoryV2 = artifacts.require('DHedgeFactoryV2')
const DHedgeFactoryV3 = artifacts.require('DHedgeFactoryV3')
const MockAddressResolver = artifacts.require('./mocks/MockAddressResolver.sol')

const SusdToken = artifacts.require('./mocks/SusdToken.sol')
const SethToken = artifacts.require('./mocks/SethToken.sol')
const IethToken = artifacts.require('./mocks/IethToken.sol')
const SbtcToken = artifacts.require('./mocks/SbtcToken.sol')
const IbtcToken = artifacts.require('./mocks/IbtcToken.sol')
const SlinkToken = artifacts.require('./mocks/SlinkToken.sol')

let creator, manager, dao
let sUsdToken, sEthToken, iEthToken, sBtcToken, iBtcToken, sLinkToken
let mockExchangeRates, mockSynthetix, mockAddressResolver, mockSystemStatus
let dhedge, factory
let logic

contract('DHedgeFactory', (accounts) => {
    beforeEach(async () => {
        creator = accounts[0]
        manager = accounts[1]
        dao = accounts[2]

        sUsdToken = await SusdToken.new()
        sEthToken = await SethToken.new()
        iEthToken = await IethToken.new()
        sBtcToken = await SbtcToken.new()
        iBtcToken = await IbtcToken.new()
        sLinkToken = await SlinkToken.new()

        mockExchangeRates = await MockExchangeRates.new()
        mockSystemStatus = await MockSystemStatus.new()

        mockSynthetix = await MockSynthetix.new(
            mockExchangeRates.address,
            mockSystemStatus.address,
            sUsdToken.address,
            sEthToken.address,
            iEthToken.address,
            sBtcToken.address,
            iBtcToken.address,
            sLinkToken.address
        )

        mockAddressResolver = await MockAddressResolver.new()
        await mockAddressResolver.setAddress(
            'ExchangeRates',
            mockExchangeRates.address
        )
        await mockAddressResolver.setAddress('Synthetix', mockSynthetix.address)

        logic = await DHedge.new()

        factory = await deployProxy(DHedgeFactory, [
            mockAddressResolver.address,
            logic.address,
            dao,
        ])
    })

    it('Factory was initialized properly', async () => {
        assert(
            dao === (await factory.getDaoAddress()),
            'dao address should be properly set'
        )

        let fee = await factory.getDaoFee()

        assert('10' === fee['0'].toString(), 'fee numerator should be 10')
        assert('100' === fee['1'].toString(), 'fee denominator should be 100')
    })

    it('Factory can create contracts correctly', async () => {
        assert(
            0 == (await factory.deployedFundsLength.call()),
            'should be empty'
        )

        let tx = await factory.createFund(
            false,
            manager,
            'Barren Wuffet',
            'Test Fund',
            new BigNumber('5000'),
            []
        )

        let fundAddress = tx.logs[1].args.fundAddress
        dhedge = await DHedge.at(fundAddress)

        assert(
            1 == (await factory.deployedFundsLength.call()),
            'should have one'
        )
        assert(
            fundAddress === (await factory.deployedFunds.call(0)),
            'deployed fund address should match'
        )

        assert(false == (await dhedge.privatePool()), 'pool is not private')
        assert(
            'Barren Wuffet' === (await dhedge.managerName()),
            'manager name matches'
        )
        assert(manager === (await dhedge.manager()), 'manager address matches')
        assert('Test Fund' === (await dhedge.name()), 'fund token name matches')
    })

    describe('Upgradability', async () => {
        it('Upgrades correctly to a new implementation with a new method', async () => {
            const upgraded = await upgradeProxy(
                factory.address,
                DHedgeFactoryV2
            )

            assert(
                '42' === (await upgraded.newMethod()).toString(),
                'implementation should include new method'
            )
        })

        it('Upgrades correctly to a new implementation with a redefined method', async () => {
            const upgraded = await upgradeProxy(
                factory.address,
                DHedgeFactoryV3
            )

            assert(
                '1000' ===
                    (await upgraded.getMaximumSupportedAssetCount()).toString(),
                'implementation should include the redefined method'
            )
        })
    })
})
