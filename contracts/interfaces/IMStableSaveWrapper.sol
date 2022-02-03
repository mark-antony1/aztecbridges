// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.5;
pragma abicoder v2;


interface IMStableSaveWrapper {
	function saveViaMint (
		address _mAsset,
		address _bAsset,
		address _save,
		address _vault,
		uint256 _amount,
		uint256 _minOut,
		bool _stake
	) external;
}