# 65 Bytes Soroban Smart Contract

For those who prefer to get straight to the point, here's my WAT:

```wasm
(module
  (func (export "") (result i64)
    i64.const 2))
```
Binary:
```
0061736d010000000105016000017e030201000704010000000a0601040042020b
001e11636f6e7472616374656e766d6574617630000000000000001400000000
```
Upload/Invoke Transactions (testnet):
```
Tx 29c32b8694f87e939ef194773582b959698e682503049da75b4691973b02a521
Tx 8ba6ea17cc37153f3f1f31fc921b067dc8e7d5087a4c32cd30cd0c4cfc8b567f
Tx 36e5d5fd73eee9c73d1c447d5d6bf8da5f56d76465c4ca3489a109c97b5f5bd5
```

# Tiny Soroban challenge

This morning I came across this post from @tyvdh in the [Stellar Developer](https://discord.gg/stellardev) discord server and decided to take on the challenge for the weekend:

> **kalepail** > Fun over-Christmas challenge. 
> Can you beat my smallest invokable soroban contract high score of 66 bytes? https://futurenet.steexp.com/contract/CC4QBKSZKUJNVHMAOYRV4SSE24WRFQ3VAL4IX6PONPBSOFHQFC5F6IDB/code-wat

The WAT looks like this:

```wasm
(module
  (type (;0;) (func (result i64)))
  (func (;0;) (type 0) (result i64)
    i64.const 2)
  (export "r" (func 0)))
```

Looking at it closely, it seemed there was no room for compacting the module further: one export, one function, mandatory return type for an *invokable contract* and 1 byte length function name.

WASM binary generated: **34 bytes.**

`[magic:4][version:4][type_sec:7][func_sec:5][export_sec:6][code_sec:8]`

So, I first tried to strip the custom sections but the smart contract was rejected with the following error:

```
0: [Diagnostic Event] topics:[error, Error(WasmVm, InvalidInput)], data:"contract missing metadata section"
```

Then, I found this in the reference Soroban documentation:

[https://soroban.stellar.org/docs/reference](https://soroban.stellar.org/docs/reference/sdks/build-your-own-sdk#environment-meta-generation)

> Contracts must contain a Wasm custom section with name `contractenvmetav0` and containing a serialized SCEnvMetaEntry

The minimum size for this section alone is **32 bytes**. The only way to reduce the binary size, given these current Soroban specifications, was to find a way to shrink the module code.

## Solution

Here is what the [wasm spec](https://webassembly.github.io/gc/core/syntax/values.html#names) says:


> name ::= char∗ (if|utf8(char∗)|<2^32)

Function names (utf8(char∗)) can have a length of zero. So *hypothetically*, we could take **one byte** off the 34 bytes (export section).

So, the WAT can be written more compactly like this, resulting in the same output except for the export section, which can now be one byte shorter:

```wasm
(module
  (func (export "") (result i64)
    i64.const 2))
```

And the generated binary:
```
0061736d010000000105016000017e030201000704010000000a0601040042020b
```

`[magic:4][version:4][type_sec:7][func_sec:5][export_sec:5][code_sec:7]`

Appending the meta section, we get:

```
0061736d010000000105016000017e030201000704010000000a0601040042020b
001e11636f6e7472616374656e766d6574617630000000000000001400000000
```

When you build the transaction, just specify an empty string for the contract call.

```js
   new Contract(StrKey.encodeContract(
    Address.fromScAddress(
    response.returnValue.address()).toBuffer()))
    .call("")
```

## Upload and Invoke it

If you want to experiment further, you can write your WAT code directly at the top of the script. It will convert it to WASM binary and append the `contractenvmetav0` section, so no need to use external tools.

```js
// Try some new WAT here:
const wat = `
(module
  (func (export "") (result i64)
    i64.const 2))`;
```

## Install and Run it

Install:

```shell
$ npm install
```

Run:
```shell
$ node index.js
```

## **Merry Xmas!** 🎄🎅 
