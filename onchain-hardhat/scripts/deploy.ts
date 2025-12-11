import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);

  const Factory = await ethers.getContractFactory("TournamentMatches");
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log(`TournamentMatches deployed to: ${contractAddress}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
