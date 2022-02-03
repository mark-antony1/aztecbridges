// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <=0.8.10;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IVault, IAsset, PoolSpecialization } from "../../interfaces/IVault.sol";
import { ITranche } from "../../interfaces/ITranche.sol";
import { IERC20Permit, IERC20 } from "../../interfaces/IERC20Permit.sol";
import { IWrappedPosition } from "../../interfaces/IWrappedPosition.sol";
import { IRollupProcessor } from "../../interfaces/IRollupProcessor.sol";
import { IMStableSaveWrapper } from "../../interfaces/IMStableSaveWrapper.sol";
import { IMStableAsset } from "../../interfaces/IMStableAsset.sol";
import { IMStableSavingsContract } from "../../interfaces/IMStableSavingsContract.sol";

import { IDefiBridge } from "../../interfaces/IDefiBridge.sol";

import { AztecTypes } from "../../AztecTypes.sol";

import "hardhat/console.sol";

contract MStableBridge is IDefiBridge {
  // capture the minimum info required to recall a deposit
  struct Interaction {
    address trancheAddress;
    uint64 expiry;
    uint256 quantityPT;
    bool finalised;
  }

  // minimum info required to execute a deposit
  struct Pool {
    address trancheAddress;
    address poolAddress;
    bytes32 poolId;
  }

  // cache of all of our Defi interactions. keyed on nonce
  mapping(uint256 => Interaction) private interactions;

  // the aztec rollup processor contract
  address public immutable rollupProcessor;
  address public saveWrapper;
  address public boostedSavingsVault;

  constructor(
    address _rollupProcessor,
    address _saveWrapper,
    address _boostedSavingsVault,
  ) {
    rollupProcessor = _rollupProcessor;
    saveWrapper = _saveWrapper;
    boostedSavingsVault = _boostedSavingsVault;
  }

  // convert the input asset to the output asset
  // serves as the 'on ramp' to the interaction
  function convert(
    AztecTypes.AztecAsset memory inputAssetA,
    AztecTypes.AztecAsset memory,
    AztecTypes.AztecAsset memory outputAssetA,
    AztecTypes.AztecAsset memory,
    uint256 totalInputValue,
    uint256 interactionNonce,
    uint64 auxData
  )
    external
    payable
    override
    returns (
      uint256 outputValueA,
      uint256 outputValueB,
      bool isAsync
    )
  {
    // ### INITIALIZATION AND SANITY CHECKS
    require(msg.sender == rollupProcessor, "MStableBridge: INVALID_CALLER");
    require(
      inputAssetA.id == outputAssetA.id,
      "MStableBridge: ASSET_IDS_NOT_EQUAL"
    );

    require(
      inputAssetA.assetType == AztecTypes.AztecAssetType.ERC20,
      "MStableBridge: NOT_ERC20"
    );
    require(
      interactions[interactionNonce].expiry == 0,
      "MStableBridge: INTERACTION_ALREADY_EXISTS"
    );
    // operation is asynchronous
    isAsync = false;

    address mUSD = address(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5);
    address imUSD = address(0x30647a72dc82d7fbb1123ea74716ab8a317eac19)
    address bAsset = inputAssetA.erc20Address;

    if outputAssetA.erc2Address == imUSD {
      // approve the transfer of tokens to the balancer address
      ERC20(inputAssetA.erc20Address).approve(
        address(saveWrapper),
        totalInputValue
      );
      uint256 massetsMinted = IMStableAsset(mUSD).mint(bAsset, totalInputValue, totalInputValue, address(this)); // Minting

      uint256 creditsIssued = IMStableSavingsContract(imUSD).depositSavings(massetsMinted, msg.sender); // Deposit into save

      ERC20(imUSD).approve(
        rollupProcessor,
        creditsIssued
      );
    } else {
        uint256 redeemedMUSD = IMStableSavingsContract(imUSD).redeemUnderlying(totalInputValue, msg.sender); // Redeem mUSD from save
        uint256 outputAmount = IMStableAsset(mUSD).redeem(bAsset, redeemedMUSD, redeemedMUSD, address(this)); // Redeem bAsset from mUSD
        ERC20(bAsset).approve(
          rollupProcessor,
          outputAmount
        );
    }
  }

  function canFinalise(
    uint256 /*interactionNonce*/
  ) external view override returns (bool) {
    return false;
  }

  function finalise(
    AztecTypes.AztecAsset calldata inputAssetA,
    AztecTypes.AztecAsset calldata inputAssetB,
    AztecTypes.AztecAsset calldata outputAssetA,
    AztecTypes.AztecAsset calldata outputAssetB,
    uint256 interactionNonce,
    uint64 auxData
  ) external payable override returns (uint256, uint256) {
    require(false);
  }
}
