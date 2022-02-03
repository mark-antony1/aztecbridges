// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.5;
pragma abicoder v2;


interface IMStableAsset {
	function mint (
		address _input, 
		uint256 _inputQuantity, 
		uint256 _minOutputQuantity, 
		address _recipient
		) external returns (uint256 mintOutput);
	function redeem (
		address _output, 
		uint256 _mAssetQuantity,
		uint256 _minOutputQuantity,
		address _recipient
	) external returns (uint256 outputQuantity);
}