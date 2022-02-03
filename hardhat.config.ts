import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import { HardhatUserConfig } from "hardhat/config";

const getBlockNumber = () => {
  let blockNumber = 14000000;
  if (process.env.BLOCK_NUMBER) {
    blockNumber = +process.env.BLOCK_NUMBER;
  }
  return blockNumber;
};

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.10",
      },
    ],
    settings: {
      evmVersion: "london",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  typechain: {
    target: "ethers-v5",
  },
  networks: {
    ganache: {
      url: `http://${process.env.GANACHE_HOST || "localhost"}:8545`,
    },
    hardhat: {
      blockGasLimit: 15000000,
      hardfork: "london",
      forking: {
        url:
          process.env.MAINNET_RPC_HOST ||
          "https://mainnet.infura.io/v3/c33686bea7bf4d59ac1f09493023f32b",
        blockNumber: getBlockNumber(),
      },
    },
  },
  paths: {
    artifacts: "./src/artifacts",
  },
};

export default config;
