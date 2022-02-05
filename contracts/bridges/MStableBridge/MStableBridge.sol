// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <=0.8.10;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IMStableAsset } from "../../interfaces/IMStableAsset.sol";
import { IMStableSavingsContract } from "../../interfaces/IMStableSavingsContract.sol";
import { IDefiBridge } from "../../interfaces/IDefiBridge.sol";
import { AztecTypes } from "../../AztecTypes.sol";

import "hardhat/console.sol";

contract MStableBridge is IDefiBridge {
  // the aztec rollup processor contract
  address public immutable rollupProcessor;

  constructor(address _rollupProcessor) {
    rollupProcessor = _rollupProcessor;
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
    console.log("In contract");
    // ### INITIALIZATION AND SANITY CHECKS
    require(msg.sender == rollupProcessor, "MStableBridge: INVALID_CALLER");
    console.log("check assets", inputAssetA.id, outputAssetA.id);
    require(
      inputAssetA.id != outputAssetA.id,
      "MStableBridge: ASSET_IDS_EQUAL"
    );
    require(
      inputAssetA.assetType == AztecTypes.AztecAssetType.ERC20,
      "MStableBridge: NOT_ERC20"
    );
    // operation is asynchronous
    isAsync = false;

    address mUSD = address(0xe2f2a5C287993345a840Db3B0845fbC70f5935a5);
    address imUSD = address(0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19);
    address bAsset = inputAssetA.erc20Address;

    if (outputAssetA.erc20Address == imUSD) {
      // approve the transfer of tokens to the balancer address
      ERC20(inputAssetA.erc20Address).approve(
        address(mUSD),
        totalInputValue
      );
      console.log("approved");

      uint256 minimumMUSDToMint = totalInputValue * ((uint256(1000) - uint256(auxData)))/1000;
      console.log("calculate mint amount", minimumMUSDToMint);
      uint256 massetsMinted = IMStableAsset(mUSD).mint(bAsset, totalInputValue, minimumMUSDToMint, address(this)); // Minting
      console.log("about to approve credits", massetsMinted);
      ERC20(mUSD).approve(
        imUSD,
        massetsMinted
      );
      console.log("about to issue credits", massetsMinted);
      outputValueA = IMStableSavingsContract(imUSD).depositSavings(massetsMinted); // Deposit into save
      console.log("issued");

      ERC20(imUSD).approve(
        rollupProcessor,
        outputValueA
      );
    } else {
        console.log("total input value", totalInputValue);
        uint256 balance = IMStableSavingsContract(imUSD).balanceOf();
        console.log("balance", balance);
        uint256 redeemedMUSD = IMStableSavingsContract(imUSD).redeemUnderlying(totalInputValue); // Redeem mUSD from save
        console.log("redeemedMUSD", redeemedMUSD);
        uint256 minimumBAssetToRedeem = redeemedMUSD * ((uint256(1000) - uint256(auxData)))/1000;
        outputValueA = IMStableAsset(mUSD).redeem(bAsset, redeemedMUSD, minimumBAssetToRedeem, address(this)); // Redeem bAsset from mUSD
        console.log("outputValueA", outputValueA);

        ERC20(bAsset).approve(
          rollupProcessor,
          outputValueA
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
