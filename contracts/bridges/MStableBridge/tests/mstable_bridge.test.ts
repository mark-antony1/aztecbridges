import hre, { ethers } from "hardhat";
import DefiBridgeProxy from "../../../../src/artifacts/contracts/DefiBridgeProxy.sol/DefiBridgeProxy.json";
import { Contract, Signer, ContractFactory, BigNumber } from "ethers";
import {
  AztecAssetType,
  RollupProcessor,
} from "../../../../src/rollup_processor";

import { MStableBridge, ERC20 } from "../../../../typechain-types";

const toBytes32 = (bn: BigNumber) => {
  return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

const setStorageAt = async (address: string, index: string, value: string) => {
  await ethers.provider.send("hardhat_setStorageAt", [address, index, value]);
  await ethers.provider.send("evm_mine", []); // Just mines to the next block
};

export async function fundERC20FromAccount(
  erc20: ERC20,
  from: string,
  to: string,
  amount: BigNumber
) {
  console.log("impersonate")
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [from],
  });
  console.log("set balance")
  await hre.network.provider.send("hardhat_setBalance", [
    from,
    ethers.utils.hexStripZeros(ethers.utils.parseEther("100.0").toHexString()),
  ]);
  console.log("hre transfer")
  const holder = await ethers.getSigner(from);
  await erc20.connect(holder).transfer(to, amount);
  await hre.network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [from],
  });
}

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

    console.log("########## 1st TEST CASE:first convert ###################")
    await rollupContract.convert(
      signer,
      mStableBridge.address,
      inputAsset,
      {},
      outputAsset,
      {},
      quantityOfDaiToDeposit,
      1n,
      100n
    );

    console.log("########## 1st TEST CASE:second convert ###################")
    await rollupContract.convert(
      signer,
      mStableBridge.address,
      outputAsset,
      {},
      inputAsset,
      {},
      1n,
      2n,
      100n
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
    
    // const locallyManipulatedBalance = ethers.utils.parseUnits("10000000");
    // const slot = 51;
    // // Get storage slot index
    // const index = ethers.utils.solidityKeccak256(
    //   ["uint256", "uint256"],
    //   [rollupContract.address, slot] // key, slot
    // );
    
    // await setStorageAt(
    //   imUSDAddress,
    //   index,
    //   toBytes32(locallyManipulatedBalance).toString()
    // );
    console.log("########## 2nd TEST CASE ###################")
    const token1Contract = await ethers.getContractAt(
      "ERC20",
      "0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19"
    );
    const SWAP_AMOUNT = "100";
    const amount = ethers.utils.parseUnits(
      SWAP_AMOUNT,
      await token1Contract.decimals()
    );
    const quantityOfIMUSDToDeposit = 1n * 10n ** 21n;
    console.log("about to fund with", token1Contract.address)
    fundERC20FromAccount(token1Contract, defiBridgeProxy.address, rollupContract.address, amount)
    fundERC20FromAccount(token1Contract, rollupContract.address, defiBridgeProxy.address, amount)
    const rollupBalance = await token1Contract.balanceOf(
      rollupContract.address
    );
    const proxyBalance = await token1Contract.balanceOf(
      defiBridgeProxy.address
    );
    console.log("rollupBalance", rollupBalance.toString())
    console.log("proxyBalance", proxyBalance.toString())

    const imUSDinputAsset = {
      assetId: 2,
      erc20Address: imUSDAddress,
      assetType: AztecAssetType.ERC20,
    };
    const daiOutputAsset = {
      assetId: 1,
      erc20Address: daiAddress,
      assetType: AztecAssetType.ERC20,
    };


    await rollupContract.convert(
      signer,
      mStableBridge.address,
      imUSDinputAsset,
      {},
      daiOutputAsset,
      {},
      1n,
      2n,
      100n
    );
    

  });
});
