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

import "../../../base/strategies/snx-base/SNXStrategyFullBuyback.sol";
import "../../../third_party/quick/IStakingRewards.sol";
import "../../../third_party/uniswap/IUniswapV2Pair.sol";

contract StrategyQuick_WMATIC_WOLF is SNXStrategyFullBuyback {

  // QUICK_WMATIC_WOLF
  address private constant UNDERLYING = address(0x652a7b75c229850714D4a11E856052AAC3e9b065);
  // WMATIC
  address private constant TOKEN0 = address(0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270);
  // WOLF
  address private constant TOKEN1 = address(0x8f18dC399594b451EdA8c5da02d0563c0b2d0f16);
  address private constant QUICK_REWARD_POOL = address(0x3139523e1507cF6B0700Be2EABea6D5e919C6369);

  string private constant _PLATFORM = "QUICK";
  address private constant QUICK_REWARD_TOKEN = address(0x831753DD7087CaC61aB5644b308642cc1c33Dc13);
  address[] private quickPoolRewards = [QUICK_REWARD_TOKEN];
  address[] private _assets = [TOKEN0, TOKEN1];

  constructor(
    address _controller,
    address _vault
  ) SNXStrategyFullBuyback(_controller, UNDERLYING, _vault, quickPoolRewards, QUICK_REWARD_POOL) {
    require(address(IStakingRewards(QUICK_REWARD_POOL).stakingToken()) == UNDERLYING, "wrong pool");
    address token0 = IUniswapV2Pair(UNDERLYING).token0();
    address token1 = IUniswapV2Pair(UNDERLYING).token1();
    require(TOKEN0 != TOKEN1, "same tokens");
    require(TOKEN0 == token0 || TOKEN0 == token1, "wrong token0");
    require(TOKEN1 == token0 || TOKEN1 == token1, "wrong token1");

  }

  function platform() external override pure returns (string memory) {
    return _PLATFORM;
  }

  // assets should reflect underlying tokens for investing
  function assets() external override view returns (address[] memory) {
    return _assets;
  }
}
