const BigNumber = require('bignumber.js')
const BN = require('bn.js')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const SusdToken = artifacts.require('./mocks/SusdToken.sol')
const SethToken = artifacts.require('./mocks/SethToken.sol')
const IethToken = artifacts.require('./mocks/IethToken.sol')
const SbtcToken = artifacts.require('./mocks/SbtcToken.sol')
const IbtcToken = artifacts.require('./mocks/IbtcToken.sol')
const SlinkToken = artifacts.require('./mocks/SlinkToken.sol')

const MockExchangeRates = artifacts.require('./mocks/MockExchangeRates.sol')
const MockSynthetix = artifacts.require('./mocks/MockSynthetix.sol')
const MockExchanger = artifacts.require('./mocks/MockExchanger.sol')
const MockAddressResolver = artifacts.require('./mocks/MockAddressResolver.sol')
const MockSystemStatus = artifacts.require('./mocks/MockSystemStatus.sol')

const DHedgeFactory = artifacts.require('./DHedgeFactory.sol')
const DHedge = artifacts.require('./DHedge.sol')
const DHedgeV2 = artifacts.require('./test/DHedgeV2.sol')
const DHedgeV3WithExitFees = artifacts.require(
    './test/DHedgeV3WithExitFees.sol'
)

let factory, logic
let creator, manager, user1, user2, proxyAdmin
let sUsdToken, sEthToken, iEthToken, sBtcToken, iBtcToken
let mockExchangeRates,
    mockSynthetix,
    mockExchanger,
    mockSystemStatus,
    mockAddressResolver
let dhedge

const oneToken = new BigNumber('1e+18')
const twoTokens = new BigNumber('2e+18')
const oneHundredTokens = new BigNumber('100e+18')
const fiftyTokens = new BigNumber('50e+18')
const seventyFiveTokens = new BigNumber('75e+18')
const oneHundredFiftyTokens = new BigNumber('150e+18')
const twentyFiveTokens = new BigNumber('25e+18')

const susdKey =
    '0x7355534400000000000000000000000000000000000000000000000000000000'
const sethKey =
    '0x7345544800000000000000000000000000000000000000000000000000000000'
const iethKey =
    '0x6945544800000000000000000000000000000000000000000000000000000000'
const sbtcKey =
    '0x7342544300000000000000000000000000000000000000000000000000000000'
const ibtcKey =
    '0x6942544300000000000000000000000000000000000000000000000000000000'
const slinkKey =
    '0x734c494e4b000000000000000000000000000000000000000000000000000000'

const UNIT = '1000000000000000000'

const MINTER_ROLE = web3.utils.soliditySha3('MINTER_ROLE')

