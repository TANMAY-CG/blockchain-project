const hre = require('hardhat');

async function main() {
  const Factory = await hre.ethers.getContractFactory('WarrantyRegistry');
  const contract = await Factory.deploy();
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`WarrantyRegistry deployed at: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

