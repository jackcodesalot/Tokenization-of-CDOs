/**
 * deploy.js
 * Deploys the CreditTranche contract.
 *
 * Usage:
 *   Local:   npx hardhat run scripts/deploy.js --network localhost
 *   Testnet: npx hardhat run scripts/deploy.js --network sepolia
 */

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("─────────────────────────────────────────");
  console.log("Deploying CreditTranche...");
  console.log("Deployer address:", deployer.address);
  console.log(
    "Deployer balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH"
  );
  console.log("─────────────────────────────────────────");

  // Deploy: deployer becomes the DEFAULT_ADMIN and first ADMIN
  const CreditTranche = await hre.ethers.getContractFactory("CreditTranche");
  const contract = await CreditTranche.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(" CreditTranche deployed to:", address);
  console.log("─────────────────────────────────────────");
  console.log("Save this address — you'll need it in your frontend and scripts.");
  console.log("Add it to your .env as:  CONTRACT_ADDRESS=" + address);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Deployment failed:", err);
    process.exit(1);
  });
