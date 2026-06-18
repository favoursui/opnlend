require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "paris",
    },
  },
  networks: {
    hardhat: {},
    opn_testnet: {
      url: "https://testnet-rpc.iopn.tech",
      chainId: 984,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 7000000000,
      timeout: 60000,
    },
    opn_mainnet: {
      url: "https://rpc.iopn.tech",
      chainId: 985,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      gasPrice: 7000000000,
      timeout: 60000,
    },
  },
  etherscan: {
    apiKey: {
      opn_testnet: process.env.OPNSCAN_API_KEY || "placeholder",
      opn_mainnet: process.env.OPNSCAN_API_KEY || "placeholder",
    },
    customChains: [
      {
        network: "opn_testnet",
        chainId: 984,
        urls: {
          apiURL: "https://api-testnet.opnscan.io/api",
          browserURL: "https://testnet.opnscan.io",
        },
      },
      {
        network: "opn_mainnet",
        chainId: 985,
        urls: {
          apiURL: "https://api.opnscan.io/api",
          browserURL: "https://opnscan.io",
        },
      },
    ],
  },
};
