const TestProxyFactory = artifacts.require('./upgradability/ProxyFactory.sol')
const TestImplementationV1 = artifacts.require(
    './test/TestImplementationV1.sol'
)
const TestImplementationV2 = artifacts.require(
    './test/TestImplementationV2.sol'
)

let logicOwner
let proxyAdmin
let user1

let logic1
let logic2
let proxyFactory

let instance1
let instance2

let proxy1
let proxy2

let initData

contract('TestProxyFactory', (accounts) => {
    beforeEach(async () => {
        logicOwner = accounts[0]
        proxyAdmin = accounts[1]

        user1 = accounts[2]

        logic1 = await TestImplementationV1.new({ from: logicOwner })
        logic2 = await TestImplementationV2.new({ from: logicOwner })

        proxyFactory = await TestProxyFactory.new({ from: proxyAdmin })
        await proxyFactory.__ProxyFactory_init(logic1.address, {
            from: proxyAdmin,
        })

        initData = web3.eth.abi.encodeFunctionCall(
            {
                inputs: [
                    {
                        internalType: 'string',
                        name: 'name',
                        type: 'string',
                    },
                ],
                name: 'initialize2',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            ['instance1']
        )

        proxy1 = await proxyFactory.deploy(initData, { from: proxyAdmin })
        instance1 = await TestImplementationV1.at(proxy1.logs[0].args.proxy, {
            from: proxyAdmin,
        })

        initData = web3.eth.abi.encodeFunctionCall(
            {
                inputs: [
                    {
                        internalType: 'string',
                        name: 'name',
                        type: 'string',
                    },
                ],
                name: 'initialize2',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            ['instance2']
        )

        proxy2 = await proxyFactory.deploy(initData, { from: proxyAdmin })
        instance2 = await TestImplementationV1.at(proxy2.logs[0].args.proxy, {
            from: proxyAdmin,
        })
    })

    it('First two instances are initialized correctly', async () => {
        assert(
            'instance1' === (await instance1.getName.call({ from: user1 })),
            "name doesn't match1"
        )

        assert(
            'instance2' === (await instance2.getName.call({ from: user1 })),
            "name doesn't match2"
        )
    })

    it('Deploying another instance gives the same result', async () => {
        initData = web3.eth.abi.encodeFunctionCall(
            {
                inputs: [
                    {
                        internalType: 'string',
                        name: 'name',
                        type: 'string',
                    },
                ],
                name: 'initialize2',
                outputs: [],
                stateMutability: 'nonpayable',
                type: 'function',
            },
            ['instance3']
        )

        let proxy3 = await proxyFactory.deploy(initData, { from: proxyAdmin })
        let instance3 = await TestImplementationV1.at(
            proxy3.logs[0].args.proxy,
            {
                from: proxyAdmin,
            }
        )

        assert(
            'instance3' === (await instance3.getName.call({ from: user1 })),
            "name doesn't match3"
        )
    })

    it('Updating the implementation in the factory reflects across all instances', async () => {
        await proxyFactory.setLogic(logic2.address, { from: proxyAdmin })

        assert(
            'instance1_MODIFIED' ===
                (await instance1.getName.call({ from: user1 })),
            "name doesn't match"
        )

        assert(
            'instance2_MODIFIED' ===
                (await instance2.getName.call({ from: user1 })),
            "name doesn't match"
        )
    })

    it('V1 Implementation Setter functions', async () => {
        await instance1.setName('test42')

        assert(
            'test42' === (await instance1.getName.call({ from: user1 })),
            "name doesn't match"
        )
    })

    it('V2 Implementation Setter functions', async () => {
        await proxyFactory.setLogic(logic2.address, { from: proxyAdmin })

        await instance1.setName('test42')

        assert(
            'test42_SET_MODIFIED' ===
                (await instance1.getName.call({ from: user1 })),
            "name doesn't match"
        )
    })
})