contract('DHedge', (accounts) => {
    beforeEach(async () => {
        proxyAdmin = accounts[0]
        creator = accounts[1]
        user1 = accounts[2]
        user2 = accounts[3]
        manager = accounts[4]
        dao = accounts[5]

        sUsdToken = await SusdToken.new()
        sEthToken = await SethToken.new()
        iEthToken = await IethToken.new()
        sBtcToken = await SbtcToken.new()
        iBtcToken = await IbtcToken.new()
        sLinkToken = await SlinkToken.new()

        mockExchangeRates = await MockExchangeRates.new()
        mockExchanger = await MockExchanger.new()
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
        await mockAddressResolver.setAddress('Exchanger', mockExchanger.address)
        await mockAddressResolver.setAddress(
            'SystemStatus',
            mockSystemStatus.address
        )

        await sUsdToken.grantRole(MINTER_ROLE, mockSynthetix.address)
        await sEthToken.grantRole(MINTER_ROLE, mockSynthetix.address)
        await iEthToken.grantRole(MINTER_ROLE, mockSynthetix.address)
        await sLinkToken.grantRole(MINTER_ROLE, mockSynthetix.address)
        await sBtcToken.grantRole(MINTER_ROLE, mockSynthetix.address)

        await sUsdToken.mint(manager, oneHundredTokens)
        await sUsdToken.mint(user1, oneHundredTokens)
        await sUsdToken.mint(user2, oneHundredTokens)

        logic = await DHedge.new()

        factory = await deployProxy(DHedgeFactory, [
            mockAddressResolver.address,
            logic.address,
            dao,
        ])

        let tx = await factory.createFund(
            false,
            manager,
            'Barren Wuffet',
            'Test Fund',
            new BigNumber('5000'),
            [sethKey]
        )

        dhedge = await DHedge.at(tx.logs[1].args.fundAddress)
    })

    it('Fund metadata and default state is correct', async () => {
        assert(false == (await dhedge.privatePool()), 'pool should be open')
        assert(
            'Barren Wuffet' === (await dhedge.managerName.call()),
            'manager name matches'
        )
        assert(
            manager === (await dhedge.manager.call()),
            'manager address matches'
        )
        assert(
            'Test Fund' === (await dhedge.name.call()),
            'fund token name matches'
        )
        assert(
            factory.address === (await dhedge.factory()),
            'factory address should be propagated correctly'
        )

        //default assets are supported
        assert(
            await dhedge.isAssetSupported.call(susdKey),
            'susd should be supported'
        )
        assert(
            await dhedge.isAssetSupported.call(sethKey),
            'seth should be supported'
        )
        // assert(await dhedge.isAssetSupported.call(sbtcKey), "sbtc should be supported");
        // assert(await dhedge.isAssetSupported.call(iethKey), "ieth should be supported");
        // assert(await dhedge.isAssetSupported.call(ibtcKey), "ibtc should be supported");
        assert(
            !(await dhedge.isAssetSupported.call(slinkKey)),
            'slink should be NOT supported'
        )

        assert(
            (await dhedge.numberOfSupportedAssets.call()) == 2,
            'no of supported assets mismatch'
        )
    })

    it('MockExchangeRate works fine with small rounding errors', async () => {
        assert(
            '229532072879646854400' ===
                (
                    await mockExchangeRates.effectiveValue.call(
                        sethKey,
                        oneToken,
                        susdKey
                    )
                ).toString(),
            'susd->seth'
        )
        assert(
            UNIT ===
                (
                    await mockExchangeRates.effectiveValue.call(
                        susdKey,
                        oneToken,
                        susdKey
                    )
                ).toString(),
            'susd->susd'
        )

        let sethToSeth = new BigNumber(
            await mockExchangeRates.effectiveValue.call(
                sethKey,
                oneToken,
                sethKey
            )
        )
        assert('1000000000000000006' === sethToSeth.toFixed(), 'seth->seth')

        let there = await mockExchangeRates.effectiveValue.call(
            sethKey,
            oneToken,
            iethKey
        )
        let back = new BigNumber(
            await mockExchangeRates.effectiveValue.call(iethKey, there, sethKey)
        )
        assert('1000000000000000022' === back.toFixed(), 'seth->ieth->seth')
    })

    it('MockSynthetix exchange burns source amount of tokens and mints target amount', async () => {
        assert(
            new BigNumber(await sUsdToken.balanceOf.call(user1)).toFixed() !=
                '0',
            'non-zero susd balance'
        )
        assert(
            new BigNumber(await sEthToken.balanceOf.call(user1)).toFixed() ==
                '0',
            'zero seth balance'
        )

        await mockSynthetix.exchange(susdKey, oneHundredTokens, sethKey, {
            from: user1,
        })

        assert(
            new BigNumber(await sUsdToken.balanceOf.call(user1)).toFixed() ==
                '0',
            'zero susd balance'
        )
        assert(
            new BigNumber(await sEthToken.balanceOf.call(user1)).toFixed() !=
                '0',
            'non-zero seth balance'
        )
    })

    it('DHedge total balance after exchanges is correct', async () => {
        await factory.setExitFee(new BN('0'), new BN('1'), { from: proxyAdmin })
        await dhedge.addToSupportedAssets(iethKey, { from: manager })

        assert(
            '0' === (await dhedge.totalFundValue.call()).toString(),
            'initially fund should be empty'
        )

        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })
        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user1 })

        //fund should have the deposit
        assert(
            oneHundredTokens.toString() ===
                (await dhedge.totalFundValue.call()).toString(),
            'should have funds'
        )

        assert(
            new BigNumber(
                await sUsdToken.balanceOf.call(dhedge.address)
            ).toFixed() != '0',
            'non-zero susd balance before'
        )
        assert(
            new BigNumber(
                await sEthToken.balanceOf.call(dhedge.address)
            ).toFixed() == '0',
            'zero seth balance before'
        )

        //now if we exchange all susd into seth
        await dhedge.exchange(susdKey, oneHundredTokens, sethKey, {
            from: manager,
        })

        assert(
            new BigNumber(
                await sUsdToken.balanceOf.call(dhedge.address)
            ).toFixed() == '0',
            'zero susd balance after'
        )
        let sethTokenAmount = await sEthToken.balanceOf.call(dhedge.address)
        assert(
            new BigNumber(sethTokenAmount).toFixed() != '0',
            'non-zero seth balance after'
        )

        //the total balance should stay the same (as we dont have fees)
        assert(
            '100000000000000000648' ===
                (await dhedge.totalFundValue.call()).toString(),
            'should have funds (in eth)'
        )

        //now lets exchange back into susd
        await dhedge.exchange(sethKey, sethTokenAmount, susdKey, {
            from: manager,
        })
        assert(
            '100000000000000000648' ===
                (await dhedge.totalFundValue.call()).toString(),
            'should have funds (in susd again)'
        )

        //and half into ieth
        await dhedge.exchange(susdKey, fiftyTokens, iethKey, { from: manager })
        assert(
            '100000000000000001484' ===
                (await dhedge.totalFundValue.call()).toString(),
            'should have funds mixed'
        )
    })

    //have three users add funds in different proportions
    //make some exchanges
    //check their balances
    //withdraw some by some users
    //check balances still correct/%

    //add tests for adding and removing supporting assets
    //what happens if removing supported asset which is already in the contract?

    it('DHedge simple deposit and withdrawal work ok', async () => {
        await factory.setExitFee(new BN('0'), new BN('1'), { from: proxyAdmin })

        assert(
            '0' === (await dhedge.totalFundValue.call()).toString(),
            'initially fund should be empty'
        )

        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })
        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user1 })

        //fund should have the deposit
        assert(
            oneHundredTokens.toString() ===
                (await dhedge.totalFundValue.call()).toString(),
            'should have susd funds'
        )

        //user should have the fund fund tokens
        let pTokens = await dhedge.balanceOf.call(user1)

        assert(
            oneHundredTokens.toString() === pTokens.toString(),
            'should have fund tokens'
        )

        await dhedge.withdraw(fiftyTokens, { from: user1 })
        assert(
            fiftyTokens.toString() ===
                (await dhedge.balanceOf.call(user1)).toString(),
            'user fund tokens should be empty'
        )
        assert(
            fiftyTokens.toString() ===
                (await dhedge.totalFundValue.call()).toString(),
            'after withdrawal fund should be empty'
        )
        assert(
            fiftyTokens.toString() ===
                (await sUsdToken.balanceOf.call(user1)).toString(),
            'should have funds again'
        )

        await dhedge.withdraw(fiftyTokens, { from: user1 })

        assert(
            '0' === (await dhedge.balanceOf.call(user1)).toString(),
            'user fund tokens should be empty'
        )
        assert(
            '0' === (await dhedge.totalFundValue.call()).toString(),
            'after withdrawal fund should be empty'
        )
        assert(
            oneHundredTokens.toString() ===
                (await sUsdToken.balanceOf.call(user1)).toString(),
            'should have funds again'
        )
    })

    it('DHedge mixed withdrawal works ok', async () => {
        await factory.setExitFee(new BN('0'), new BN('1'), { from: proxyAdmin })

        assert(
            '0' === (await dhedge.totalFundValue.call()).toString(),
            'initially fund should be empty'
        )

        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })
        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user1 })

        //fund should have the deposit
        assert(
            oneHundredTokens.toString() ===
                (await dhedge.totalFundValue.call()).toString(),
            'should have susd funds'
        )

        //user should have the fund fund tokens
        let pTokens = await dhedge.balanceOf.call(user1)
        assert(
            oneHundredTokens.toString() === pTokens.toString(),
            'should have fund tokens'
        )

        //exchange half into ether
        await dhedge.exchange(susdKey, fiftyTokens, sethKey, { from: manager })

        await dhedge.withdraw(fiftyTokens, { from: user1 })

        assert(
            '135' === (await dhedge.balanceOf.call(manager)).toString(),
            'manager fee should have been minted to the manager'
        )
        assert(
            '15' === (await dhedge.balanceOf.call(dao)).toString(),
            'manager fee should have been minted to the dao'
        )

        assert(
            fiftyTokens.toString() ===
                (await dhedge.balanceOf.call(user1)).toString(),
            'user fund tokens should match'
        )
        assert(
            '50000000000000000441' ===
                (await dhedge.totalFundValue.call()).toString(),
            'after withdrawal fund should match'
        )

        assert(
            '24999999999999999950' ===
                (await sUsdToken.balanceOf.call(user1)).toString(),
            'user should have susd again'
        )
        assert(
            '108917240568417349' ===
                (await sEthToken.balanceOf.call(user1)).toString(),
            'user should have seth again'
        )

        //and empty the contract
        await dhedge.withdraw(fiftyTokens, { from: user1 })

        assert(
            '0' === (await dhedge.balanceOf.call(user1)).toString(),
            'user fund tokens should be empty'
        )

        assert(
            '305' === (await dhedge.totalFundValue.call()).toString(),
            'after withdrawal fund should be empty'
        )
        assert(
            '49999999999999999924' ===
                (await sUsdToken.balanceOf.call(user1)).toString(),
            'user should have susd again'
        )
        assert(
            '217834481136834699' ===
                (await sEthToken.balanceOf.call(user1)).toString(),
            'user should have seth again'
        )
        assert(
            '305' === (await dhedge.totalFundValue.call()).toString(),
            'after withdrawal fund should be empty'
        )
    })

    it('Withdrawal and forefit of suspended assets work ok', async () => {
        await factory.setExitFee(new BN('0'), new BN('1'), { from: proxyAdmin })
        await dhedge.addToSupportedAssets(sbtcKey, { from: manager })

        assert(
            '0' === (await dhedge.totalFundValue.call()).toString(),
            'initially fund should be empty'
        )

        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })

        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user1 })

        // exchange half into suspended sBTC
        await dhedge.exchange(susdKey, fiftyTokens, sbtcKey, { from: manager })

        // exchange the other half in to sETH
        await dhedge.exchange(susdKey, fiftyTokens, sethKey, { from: manager })

        assert(
            '0' === (await sUsdToken.balanceOf(dhedge.address)).toString(),
            "pool shouldn't have sUSD"
        )
        assert(
            '217834481136834700' ===
                (await sEthToken.balanceOf(dhedge.address)).toString(),
            'pool should have 50sUSD worth of sETH'
        )
        assert(
            '5517441288571200' ===
                (await sBtcToken.balanceOf(dhedge.address)).toString(),
            'pool should have 50sUSD worth of sBTC'
        )
        assert(
            '100000000000000071998' ===
                (await dhedge.totalFundValue()).toString(),
            'total fund value should be correct'
        )

        await dhedge.forfeitSuspendedSynthsAndWithdraw(oneHundredTokens, {
            from: user1,
        })

        assert(
            '35950' === (await dhedge.totalSupply()).toString(),
            'the manager fee represents the total supply'
        )
        assert(
            '32355' === (await dhedge.balanceOf(manager)).toString(),
            'manager should have the manager fee'
        )
        assert(
            '3595' === (await dhedge.balanceOf(dao)).toString(),
            'dao should have a part of the manager fee'
        )
        assert(
            '217834481136834621' ===
                (await sEthToken.balanceOf(user1)).toString(),
            'user should receive all eth reduced by the minted manger fee'
        )
        assert(
            '0' === (await sBtcToken.balanceOf(user1)).toString(),
            'user should not receive the suspended asset'
        )
        assert(
            '5517441288571200' ===
                (await sBtcToken.balanceOf(dhedge.address)).toString(),
            'pool remains with 50sUSD worth of sBTC'
        )
        assert(
            '79' === (await sEthToken.balanceOf(dhedge.address)).toString(),
            'pool remains with sETH proportional to the minted manager fee'
        )
    })

    it('Withdrawal and not forefit of suspended assets should fail', async () => {
        await factory.setExitFee(new BN('0'), new BN('1'), { from: proxyAdmin })
        await dhedge.addToSupportedAssets(sbtcKey, { from: manager })

        assert(
            '0' === (await dhedge.totalFundValue.call()).toString(),
            'initially fund should be empty'
        )

        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })

        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user1 })

        // exchange half into suspended sBTC
        await dhedge.exchange(susdKey, fiftyTokens, sbtcKey, { from: manager })

        // exchange the other half in to sETH
        await dhedge.exchange(susdKey, fiftyTokens, sethKey, { from: manager })

        assert(
            '0' === (await sUsdToken.balanceOf(dhedge.address)).toString(),
            "pool shouldn't have sUSD"
        )
        assert(
            '217834481136834700' ===
                (await sEthToken.balanceOf(dhedge.address)).toString(),
            'pool should have 50sUSD worth of sETH'
        )
        assert(
            '5517441288571200' ===
                (await sBtcToken.balanceOf(dhedge.address)).toString(),
            'pool should have 50sUSD worth of sBTC'
        )
        assert(
            '100000000000000071998' ===
                (await dhedge.totalFundValue()).toString(),
            'total fund value should be correct'
        )

        try {
            await dhedge.withdraw(oneHundredTokens, { from: user1 })

            assert(
                false,
                'withdrawing with a suspended asset balance should fail'
            )
        } catch (error) {
            assert(
                'Synth is suspended. Operation prohibited' === error.reason,
                'different error expected'
            )
        }
    })

    it('Deposit proportions work ok', async () => {
        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })
        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user1 })

        //enable deposits for second user
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user2,
        })
        //then deposit
        await dhedge.deposit(oneHundredTokens, { from: user2 })

        let pTokens1 = await dhedge.balanceOf.call(user1)
        let pTokens2 = await dhedge.balanceOf.call(user2)

        assert(
            pTokens1.eq(pTokens2),
            'users should have the same token proportions'
        )
    })

    it('Small investments work ok', async () => {
        //enable deposits
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })

        //then deposit
        await dhedge.deposit(oneToken.times(5), { from: user1 })

        //enable deposits
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user2,
        })

        //then deposit
        await dhedge.deposit(oneToken.times(5), { from: user2 })

        assert(
            new BigNumber('10e+18').toString() ===
                (await dhedge.totalFundValue.call()).toString(),
            'total fund value should be 10 usd'
        )

        // exchange susd to 1 wei
        await dhedge.exchange(susdKey, new BigNumber('230'), sethKey, {
            from: manager,
        })

        assert(
            '1' === (await sEthToken.balanceOf.call(dhedge.address)).toString(),
            'pool should have 1 wei'
        )

        // withdraw 50%
        await dhedge.withdraw(oneToken.times(5), { from: user1 })

        assert(
            '1' === (await sEthToken.balanceOf.call(dhedge.address)).toString(),
            'pool should have 1 wei'
        )
        assert(
            '0' === (await sEthToken.balanceOf.call(user1)).toString(),
            'user1 should have 0 wei'
        )
    })

    it('Exit fees work correctly', async () => {
        let tx = await factory.createFund(
            false,
            manager,
            'Barren Wuffet',
            'Test Fund',
            new BigNumber('5000'),
            []
        )

        dhedge = await DHedge.at(tx.logs[1].args.fundAddress)

        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })

        await dhedge.deposit(oneHundredTokens, { from: user1 })
        assert(
            '100000000000000000000' ===
                (await sUsdToken.balanceOf.call(dhedge.address)).toString(),
            'fund should have 100 susd'
        )
        assert(
            '100000000000000000000' ===
                (await dhedge.balanceOf.call(user1)).toString(),
            'user will have 100 pool tokens'
        )

        await dhedge.withdraw(oneHundredTokens, { from: user1 })

        assert(
            '99500000000000000000' ===
                (await sUsdToken.balanceOf.call(user1)).toString(),
            'user will be charged the exit fee and receive 99.5 sUSD'
        )
        assert(
            '0' === (await dhedge.balanceOf.call(user1)).toString(),
            'user will not have any pool tokens'
        )
        assert(
            '500000000000000000' ===
                (await dhedge.balanceOf.call(dao)).toString(),
            'dao should have received 0.5% of withdrawn pool tokens'
        )
    })

    it('Exit fees after cooldown work correctly', async () => {
        let tx = await factory.createFund(
            false,
            manager,
            'Barren Wuffet',
            'Test Fund',
            new BigNumber('5000'),
            []
        )

        await factory.setExitFeeCooldown(4, { from: proxyAdmin }) // 4 second cooldown

        dhedge = await DHedge.at(tx.logs[1].args.fundAddress)

        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })

        await dhedge.deposit(oneHundredTokens, { from: user1 })

        assert(
            '100000000000000000000' ===
                (await sUsdToken.balanceOf.call(dhedge.address)).toString(),
            'fund should have 100 susd'
        )
        assert(
            '100000000000000000000' ===
                (await dhedge.balanceOf.call(user1)).toString(),
            'user will have 100 pool tokens'
        )

        //before cooldown

        try {
            await dhedge.transfer(user2, oneHundredTokens, { from: user1 })
            assert(false, 'transferring should fail')
        } catch (error) {
            assert(
                'cooldown active' === error.reason,
                '"cooldown active" expected, but was "' + error.message + '"'
            )
        }

        //move forward past cooldown
        await timeout(5000)

        await dhedge.withdraw(oneHundredTokens, { from: user1 })

        assert(
            '100000000000000000000' ===
                (await sUsdToken.balanceOf.call(user1)).toString(),
            'user will not be charged the exit fee and receive 100 sUSD'
        )
        assert(
            '0' === (await dhedge.balanceOf.call(user1)).toString(),
            'user will not have any pool tokens'
        )
        assert(
            '0' === (await dhedge.balanceOf.call(dao)).toString(),
            "dao should't have received any exit fee pool tokens"
        )
    })

    it('Private pool works as expected', async () => {
        let tx = await factory.createFund(
            true,
            manager,
            'Barren Wuffet',
            'Test Fund',
            new BigNumber('5000'),
            []
        )
        dhedge = await DHedge.at(tx.logs[1].args.fundAddress)

        assert(await dhedge.privatePool(), 'pool should be private')

        //manager can deposit
        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: manager,
        })
        //then deposit
        await dhedge.deposit(fiftyTokens, { from: manager })

        //others can't
        //enable deposits first
        await sUsdToken.approve(dhedge.address, oneHundredTokens, {
            from: user1,
        })
        //then try deposit
        try {
            await dhedge.deposit(fiftyTokens, { from: user1 })
            assert(false, 'deposit should fail')
        } catch (error) {
            assert(
                'only members allowed' === error.reason,
                'different error expected'
            )
        }

        //manager can switch to open, others can deposit
        await dhedge.setPoolPrivate(false, { from: manager })

        //now deposit works
        await dhedge.deposit(fiftyTokens, { from: user1 })

        //manager can switch to private, no-one else can deposit
        await dhedge.setPoolPrivate(true, { from: manager })

        //user deposit will fail again
        try {
            await dhedge.deposit(fiftyTokens, { from: user1 })
            assert(false, 'deposit should fail')
        } catch (error) {
            assert(
                'only members allowed' === error.reason,
                'different error expected'
            )
        }

        //but if already in, can withdraw even if private
        await dhedge.withdraw(fiftyTokens, { from: user1 })

        // --------- Members whitelisting ---------

        //whitelist one user
        await dhedge.addMembers([user1], { from: manager })

        //now deposit works again
        await dhedge.deposit(fiftyTokens, { from: user1 })

        //remove from whitelist
        await dhedge.removeMembers([user1], { from: manager })

        //user deposit will fail again
        try {
            await dhedge.deposit(fiftyTokens, { from: user1 })
            assert(false, 'deposit should fail')
        } catch (error) {
            assert(
                'only members allowed' === error.reason,
                'different error expected'
            )
        }

        //but if already in, can withdraw even if private
        await dhedge.withdraw(fiftyTokens, { from: user1 })
    })

    describe('Members', () => {
        it('Adding and removing a single member keeps the map up to date', async () => {
            assert(
                '0' === (await dhedge.numberOfMembers()).toString(),
                'should be initialized with no members'
            )

            await dhedge.addMember(accounts[0], { from: manager })

            assert(
                '1' === (await dhedge.numberOfMembers()).toString(),
                'should be initialized with no members'
            )
            assert(
                (await dhedge.isMemberAllowed(accounts[0])) === true,
                'member should be allowed'
            )

            await dhedge.removeMember(accounts[0], { from: manager })

            assert(
                (await dhedge.isMemberAllowed(accounts[0])) === false,
                'member should not be allowed'
            )
            assert(
                '0' === (await dhedge.numberOfMembers()).toString(),
                'should be initialized with no members'
            )
        })

        it('Adding members works correctly', async () => {
            assert(
                '0' === (await dhedge.numberOfMembers()).toString(),
                'should be initialized with no members'
            )

            await dhedge.addMember(accounts[0], { from: manager })

            assert(
                (await dhedge.isMemberAllowed(accounts[0])) === true,
                'member should be allowed'
            )

            await dhedge.addMembers([accounts[0], accounts[1], accounts[2]], {
                from: manager,
            })

            assert(
                '3' === (await dhedge.numberOfMembers()).toString(),
                'members should update'
            )
            assert(
                (await dhedge.isMemberAllowed(accounts[0])) === true,
                'member should be allowed'
            )
            assert(
                (await dhedge.isMemberAllowed(accounts[1])) === true,
                'member should be allowed'
            )
            assert(
                (await dhedge.isMemberAllowed(accounts[2])) === true,
                'member should be allowed'
            )
        })

        it('Removing members works correctly', async () => {
            assert(
                '0' === (await dhedge.numberOfMembers()).toString(),
                'should be initialized with no members'
            )

            await dhedge.removeMember(accounts[0], { from: manager })

            assert(
                '0' === (await dhedge.numberOfMembers()).toString(),
                'removing a non-member should execute correctly'
            )

            await dhedge.addMembers([accounts[0], accounts[1], accounts[2]], {
                from: manager,
            })

            assert(
                '3' === (await dhedge.numberOfMembers()).toString(),
                'should be initialized with no members'
            )

            await dhedge.removeMembers(
                [accounts[0], accounts[1], accounts[2], accounts[3]],
                { from: manager }
            )

            assert(
                '0' === (await dhedge.numberOfMembers()).toString(),
                'all members should be removed'
            )
        })
    })

    describe('Assets', () => {
        it('Adding a new asset increases the number of assets and removing decreases', async () => {
            let previousAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )

            let tx = await dhedge.addToSupportedAssets(slinkKey, {
                from: manager,
            })

            assert(
                tx.logs.length === 1 &&
                    tx.logs[0].event === 'AssetAdded' &&
                    tx.logs[0].args.fundAddress === dhedge.address &&
                    tx.logs[0].args.manager === manager &&
                    tx.logs[0].args.assetKey === slinkKey,
                'Asset addition should emit the apropriate event'
            )

            let newAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )

            assert(
                previousAssetCount.plus(1).isEqualTo(newAssetCount),
                'invalid asset count'
            )

            tx = await dhedge.removeFromSupportedAssets(slinkKey, {
                from: manager,
            })

            assert(
                tx.logs.length === 1 &&
                    tx.logs[0].event === 'AssetRemoved' &&
                    tx.logs[0].args.fundAddress === dhedge.address &&
                    tx.logs[0].args.manager === manager &&
                    tx.logs[0].args.assetKey === slinkKey,
                'Asset removal should emit the apropriate event'
            )

            let evenNewerAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )

            assert(
                newAssetCount.minus(1).isEqualTo(evenNewerAssetCount),
                'invalid asset count'
            )
        })

        it("Adding an existing asset doesn't change the number of assets", async () => {
            let previousAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )

            try {
                await dhedge.addToSupportedAssets(sethKey, { from: manager })
                assert(false, 'asset addition should fail')
            } catch (error) {
                assert(
                    'asset already supported' === error.reason,
                    'different error expected'
                )
            }

            let newAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )

            assert(
                previousAssetCount.isEqualTo(newAssetCount),
                'invalid asset count'
            )
        })

        it("Removing non supported asset doesn't change the number of assets", async () => {
            let previousAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )
            try {
                await dhedge.removeFromSupportedAssets(slinkKey, {
                    from: manager,
                })
                assert(false, 'asset removal should fail')
            } catch (error) {
                assert(
                    'asset not supported' === error.reason,
                    'different error expected'
                )
            }

            let newAssetCount = new BigNumber(
                await dhedge.numberOfSupportedAssets.call()
            )

            assert(
                previousAssetCount.isEqualTo(newAssetCount),
                'invalid asset count'
            )
        })

        it("Asset with balance can't be removed", async () => {
            // a) if the asset's pool balance is 0 - can be removed
            // b) otherwise - doesn't work, as it would lock investor funds

            //enable deposits first
            await sUsdToken.approve(dhedge.address, oneHundredTokens, {
                from: user1,
            })

            //then deposit
            await dhedge.deposit(oneHundredTokens, { from: user1 })

            //now if we exchange all susd into seth
            await dhedge.exchange(susdKey, oneHundredTokens, sethKey, {
                from: manager,
            })

            assert(
                new BigNumber(
                    await sUsdToken.balanceOf.call(dhedge.address)
                ).toFixed() == '0',
                'zero susd balance after'
            )

            let sethTokenAmount = await sEthToken.balanceOf.call(dhedge.address)

            assert(
                new BigNumber(sethTokenAmount).toFixed() != '0',
                'non-zero seth balance after'
            )

            try {
                // try to remove sETH
                await dhedge.removeFromSupportedAssets(sethKey, {
                    from: manager,
                })
                assert(false, 'asset with balance removal should fail')
            } catch (error) {
                assert(
                    'non-empty asset cannot be removed' === error.reason,
                    'different error expected'
                )
            }
        })

        it("Non-Synth assets can't be added", async () => {
            try {
                // try to add ASDF
                let ASDFKey =
                    '0x4153444600000000000000000000000000000000000000000000000000000000'
                await dhedge.addToSupportedAssets(ASDFKey, { from: manager })
                assert(false, 'Non synth asset addition should fail')
            } catch (error) {
                assert(
                    'not an asset' === error.reason,
                    'different error expected'
                )
            }
        })

        it("Persistent asset can't be removed", async () => {
            try {
                // try to remove sUSD
                await dhedge.removeFromSupportedAssets(susdKey, {
                    from: manager,
                })
                assert(false, 'persistent asset removal should fail')
            } catch (error) {
                assert(
                    "persistent assets can't be removed" === error.reason,
                    'different error expected'
                )
            }
        })

        it("Assets can't be added over the maximum asset limit", async () => {
            // After creation, a default test pool has 2 assets
            await factory.setMaximumSupportedAssetCount(new BN('2'), {
                from: proxyAdmin,
            })

            try {
                // try to add another asset
                await dhedge.addToSupportedAssets(susdKey, { from: manager })
                assert(
                    false,
                    'adding over the maximum supported asset count should fail'
                )
            } catch (error) {
                assert(
                    'maximum assets reached' === error.reason,
                    'different error expected'
                )
            }
        })

        it('Getting suspended assets works correctly', async () => {
            await dhedge.addToSupportedAssets(sbtcKey, { from: manager })

            let assets = await dhedge.getSuspendedAssets()
            let suspended = {}

            for (let i = 0; i < assets['0'].length; i++) {
                let asset = web3.utils.hexToUtf8(assets['0'][i])

                suspended[asset] = assets['1'][i]
            }

            assert(suspended['sUSD'] === false, "sETH shouldn't be suspended")
            assert(suspended['sETH'] === false, "sETH shouldn't be suspended")
            assert(suspended['sBTC'] === true, 'sBTC should be suspended')
        })
    })

    describe('Pool fees', () => {
        it('Should initialize the pool fees correctly', async () => {
            // create a fund with 10.00% manager fee and 0.3% exit fee
            let tx = await factory.createFund(
                false,
                manager,
                'Barren Wuffet',
                'Test Fund',
                new BigNumber('1000'),
                []
            )

            dhedge = await DHedge.at(tx.logs[1].args.fundAddress)

            let exitFee = await dhedge.getExitFee.call()

            assert(exitFee[0].toString() === '5')
            assert(exitFee[1].toString() === '1000')

            let managerFee = await dhedge.getManagerFee.call()

            assert(managerFee[0].toString() === '1000')
            assert(managerFee[1].toString() === '10000')

            try {
                // create a fund with 150.00% manager fee
                await factory.createFund(
                    false,
                    manager,
                    'Barren Wuffet',
                    'Test Fund',
                    new BigNumber('15000')
                )

                assert(false, 'too big fee pool creation should fail')
            } catch (error) {
                assert(true, 'different error expected')
            }

            try {
                // create a fund with 150.00% exit fee
                await factory.createFund(
                    false,
                    manager,
                    'Barren Wuffet',
                    'Test Fund',
                    new BigNumber('10000'),
                    new BigNumber('15000')
                )

                assert(false, 'too big fee pool creation should fail')
            } catch (error) {
                assert(true, 'different error expected')
            }
        })

        it('Pool fee percentage variables initialize and function correctly', async () => {
            let managerFee = await dhedge.getManagerFee.call()

            assert(
                managerFee[0].toString() === '5000',
                'Invalid manager fee numerator'
            )
            assert(
                managerFee[1].toString() === '10000',
                'Invalid manager fee denominator'
            )

            let exitFee = await dhedge.getExitFee.call()

            assert(exitFee[0].toString() === '5', 'Invalid exit fee numerator')
            assert(
                exitFee[1].toString() === '1000',
                'Invalid exit fee denominator'
            )

            // set fee to 45.00%
            await dhedge.setManagerFeeNumerator(new BigNumber('4500'), {
                from: manager,
            })

            managerFee = await dhedge.getManagerFee.call()

            assert(
                managerFee[0].toString() === '4500',
                'Invalid manager fee numerator'
            )
            assert(
                managerFee[1].toString() === '10000',
                'Invalid manager fee denominator'
            )

            try {
                // try to set fee to 150.00%
                await dhedge.setManagerFeeNumerator(new BigNumber('15000'), {
                    from: manager,
                })
                assert(false, 'big numerator set should fail')
            } catch (error) {
                assert(
                    'manager fee too high' === error.reason,
                    'different error expected'
                )
            }

            try {
                // try to set fee to 65.00%
                await dhedge.setManagerFeeNumerator(new BigNumber('6500'), {
                    from: manager,
                })
                assert(false, 'big numerator set should fail')
            } catch (error) {
                assert(
                    'manager fee too high' === error.reason,
                    'different error expected'
                )
            }
        })

        it('Basic manager fee flow', async () => {
            //enable deposits first
            await sUsdToken.approve(dhedge.address, oneHundredTokens, {
                from: user1,
            })

            //add sLINK
            await dhedge.addToSupportedAssets(slinkKey, { from: manager })

            // set fee to 10.00%
            await dhedge.setManagerFeeNumerator(new BigNumber('1000'), {
                from: manager,
            })

            //then deposit
            await dhedge.deposit(fiftyTokens, { from: user1 })
                        
            assert(
                oneToken.toString() === (await dhedge.tokenPriceAtLastFeeMint.call()).toString(),
                'last price that manager fee was minted'
            )

            //fund should have the deposit
            assert(
                fiftyTokens.toString() ===
                    (await dhedge.totalFundValue.call()).toString(),
                'should have funds'
            )

            //now if we exchange all susd into sLINK with a 1.5 exchange rate
            await dhedge.exchange(susdKey, twentyFiveTokens, slinkKey, {
                from: manager,
            })

            assert(
                '62499999999999999999' ===
                    (await dhedge.totalFundValue.call()).toString(),
                'should equal 62.5'
            )
            assert(
                fiftyTokens.toString() ===
                    (await dhedge.balanceOf.call(user1)).toString(),
                'user1 should have 50 fund tokens'
            )
            assert(
                '0' === (await dhedge.balanceOf.call(manager)).toString(),
                'manager should have 0 fund tokens'
            )

            assert(
                '1249999999999999995' ===
                    (await dhedge.availableManagerFee.call()).toString(),
                'available manager fee should be 1.25'
            )

            // mint manager fee
            await dhedge.mintManagerFee({ from: manager })

            assert(
                fiftyTokens.toString() ===
                    (await dhedge.balanceOf.call(user1)).toString(),
                'user1 should have 50 fund tokens'
            )

            assert(
                '1124999999999999996' ===
                    (await dhedge.balanceOf.call(manager)).toString(),
                'manager should have 1.125 fund tokens'
            )
            assert(
                '124999999999999999' ===
                    (await dhedge.balanceOf.call(dao)).toString(),
                'dao should have 0.125 fund tokens'
            )
            assert(
                '0' === (await dhedge.availableManagerFee.call()).toString(),
                'available manager fee should be 0'
            )

            // mint manager fee
            await dhedge.mintManagerFee({ from: manager })

            assert(
                '1249999999999999999' === (await dhedge.tokenPriceAtLastFeeMint.call()).toString(),
                'last price that manager fee was minted'
            )            
            assert(
                '1124999999999999996' ===
                    (await dhedge.balanceOf.call(manager)).toString(),
                'manager should have 1.125 fund tokens'
            )
    
            assert(
                '51249999999999999995' ===
                    (await dhedge.totalSupply.call()).toString(),
                'total supply should be 51.25'
            )

            //again exchange 25 sUSD to sLINK with a 1.5 exchange rate
            await dhedge.exchange(susdKey, twentyFiveTokens, slinkKey, {
                from: manager,
            })

            assert(
                '74999999999999999998' ===
                    (await dhedge.totalFundValue.call()).toString(),
                'should equal 75'
            )
            assert(
                '1093750000000000002' ===
                    (await dhedge.availableManagerFee.call()).toString(),
                'available manager fee should be 1.09375'
            )

            // mint manager fee
            await dhedge.mintManagerFee({ from: manager })

            assert(
                '1463414634146341463' === (await dhedge.tokenPriceAtLastFeeMint.call()).toString(),
                'last price that manager fee was minted'
            )    
            assert(
                '2109374999999999998' ===
                    (await dhedge.balanceOf.call(manager)).toString(),
                'manager should have 2.1093749 fund tokens'
            )
            assert(
                '234374999999999999' ===
                    (await dhedge.balanceOf.call(dao)).toString(),
                'dao should have 0.234375 fund tokens'
            )
            assert(
                '0' === (await dhedge.availableManagerFee.call()).toString(),
                'available manager fee should be 0'
            )

        })
    })

    describe('Upgradability', () => {
        it('Should upgrade all instances', async () => {
            let tx1 = await factory.createFund(
                false,
                manager,
                'Barren Wuffet',
                'Test Fund',
                new BigNumber('5000'),
                []
            )
            let instance1 = await DHedge.at(tx1.logs[1].args.fundAddress)

            let tx2 = await factory.createFund(
                false,
                manager,
                'Barren Wuffet',
                'Test Fund',
                new BigNumber('5000'),
                []
            )
            let instance2 = await DHedge.at(tx2.logs[1].args.fundAddress)

            assert(
                '0' === (await instance1.totalFundValue.call()).toString(),
                'initially fund should be empty'
            )
            assert(
                '0' === (await instance2.totalFundValue.call()).toString(),
                'initially fund should be empty'
            )

            // mint additional tokens
            await sUsdToken.mint(user1, oneHundredTokens)

            //enable deposits first
            await sUsdToken.approve(instance1.address, oneHundredTokens, {
                from: user1,
            })

            await sUsdToken.approve(instance2.address, oneHundredTokens, {
                from: user1,
            })

            //then deposit
            await instance1.deposit(oneHundredTokens, { from: user1 })

            await instance2.deposit(oneHundredTokens.dividedBy(2), {
                from: user1,
            })

            //fund should have the initial deposit
            assert(
                oneHundredTokens.toFixed() ===
                    (await instance1.totalFundValue.call()).toString(),
                'should have funds'
            )
            assert(
                oneHundredTokens.dividedBy(2).toFixed() ===
                    (await instance2.totalFundValue.call()).toString(),
                'should have funds'
            )

            let newLogic = await DHedgeV2.new()

            // Update logic to V2 address
            await factory.setLogic(newLogic.address, { from: proxyAdmin })

            //fund should have the initial deposit calculated by the V2 contract (mul s10)
            assert(
                oneHundredTokens.times(10).toFixed() ===
                    (await instance1.totalFundValue.call()).toString(),
                'should have funds'
            )
            assert(
                oneHundredTokens.dividedBy(2).times(10).toFixed() ===
                    (await instance2.totalFundValue.call()).toString(),
                'should have funds'
            )
        })

        it('Should correctly upgrade all instances to support exit fees', async () => {
            let exitFeeLogic = await DHedgeV3WithExitFees.new()

            // Update logic to V3 address
            await factory.setLogic(exitFeeLogic.address, { from: proxyAdmin })

            assert(
                '0' === (await dhedge.totalFundValue.call()).toString(),
                'initially fund should be empty'
            )

            //enable deposits first
            await sUsdToken.approve(dhedge.address, oneHundredTokens, {
                from: user1,
            })

            //then deposit
            await dhedge.deposit(oneHundredTokens, { from: user1 })

            //fund should have the deposit
            assert(
                oneHundredTokens.toString() ===
                    (await dhedge.totalFundValue.call()).toString(),
                'should have susd funds'
            )

            //user should have the fund fund tokens
            let pTokens = await dhedge.balanceOf.call(user1)

            assert(
                oneHundredTokens.toString() === pTokens.toString(),
                'should have fund tokens'
            )

            //exchange half into ether
            await dhedge.exchange(susdKey, fiftyTokens, sethKey, {
                from: manager,
            })

            await dhedge.withdraw(fiftyTokens, { from: user1 })

            assert(
                fiftyTokens.toString() ===
                    (await dhedge.balanceOf.call(user1)).toString(),
                'user fund tokens should match'
            )
            assert(
                '50000000000000000162' ===
                    (await dhedge.totalFundValue.call()).toString(),
                'after withdrawal fund should match'
            )
            assert(
                twentyFiveTokens.times(9).dividedBy(10).toFixed() ===
                    (await sUsdToken.balanceOf.call(user1)).toString(),
                'user should have susd again'
            )
            assert(
                '98025516511575615' ===
                    (await sEthToken.balanceOf.call(user1)).toString(),
                'user should have seth again'
            )

            //and empty the contract
            await dhedge.withdraw(fiftyTokens, { from: user1 })

            assert(
                '0' === (await dhedge.balanceOf.call(user1)).toString(),
                'user fund tokens should be empty'
            )
            assert(
                '0' === (await dhedge.totalFundValue.call()).toString(),
                'after withdrawal fund should be empty'
            )
            assert(
                fiftyTokens.times(9).dividedBy(10).toFixed() ===
                    (await sUsdToken.balanceOf.call(user1)).toString(),
                'user should have susd again'
            )
            assert(
                '196051033023151230' ===
                    (await sEthToken.balanceOf.call(user1)).toString(),
                'user should have seth again'
            )
            assert(
                '0' == (await dhedge.totalFundValue.call()).toString(),
                'dhedge should be empty'
            )
        })

        it('Simple deposit and withdrawal work ok after upgrade', async () => {
            await factory.setExitFee(new BN('0'), new BN('1'), { from: proxyAdmin })

            assert(
                '0' === (await dhedge.totalFundValue.call()).toString(),
                'initially fund should be empty'
            )

            //enable deposits first
            await sUsdToken.approve(dhedge.address, oneHundredTokens, {
                from: user1,
            })

            //then deposit
            await dhedge.deposit(oneHundredTokens, { from: user1 })

            //fund should have the deposit
            assert(
                oneHundredTokens.toString() ===
                    (await dhedge.totalFundValue.call()).toString(),
                'should have susd funds'
            )

            //user should have the fund fund tokens
            let pTokens = await dhedge.balanceOf.call(user1)

            // change logic
            let newLogic = await DHedge.new()

            // Update new logic
            await factory.setLogic(newLogic.address, { from: proxyAdmin })

            assert(
                oneHundredTokens.toString() === pTokens.toString(),
                'should have fund tokens'
            )

            await dhedge.withdraw(fiftyTokens, { from: user1 })

            assert(
                fiftyTokens.toString() ===
                    (await dhedge.balanceOf.call(user1)).toString(),
                'user fund tokens should be empty'
            )
            assert(
                fiftyTokens.toString() ===
                    (await dhedge.totalFundValue.call()).toString(),
                'after withdrawal fund should be empty'
            )
            assert(
                fiftyTokens.toString() ===
                    (await sUsdToken.balanceOf.call(user1)).toString(),
                'should have funds again'
            )

            await dhedge.withdraw(fiftyTokens, { from: user1 })

            assert(
                '0' === (await dhedge.balanceOf.call(user1)).toString(),
                'user fund tokens should be empty'
            )
            assert(
                '0' === (await dhedge.totalFundValue.call()).toString(),
                'after withdrawal fund should be empty'
            )
            assert(
                oneHundredTokens.toString() ===
                    (await sUsdToken.balanceOf.call(user1)).toString(),
                'should have funds again'
            )
        })
    })

    function timeout(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms))
    }
})
