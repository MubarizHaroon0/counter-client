const anchor = require('@project-serum/anchor');
const { SystemProgram, Keypair, Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Load the wallet keypair
const walletPath = "/home/mubariz/.config/solana/id.json";
const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const walletProvider = new anchor.Wallet(wallet);
const provider = new anchor.AnchorProvider(connection, walletProvider, anchor.AnchorProvider.defaultOptions());
anchor.setProvider(provider);

// Load the IDL and program ID
const idlPath = path.join(__dirname, 'counter_program.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
const programId = new PublicKey('xB4KEJykRgdqj6M3FopufhvmCHpta9NS5AxWu6RhEeE');
const program = new anchor.Program(idl, programId, provider);

const counterAccountPath = path.join(__dirname, 'counter_account.json');

const main = async () => {
    let counterAccount;

    if (fs.existsSync(counterAccountPath)) {
        const secretKey = JSON.parse(fs.readFileSync(counterAccountPath, 'utf8'));
        counterAccount = Keypair.fromSecretKey(new Uint8Array(secretKey));
    } else {
        counterAccount = Keypair.generate();
        fs.writeFileSync(counterAccountPath, JSON.stringify(Array.from(counterAccount.secretKey)));
    }

    try {
        // Check if the counter account is initialized
        await program.account.counterAccount.fetch(counterAccount.publicKey);
        console.log('Counter account already initialized');
    } catch (e) {
        // Initialize the counter account
        await program.rpc.initialize({
            accounts: {
                counterAccount: counterAccount.publicKey,
                user: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            },
            signers: [counterAccount],
        });
    }

    // Fetch and print the account data
    let account = await program.account.counterAccount.fetch(counterAccount.publicKey);
    console.log('Counter after initialization:', account.counter.toString());

    // Increment the counter
    await program.rpc.increment({
        accounts: {
            counterAccount: counterAccount.publicKey,
        },
    });
    account = await program.account.counterAccount.fetch(counterAccount.publicKey);
    console.log('Counter after increment:', account.counter.toString());

    // Decrement the counter
    await program.rpc.decrement({
        accounts: {
            counterAccount: counterAccount.publicKey,
        },
    });
    account = await program.account.counterAccount.fetch(counterAccount.publicKey);
    console.log('Counter after decrement:', account.counter.toString());

    // Update the counter to a specific value
    const newValue = 42;
    await program.rpc.update(newValue, {
        accounts: {
            counterAccount: counterAccount.publicKey,
        },
    });
    account = await program.account.counterAccount.fetch(counterAccount.publicKey);
    console.log('Counter after update:', account.counter.toString());

    // Reset the counter
    await program.rpc.reset({
        accounts: {
            counterAccount: counterAccount.publicKey,
        },
    });
    account = await program.account.counterAccount.fetch(counterAccount.publicKey);
    console.log('Counter after reset:', account.counter.toString());
};

main().catch(err => {
    console.error(err);
});
