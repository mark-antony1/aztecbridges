import { ethers } from "hardhat";
import DefiBridgeProxy from "../../../../src/artifacts/contracts/DefiBridgeProxy.sol/DefiBridgeProxy.json";
import { Contract, Signer, ContractFactory } from "ethers";
import {
  AztecAssetType,
  RollupProcessor,
} from "../../../../src/rollup_processor";

import { MStableBridge } from "../../../../typechain-types";

const fixEthersStackTrace = (err: Error) => {
  err.stack! += new Error().stack;
  throw err;
};

describe("defi bridge", function () {
  let rollupContract: RollupProcessor;
  let defiBridgeProxy: Contract;

  const daiAddress = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const imUSDAddress = "0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19";
  let signer: Signer;
  let mStableBridge: MStableBridge;

  beforeAll(async () => {
    [signer] = await ethers.getSigners();

    const factory = new ContractFactory(
      DefiBridgeProxy.abi,
      DefiBridgeProxy.bytecode,
      signer
    );
    defiBridgeProxy = await factory.deploy([]);
    rollupContract = await RollupProcessor.deploy(signer, [
      defiBridgeProxy.address,
    ]);
  });

  beforeEach(async () => {
    // deploy the bridge and pass in any args
    const mStableFactory = await ethers.getContractFactory(
      "MStableBridge"
    );
    mStableBridge = await mStableFactory.deploy(rollupContract.address);
    await mStableBridge.deployed();
  });

  it("should call convert successfully from DAI -> imUSD on the DeFi bridge", async () => {
    const inputAsset = {
      id: 1,
      erc20Address: daiAddress,
      assetType: AztecAssetType.ERC20,
    };
    const outputAsset = {
      id: 2,
      erc20Address: imUSDAddress,
      assetType: AztecAssetType.ERC20,
    };

    const quantityOfDaiToDeposit = 1n * 10n ** 21n;
    // get DAI into the rollup contract
    await rollupContract.preFundContractWithToken(signer, {
      erc20Address: daiAddress,
      amount: quantityOfDaiToDeposit,
      name: "DAI",
    });

    console.log("here herer")
    await rollupContract.convert(
      signer,
      mStableBridge.address,
      inputAsset,
      {},
      outputAsset,
      {},
      quantityOfDaiToDeposit,
      1n,
      0n
    );
  });

  it("should call convert successfully from imUSD -> DAI on the DeFi bridge", async () => {
    const inputAsset = {
      assetId: 2,
      erc20Address: imUSDAddress,
      assetType: AztecAssetType.ERC20,
    };
    const outputAsset = {
      assetId: 1,
      erc20Address: daiAddress,
      assetType: AztecAssetType.ERC20,
    };

    const quantityOfIMUSDToDeposit = 1n * 10n ** 21n;
    // get DAI into the rollup contract
    await rollupContract.preFundContractWithToken(signer, {
      erc20Address: imUSDAddress,
      amount: quantityOfIMUSDToDeposit,
      name: "imUSD",
    });

    await rollupContract.convert(
      signer,
      mStableBridge.address,
      inputAsset,
      {},
      outputAsset,
      {},
      quantityOfIMUSDToDeposit,
      1n,
      0n
    );
  });
});
