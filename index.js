const wabt = require('wabt')();
const { Keypair, Operation, Contract, SorobanRpc, TransactionBuilder, Address, StrKey } = require("stellar-sdk");

// Tiniest soroban contract?
// Try some new WAT here:
const wat = `
(module
  (func (export "") (result i64)
    i64.const 2))`;

// ContractEnvMetaV0
const meta = new Uint8Array([
    0x00, 0x1E, 0x11, 0x63, 0x6F, 0x6E, 0x74, 0x72,
    0x61, 0x63, 0x74, 0x65, 0x6E, 0x76, 0x6D, 0x65,
    0x74, 0x61, 0x76, 0x30, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x14, 0x00, 0x00, 0x00, 0x00
]);

const networkPassphrase = "Test SDF Network ; September 2015";
const rpcurl = "https://soroban-testnet.stellar.org:443";
const server = new SorobanRpc.Server(rpcurl, { allowHttp: true });
const keys = Keypair.fromSecret("SBEW3RK3Q2MKK7CRNMZMCTNZR4VPOXGWVIKJ7B7RGULB5ZOELPXBILPT");

async function main() {
    try {
        // Convert wat to wasm.
        const bin = new Uint8Array((await wabt).parseWat('tiny.wat', wat).toBinary({}).buffer);
        const wasm = new Uint8Array([...bin, ...meta]);
        console.log(`WASM Binary: ${Array.from(wasm).map
            (byte => ('00' + byte.toString(16)).slice(-2)).join('')}\nSize: ${wasm.length} bytes`);

        // Upload contract and invoke.
        const response = await sendTransaction(Operation.uploadContractWasm({ wasm }))
            .then(response => sendTransaction(Operation.createCustomContract({
                wasmHash: response.returnValue.bytes(),
                address: Address.fromString(keys.publicKey()),
                salt: response.hash
            })))
            .then(response => sendTransaction(
                new Contract(StrKey.encodeContract(
                    Address.fromScAddress(
                        response.returnValue.address()).toBuffer()))
                        .call("")
            ));
        console.log(response.returnValue);

    } catch (e) {
        console.error(e);
    }
}

async function sendTransaction(operation) {
    let transaction = new TransactionBuilder(await server.getAccount(keys.publicKey()),
        { fee: 10000000, networkPassphrase: networkPassphrase })
        .addOperation(operation)
        .setTimeout(30)
        .build();
    transaction = await server.prepareTransaction(transaction);
    transaction.sign(keys);
    let response = await server.sendTransaction(transaction);
    const hash = response.hash;
    while (response.status === "PENDING" || response.status === "NOT_FOUND") {
        await new Promise(resolve => setTimeout(resolve, 2000));
        response = await server.getTransaction(hash);
    }
    console.log(`Tx ${hash}`);
    return response;
}

main();