const { Wallet } = require("ethers");

function main() {
	const wallet = Wallet.createRandom();
	console.log("Address:", wallet.address);
	console.log("Private key:", wallet.privateKey); // <-- use this in CHAIN_PRIVATE_KEY
}

main();
