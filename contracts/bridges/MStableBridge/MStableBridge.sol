// SPDX-License-Identifier: GPL-2.0-only
// Copyright 2020 Spilsbury Holdings Ltd
pragma solidity >=0.6.10 <=0.8.10;
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IVault, IAsset, PoolSpecialization } from "../../interfaces/IVault.sol";
import { IPool } from "../../interfaces/IPool.sol";
import { ITranche } from "../../interfaces/ITranche.sol";
import { IERC20Permit, IERC20 } from "../../interfaces/IERC20Permit.sol";
import { IWrappedPosition } from "../../interfaces/IWrappedPosition.sol";
import { IRollupProcessor } from "../../interfaces/IRollupProcessor.sol";

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

  // cahce of all pools we are able to interact with
  mapping(uint256 => Pool) private pools;

  // the aztec rollup processor contract
  address public immutable rollupProcessor;

  uint64[] private heap;
  uint32[] private expiries;
  mapping(uint64 => uint256[]) private expiryToNonce;

  constructor(
    address _rollupProcessor,

  ) {
    rollupProcessor = _rollupProcessor;
  }

  function hashAssetAndExpiry(address asset, uint256 expiry)
    internal
    pure
    returns (uint256)
  {
    return uint256(keccak256(abi.encodePacked(asset, expiry)));
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
    // retrieve the appropriate pool for this interaction and verify that it exists
    Pool storage pool = pools[
      hashAssetAndExpiry(inputAssetA.erc20Address, auxData)
    ];
    require(pool.trancheAddress != address(0), "MStableBridge: POOL_NOT_FOUND");
    // CHECK INPUT ASSET != ETH
    // SHOULD WE CONVERT ETH -> WETH

    // approve the transfer of tokens to the balancer address
    ERC20(inputAssetA.erc20Address).approve(
      address(balancerAddress),
      totalInputValue
    );
    // execute the swap on balancer
    uint256 principalTokensAmount = IVault(balancerAddress).swap(
      IVault.SingleSwap({
        poolId: pool.poolId,
        kind: IVault.SwapKind.GIVEN_IN,
        assetIn: IAsset(inputAssetA.erc20Address),
        assetOut: IAsset(pool.trancheAddress),
        amount: totalInputValue,
        userData: "0x00"
      }),
      IVault.FundManagement({
        sender: address(this), // the bridge has already received the tokens from the rollup so it owns totalInputValue of inputAssetA
        fromInternalBalance: false,
        recipient: payable(address(this)),
        toInternalBalance: false
      }),
      totalInputValue, // discuss with ELement on the likely slippage for a large trade e.g $1M Dai
      block.timestamp
    );
    console.log(
      "Received %s tokens for input of %s",
      principalTokensAmount,
      totalInputValue
    );
    // store the tranche that underpins our interaction, the expiry and the number of received tokens against the nonce
    interactions[interactionNonce] = Interaction(
      pool.trancheAddress,
      auxData,
      principalTokensAmount,
      false
    );
    // add the nonce and expiry to our expiry heap
    addNonceAndExpiry(interactionNonce, auxData);
    // check the heap to see if we can finalise an expired transaction
    (
      bool expiryAvailable,
      uint64 expiry,
      uint256 nonce
    ) = checkNextArrayExpiry(); //checkNextExpiry();
    if (expiryAvailable) {
      // another position is available for finalising, inform the rollup contract
      IRollupProcessor(rollupProcessor).processAsyncDeFiInteraction(nonce);
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
