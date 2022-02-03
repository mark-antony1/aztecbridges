// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.7.5;
pragma abicoder v2;


interface IMStableSavingsContract {
	function depositSavings (
		uint256 _underlying
	) external returns (uint256 creditsIssued);
}