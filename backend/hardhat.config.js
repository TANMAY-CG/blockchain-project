require('@nomicfoundation/hardhat-ethers');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
const rpcUrl = process.env.HARDHAT_RPC_URL || 'http://127.0.0.1:8545';
const privateKey = process.env.HARDHAT_PRIVATE_KEY || '';

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {},
    localhost: {
      url: 'http://127.0.0.1:8545',
    },
    sepolia: {
      url: rpcUrl,
      accounts: privateKey ? [privateKey] : [],
    },
  },
};

