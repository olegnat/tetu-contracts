// SPDX-License-Identifier: ISC
/**
* By using this software, you understand, acknowledge and accept that Tetu
* and/or the underlying software are provided “as is” and “as available”
* basis and without warranties or representations of any kind either expressed
* or implied. Any use of this open source software released under the ISC
* Internet Systems Consortium license is done at your own risk to the fullest
* extent permissible pursuant to applicable law any and all liability as well
* as all warranties, including any fitness for a particular purpose with respect
* to Tetu and/or the underlying software and the use thereof are disclaimed.
*/
pragma solidity 0.7.6;


import "../../../base/strategies/masterchef-base/WaultStrategyFullBuyback.sol";

contract StrategyWault_SNX_WETH is WaultStrategyFullBuyback {

  // WAULT_SNX_WETH
  address private constant _UNDERLYING = address(0x2857Ec555c1E4fA20982AcBf985b8b8807157A5B);
  // SNX
  address private constant TOKEN0 = address(0x50B728D8D964fd00C2d0AAD81718b71311feF68a);
  // WETH
  address private constant TOKEN1 = address(0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619);

  // WexPolyMaster
  address public constant WEX_POLY_MASTER = address(0xC8Bd86E5a132Ac0bf10134e270De06A8Ba317BFe);
  string private constant _PLATFORM = "WAULT";
  // rewards
  address private constant WEXpoly = address(0x4c4BF319237D98a30A929A96112EfFa8DA3510EB);
  address[] private poolRewards = [WEXpoly];
  address[] private _assets = [TOKEN0, TOKEN1];

  constructor(
    address _controller,
    address _vault
  ) WaultStrategyFullBuyback(_controller, _UNDERLYING, _vault, poolRewards, WEX_POLY_MASTER, 14) {
  }


  function platform() external override pure returns (string memory) {
    return _PLATFORM;
  }

  // assets should reflect underlying tokens need to investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }
}
