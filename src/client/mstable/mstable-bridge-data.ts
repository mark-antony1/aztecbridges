import { AddressZero } from '@ethersproject/constants';

import { AsyncYieldBridgeData, AuxDataConfig, AztecAsset, SolidityType } from '../bridge-data';
import { MStableBridge, IRollupProcessor, IMStableSavingsContract, IMStableAsset } from '../../../typechain-types';

export type BatchSwapStep = {
  poolId: string;
  assetInIndex: number;
  assetOutIndex: number;
  amount: string;
  userData: string;
};

export enum SwapType {
  SwapExactIn,
  SwapExactOut,
}

export type FundManagement = {
  sender: string;
  recipient: string;
  fromInternalBalance: boolean;
  toInternalBalance: boolean;
};

export class MStableBridgeData {
  private mStableBridgeContract: MStableBridge;
  private rollupContract: IRollupProcessor;
  private mStableSavingsContract: IMStableSavingsContract;
	private mStableAssetContract: IMStableAsset
	private imUSD = "0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19"
	private dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F"

  public scalingFactor = 1000000000n;

  constructor(mStableBridge: MStableBridge, mStableSavings: IMStableSavingsContract, rollupContract: IRollupProcessor, mStableAsset: IMStableAsset) {
    this.mStableBridgeContract = mStableBridge;
    this.rollupContract = rollupContract;
    this.mStableSavingsContract = mStableSavings;
		this.mStableAssetContract = mStableAsset
  }

  async getAuxData(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
  ): Promise<bigint[]> {
    return (await [50n]);
  }

  public auxDataConfig: AuxDataConfig[] = [
    {
      start: 0,
      length: 64,
      solidityType: SolidityType.uint64,
      description: 'Unix Timestamp of the tranch expiry',
    },
  ];

  async getExpectedOutput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    precision: bigint,
  ): Promise<bigint[]> {
    if(inputAssetA.erc20Address === this.dai) {
			const mintOutput = await this.mStableAssetContract.getMintOutput(this.dai, 1n)
      const exchangeRate = await this.mStableSavingsContract.exchangeRate();
			return [BigInt( mintOutput[0]._hex)/BigInt(exchangeRate[0]._hex)];
		} else {
      const exchangeRate = await this.mStableSavingsContract.exchangeRate();
			const redeemOutput = await this.mStableAssetContract.getRedeemOutput(this.dai, 1n)
			return [BigInt(exchangeRate[0]._hex)*BigInt(redeemOutput[0]._hex)];
		}
  }

  async getExpectedYearlyOuput(
    inputAssetA: AztecAsset,
    inputAssetB: AztecAsset,
    outputAssetA: AztecAsset,
    outputAssetB: AztecAsset,
    auxData: bigint,
    precision: bigint,
  ): Promise<bigint[]> {
		return [0n]
    // const assetExpiryHash = await this.mStableBridgeContract.hashAssetAndExpiry(inputAssetA.erc20Address, auxData);
    // const pool = await this.mStableBridgeContract.pools(assetExpiryHash);
    // const poolId = pool[2];
    // const trancheAddress = pool[0];

    // const funds: FundManagement = {
    //   sender: AddressZero,
    //   recipient: AddressZero,
    //   fromInternalBalance: false,
    //   toInternalBalance: false,
    // };

    // const step: BatchSwapStep = {
    //   poolId,
    //   assetInIndex: 0,
    //   assetOutIndex: 1,
    //   amount: precision.toString(),
    //   userData: '0x',
    // };

    // const deltas = await this.balancerContract.queryBatchSwap(
    //   SwapType.SwapExactIn,
    //   [step],
    //   [inputAssetA.erc20Address, trancheAddress],
    //   funds,
    // );

    // const outputAssetAValue = deltas[1];

    // const timeToExpiration = auxData - BigInt(Date.now());

    // const YEAR = 60 * 60 * 24 * 365;
    // const interest = BigInt(-outputAssetAValue.toBigInt() - precision);
    // const scaledOutput = (interest * this.scalingFactor) / BigInt(timeToExpiration);
    // const yearlyOutput = (scaledOutput * BigInt(YEAR)) / this.scalingFactor;

    // return [yearlyOutput + precision, 0n];
  }
}