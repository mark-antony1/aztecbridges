import chai, { expect } from "chai";
import hre, { ethers } from "hardhat";
import DefiBridgeProxy from "../../artifacts/contracts/DefiBridgeProxy.sol/DefiBridgeProxy.json";
import { Contract, Signer, ContractFactory, BigNumber } from "ethers";
import {
  AztecAssetType,
  RollupProcessor,
} from "../../rollup_processor";

import { MStableBridge, ERC20 } from "../../../typechain-types";

export async function fundERC20FromAccount(
  erc20: ERC20,
  from: string,
  to: string,
  amount: BigNumber
) {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [from],
  });
  await hre.network.provider.send("hardhat_setBalance", [
    from,
    ethers.utils.hexStripZeros(ethers.utils.parseEther("100.0").toHexString()),
  ]);
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

  const daiAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
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
    const imUSDContract = await ethers.getContractAt("ERC20", imUSDAddress);
    const daiContract = await ethers.getContractAt("ERC20", daiAddress);
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

    const oldImUSDRollupBalance = await imUSDContract.balanceOf(
      rollupContract.address
    );

    const quantityOfDaiToDeposit = 1n * 10n ** 21n;
    // get DAI into the rollup contract
    await rollupContract.preFundContractWithToken(signer, {
      erc20Address: daiAddress,
      amount: quantityOfDaiToDeposit,
      name: "DAI",
    });

    const { outputValueA, isAsync } = await rollupContract.convert(
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

    const newImUSDRollupBalance = await imUSDContract.balanceOf(
      rollupContract.address
    );
    const newDaiRollupBalance = await daiContract.balanceOf(
      rollupContract.address
    );

    expect(newImUSDRollupBalance).to.equal(oldImUSDRollupBalance.add(outputValueA));
    expect(newDaiRollupBalance).to.equal(0n);
    expect(isAsync).to.be.false;
  });

  it("should call convert successfully from imUSD -> DAI on the DeFi bridge", async () => {   
    const imUSDContract = await ethers.getContractAt("ERC20", imUSDAddress);
    const daiContract = await ethers.getContractAt("ERC20", daiAddress); 

    const oldImUSDRollupBalance = await imUSDContract.balanceOf(
      rollupContract.address
    );
    const oldDaiRollupBalance = await daiContract.balanceOf(
      rollupContract.address
    );

    const imUSDinputAsset = {
      id: 2,
      erc20Address: imUSDAddress,
      assetType: AztecAssetType.ERC20,
    };
    const daiOutputAsset = {
      id: 1,
      erc20Address: daiAddress,
      assetType: AztecAssetType.ERC20,
    };

    const { outputValueA, isAsync } = await rollupContract.convert(
      signer,
      mStableBridge.address,
      imUSDinputAsset,
      {},
      daiOutputAsset,
      {},
      1000000n,
      2n,
      100n
    );
    
    const newImUSDRollupBalance = await imUSDContract.balanceOf(
      rollupContract.address
    );
    const newDaiRollupBalance = await daiContract.balanceOf(
      rollupContract.address
    );

    expect(newDaiRollupBalance).to.equal(oldDaiRollupBalance.add(outputValueA));
    expect(newImUSDRollupBalance).to.equal(oldImUSDRollupBalance.sub(1000000n));
    expect(isAsync).to.be.false;
  });
});
