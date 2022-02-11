import { MStableBridgeData } from './mstable-bridge-data';
import { BigNumber, Signer } from 'ethers';
import { randomBytes } from 'crypto';
import { IRollupProcessor,IMStableSavingsContract, IMStableAsset, MStableBridge } from '../../../typechain-types';
import { AztecAssetType } from '../bridge-data';
import { AddressZero } from '@ethersproject/constants';

type Mockify<T> = {
  [P in keyof T]: jest.Mock;
};

const randomAddress = () => `0x${randomBytes(20).toString('hex')}`;

describe('element bridge data', () => {
  let rollupContract: Mockify<IRollupProcessor>;
  let mStableBridge: Mockify<MStableBridge>;
  let mStableAsset: Mockify<IMStableAsset>;
  let mStableSavingsContract: Mockify<IMStableSavingsContract>;

  it('should return the correct expected output', async () => {
    const expiry = BigInt(Date.now() + 86400 * 30);
    const trancheAddress = '0x90ca5cef5b29342b229fb8ae2db5d8f4f894d652';
    const poolId = '0x90ca5cef5b29342b229fb8ae2db5d8f4f894d6520002000000000000000000b5';
    const interest = 100000n;
    const inputValue = 10e18,
      mStableBridge = {
        hashAssetAndExpiry: jest.fn().mockResolvedValue('0xa'),
        pools: jest.fn().mockResolvedValue([trancheAddress, '', poolId]),
      };

    mStableAsset = {
      ...mStableAsset,
      // queryBatchSwap: jest.fn().mockImplementation((...args) => {
      //   const amount = args[1][0].amount;

      //   return Promise.resolve([BigNumber.from(BigInt(amount)), BigNumber.from(-BigInt(BigInt(amount) + interest))]);
      // }),
    };

    const mStableBridgeData = new MStableBridgeData(
      mStableBridge as any,
      mStableAsset as any,
      mStableSavingsContract as any,
      rollupContract as any,
    );
    const output = await mStableBridgeData.getExpectedOutput(
      {
        assetType: AztecAssetType.ERC20,
        erc20Address: 'test',
        id: 1n,
      },
      {
        assetType: AztecAssetType.NOT_USED,
        erc20Address: AddressZero,
        id: 0n,
      },
      {
        assetType: AztecAssetType.ERC20,
        erc20Address: 'test',
        id: 1n,
      },
      {
        assetType: AztecAssetType.NOT_USED,
        erc20Address: AddressZero,
        id: 0n,
      },
      expiry,
      BigInt(inputValue),
    );
    const YEAR = 60 * 60 * 24 * 365;
    const timeToExpiration = expiry - BigInt(Date.now());
    const scaledOut = (BigInt(interest) * mStableBridgeData.scalingFactor) / timeToExpiration;
    const yearlyOut = (scaledOut * BigInt(YEAR)) / mStableBridgeData.scalingFactor;

    expect(output[0]).toBe(BigInt(0));
  });


  it('should return the correct yearly output', async () => {
    const expiry = BigInt(Date.now() + 86400 * 30);
    const trancheAddress = '0x90ca5cef5b29342b229fb8ae2db5d8f4f894d652';
    const poolId = '0x90ca5cef5b29342b229fb8ae2db5d8f4f894d6520002000000000000000000b5';
    const interest = 100000n;
    const inputValue = 10e18,
      mStableBridge = {
        hashAssetAndExpiry: jest.fn().mockResolvedValue('0xa'),
        pools: jest.fn().mockResolvedValue([trancheAddress, '', poolId]),
      };

    mStableAsset = {
      ...mStableAsset,
      // queryBatchSwap: jest.fn().mockImplementation((...args) => {
      //   const amount = args[1][0].amount;

      //   return Promise.resolve([BigNumber.from(BigInt(amount)), BigNumber.from(-BigInt(BigInt(amount) + interest))]);
      // }),
    };

    const mStableBridgeData = new MStableBridgeData(
      mStableBridge as any,
      mStableAsset as any,
      mStableSavingsContract as any,
      rollupContract as any,
    );
    const output = await mStableBridgeData.getExpectedYearlyOuput(
      {
        assetType: AztecAssetType.ERC20,
        erc20Address: 'test',
        id: 1n,
      },
      {
        assetType: AztecAssetType.NOT_USED,
        erc20Address: AddressZero,
        id: 0n,
      },
      {
        assetType: AztecAssetType.ERC20,
        erc20Address: 'test',
        id: 1n,
      },
      {
        assetType: AztecAssetType.NOT_USED,
        erc20Address: AddressZero,
        id: 0n,
      },
      expiry,
      BigInt(inputValue),
    );
    const YEAR = 60 * 60 * 24 * 365;
    const timeToExpiration = expiry - BigInt(Date.now());
    const scaledOut = (BigInt(interest) * mStableBridgeData.scalingFactor) / timeToExpiration;
    const yearlyOut = (scaledOut * BigInt(YEAR)) / mStableBridgeData.scalingFactor;

    expect(output[0]).toBe(BigInt(0));
  });
});