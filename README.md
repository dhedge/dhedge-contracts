# dHEDGE

## Install packages:

```
npm i
```

## Start Ganache:

```
npx ganache-cli
```

## Deploy the contracts:

```
npx truffle migrate --reset --network development
```

## Running tests 

With Ganache (slow):
```
npx truffle --network development test
```

With Truffle develop (quick):
```
npx truffle develop
> test
```

Output:

```
  Contract: DHedgeFactory
    ✓ Factory was initialized properly
    ✓ Factory can create contracts correctly (208ms)
    Upgradability
      ✓ Upgrades correctly to a new implementation with a new method (203ms)
      ✓ Upgrades correctly to a new implementation with a redefined method (189ms)

  Contract: DHedge
    ✓ Fund metadata and default state is correct (159ms)
    ✓ MockExchangeRate works fine with small rounding errors (66ms)
    ✓ MockSynthetix exchange burns source amount of tokens and mints target amount (92ms)
    ✓ DHedge total balance after exchanges is correct (720ms)
    ✓ DHedge simple deposit and withdrawal work ok (687ms)
    ✓ DHedge mixed withdrawal works ok (834ms)
    ✓ Withdrawal and forefit of suspended assets work ok (761ms)
    ✓ Withdrawal and not forefit of suspended assets should fail (604ms)
    ✓ Deposit proportions work ok (282ms)
    ✓ Small investments work ok (532ms)
    ✓ Exit fees work correctly (359ms)
    ✓ Exit fees after cooldown work correctly (5438ms)
    ✓ Private pool works as expected (861ms)
    Members
      ✓ Adding and removing a single member keeps the map up to date (154ms)
      ✓ Adding members works correctly (174ms)
      ✓ Removing members works correctly (184ms)
    Assets
      ✓ Adding a new asset increases the number of assets and removing decreases (141ms)
      ✓ Adding an existing asset doesn't change the number of assets (72ms)
      ✓ Removing non supported asset doesn't change the number of assets (72ms)
      ✓ Asset with balance can't be removed (323ms)
      ✓ Non-Synth assets can't be added (45ms)
      ✓ Persistent asset can't be removed
      ✓ Assets can't be added over the maximum asset limit (74ms)
      ✓ Getting suspended assets works correctly (71ms)
    Pool fees
      ✓ Should initialize the pool fees correctly (152ms)
      ✓ Pool fee percentage variables initialize and function correctly (196ms)
      ✓ Basic manager fee flow (1207ms)
    Upgradability
      ✓ Should upgrade all instances (668ms)
      ✓ Should correctly upgrade all instances to support exit fees (802ms)
      ✓ Simple deposit and withdrawal work ok after upgrade (706ms)

  Contract: TestProxyFactory
    ✓ First two instances are initialized correctly
    ✓ Deploying another instance gives the same result (75ms)
    ✓ Updating the implementation in the factory reflects across all instances (61ms)
    ✓ V1 Implementation Setter functions (48ms)
    ✓ V2 Implementation Setter functions (77ms)


  39 passing (1m)
  ```