import {ethers} from "hardhat";
import chai from "chai";
import {DeployerUtils} from "../../../scripts/deploy/DeployerUtils";
import {MaticAddresses} from "../../MaticAddresses";
import {UniswapUtils} from "../../UniswapUtils";
import {utils} from "ethers";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/signers";
import chaiAsPromised from "chai-as-promised";
import {TimeUtils} from "../../TimeUtils";
import {CoreContractsWrapper} from "../../CoreContractsWrapper";
import {MintHelper, RewardToken} from "../../../typechain";
import {MintHelperUtils} from "../../MintHelperUtils";
import {Erc20Utils} from "../../Erc20Utils";

const {expect} = chai;
chai.use(chaiAsPromised);

describe("Mint helper tests", () => {
  let snapshot: string;
  let snapshotForEach: string;
  let signer: SignerWithAddress;
  let signerAddress: string;
  let core: CoreContractsWrapper;
  let minter: MintHelper;
  const opCode = 16;

  before(async () => {
    snapshot = await TimeUtils.snapshot();
    signer = (await ethers.getSigners())[0];
    signerAddress = signer.address;
    // deploy core contracts
    core = await DeployerUtils.deployAllCoreContracts(signer);
    minter = core.mintHelper;
    await UniswapUtils.wrapMatic(signer);
    await UniswapUtils.buyToken(signer, MaticAddresses.QUICK_ROUTER,
        MaticAddresses.USDC_TOKEN, utils.parseUnits("10000", 18))
  });

  after(async function () {
    await TimeUtils.rollback(snapshot);
  });

  beforeEach(async function () {
    snapshotForEach = await TimeUtils.snapshot();
  });

  afterEach(async function () {
    await TimeUtils.rollback(snapshotForEach);
  });

  it("should not work without token", async () => {
    const controller = await DeployerUtils.deployController(signer);
    const announcer = (await DeployerUtils.deployAnnouncer(signer, controller.address, 1))[0];
    const newMinter = (await DeployerUtils.deployMintHelper(signer, controller.address, [signer.address], [3000]))[0];

    await controller.setMintHelper(newMinter.address);
    await controller.setAnnouncer(announcer.address);

    await announcer.announceMint(1, signer.address, signer.address, false);

    await TimeUtils.advanceBlocksOnTs(1);

    await expect(controller.mintAndDistribute(1, signer.address, signer.address, false)).rejectedWith('Token not init');
  });

  it("should not set empty funds", async () => {
    await expect(minter.setDevFunds([], [])).rejectedWith("empty funds");
  });

  it("Mint tokens", async () => {
    await MintHelperUtils.mint(core.controller, core.announcer, '100000', core.notifyHelper.address);
    expect(await Erc20Utils.balanceOf(core.rewardToken.address, signerAddress))
    .at.eq(utils.parseUnits("9900", 18));

    await MintHelperUtils.mint(core.controller, core.announcer, '200', core.notifyHelper.address);
    expect(await Erc20Utils.balanceOf(core.rewardToken.address, signer.address))
    .at.eq(utils.parseUnits("9919.8", 18));
  });

  it("Wrong minter deploy", async () => {
    await expect(DeployerUtils.deployMintHelper(
        signer, core.controller.address,
        [signer.address, core.psVault.address], [2100, 10]
    )).to.be.rejectedWith("wrong sum of fraction");

    await expect(DeployerUtils.deployMintHelper(
        signer, core.controller.address,
        [signer.address, MaticAddresses.ZERO_ADDRESS], [2100, 900]
    )).to.be.rejectedWith("Address should not be 0");

    await expect(DeployerUtils.deployMintHelper(
        signer, core.controller.address,
        [signer.address], [2100, 900]
    )).to.be.rejectedWith("wrong size");

    await expect(DeployerUtils.deployMintHelper(
        signer, core.controller.address,
        [signer.address, core.psVault.address], [3000, 0]
    )).to.be.rejectedWith("Ratio should not be 0");
  });

  it("Should not mint more than max emission per week", async () => {
    await MintHelperUtils.mint(core.controller, core.announcer, '1', core.notifyHelper.address);
    const maxTotalAmount = await core.rewardToken.maxTotalSupplyForCurrentBlock();
    const totalAmount = await core.rewardToken.totalSupply();

    const toMint = maxTotalAmount.sub(totalAmount).add(1);

    await core.announcer.announceMint(toMint, core.notifyHelper.address, core.notifyHelper.address, false);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 48);
    await expect(core.controller.mintAndDistribute(toMint, core.notifyHelper.address, core.notifyHelper.address, false))
    .rejectedWith("limit exceeded")
  });

  it("Should not mint more than max emission per week for first mint", async () => {
    const toMint = utils.parseUnits('10000000000');
    await core.announcer.announceMint(toMint, core.notifyHelper.address, core.notifyHelper.address, false);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 48);
    await expect(core.controller.mintAndDistribute(toMint, core.notifyHelper.address, core.notifyHelper.address, false))
    .rejectedWith("ERC20Capped: cap exceeded")
  });
  it("Should mint max emission per week", async () => {
    await MintHelperUtils.mint(core.controller, core.announcer, '100', core.notifyHelper.address);
    const curWeek = await core.rewardToken.currentWeek();
    const maxTotalAmount = await core.rewardToken.maxTotalSupplyForCurrentBlock();
    const totalAmount = await core.rewardToken.totalSupply();
    const mintingStartTs = await core.rewardToken.mintingStartTs();
    console.log('maxTotalAmount',
        utils.formatUnits(maxTotalAmount, 18),
        utils.formatUnits(totalAmount, 18),
        curWeek.toString(),
        mintingStartTs.toString(),
    );
    const mintAmount = utils.formatUnits(maxTotalAmount.sub(totalAmount), 18);
    expect(mintAmount).at.eq("129746027.0");
    await MintHelperUtils.mint(core.controller, core.announcer, mintAmount, core.notifyHelper.address);
  });
  it("Should mint max emission after few weeks", async () => {
    await MintHelperUtils.mint(core.controller, core.announcer, '100', core.notifyHelper.address);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7 * 2.5);
    const currentWeek = await core.rewardToken.currentWeek();
    expect(currentWeek).at.eq("3");
    const maxTotalAmount = await core.rewardToken.maxTotalSupplyForCurrentBlock();
    const totalAmount = await core.rewardToken.totalSupply();
    const mintAmount = utils.formatUnits(maxTotalAmount.sub(totalAmount), 18);
    expect(maxTotalAmount.sub(totalAmount).toString()).at.eq("259492154000000000000000000");
    await MintHelperUtils.mint(core.controller, core.announcer, mintAmount, core.notifyHelper.address);
    expect(await Erc20Utils.balanceOf(core.rewardToken.address, signer.address))
    .at.eq("25689733146000000000000000");
  });
  it("Should mint all emission", async () => {
    await MintHelperUtils.mint(core.controller, core.announcer, '1', core.notifyHelper.address);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7 * 52 * 4);
    const currentWeek = await core.rewardToken.currentWeek();
    expect(currentWeek).at.eq("209");
    const maxTotalAmount = await core.rewardToken.maxTotalSupplyForCurrentBlock();
    const totalAmount = await core.rewardToken.totalSupply();
    const mintAmount = utils.formatUnits(maxTotalAmount.sub(totalAmount), 18);
    expect(maxTotalAmount.sub(totalAmount).toString()).at.eq("999999999000000000000000000");
    await MintHelperUtils.mint(core.controller, core.announcer, mintAmount, core.notifyHelper.address);

    const total = 10 ** 9;
    const totalNet = total * 0.33;
    const devExpected = totalNet * 0.3;

    expect(await Erc20Utils.balanceOf(core.rewardToken.address, signer.address))
    .at.eq(utils.parseUnits(devExpected.toFixed(), 18));
  });
  it("log2 test", async () => {
    const signer = (await ethers.getSigners())[0];
    const rewardToken = await DeployerUtils.deployContract(
        signer, "RewardToken", MaticAddresses.USDC_TOKEN) as RewardToken;
    expect((await rewardToken._log2(utils.parseUnits("1", 18))).toString())
    .at.eq("0");

    expect((await rewardToken._log2(utils.parseUnits("2", 18))).toString())
    .at.eq(utils.parseUnits("1", 18));

    expect((await rewardToken._log2(utils.parseUnits("8", 18))).toString())
    .at.eq(utils.parseUnits("3", 18));

    expect((await rewardToken._log2(utils.parseUnits("5", 18))).toString())
    .at.eq("2321928094887362334");

    expect((await rewardToken._log2(utils.parseUnits("500", 18))).toString())
    .at.eq("8965784284662087030");

    expect((await rewardToken._log2(utils.parseUnits("123456789", 18))).toString())
    .at.eq("26879430932860473806");

    expect((await rewardToken._log2(utils.parseUnits("123456789123456789", 18))).toString())
    .at.eq("56776783788289429979");

    expect((await rewardToken._log2(utils.parseUnits("123456789123456789123456789123456789", 18))).toString())
    .at.eq("116571489496261952241");

    await expect(rewardToken._log2(2)).rejectedWith('log input should be greater 1e18');
  });
  it("all time vesting", async () => {
    const mintPeriod = await core.rewardToken.MINTING_PERIOD();
    const w = mintPeriod.toNumber() / (60 * 60 * 24 * 7);

    const weeks: number[] = [];
    for (let i = 1; i < w; i++) {
      const maxTotalAmount = +utils.formatUnits(await core.rewardToken.maxTotalSupplyForCurrentBlock());
      await TimeUtils.advanceBlocksOnTs(60 * 60 * 24 * 7 + 10000);
      weeks.push(maxTotalAmount);
    }

    for (let i = 1; i <= weeks.length; i++) {
      console.log(i + ', ' + weeks[i - 1].toFixed());
    }

  });

  it("external user should not start", async () => {
    const extUser = (await ethers.getSigners())[1];
    await expect(core.rewardToken.connect(extUser).startMinting()).rejectedWith('not owner');
  });

  it("should not start twice", async () => {
    const token = await DeployerUtils.deployContract(signer, 'RewardToken', signer.address) as RewardToken;
    await token.startMinting();
    await expect(token.startMinting()).rejectedWith('minting already started');
  });

  it("should not mint before start", async () => {
    const token = await DeployerUtils.deployContract(signer, 'RewardToken', signer.address) as RewardToken;
    await expect(token.mint(signer.address, '1')).rejectedWith('minting not started');
  });

  it("not started week is zero", async () => {
    const token = await DeployerUtils.deployContract(signer, 'RewardToken', signer.address) as RewardToken;
    expect(await token.currentWeek()).is.eq(0);
    expect(await token.maxTotalSupplyForCurrentBlock()).is.eq(0);
  });

  it("change dev funds", async () => {
    await minter.setDevFunds([MaticAddresses.WMATIC_TOKEN, MaticAddresses.USDC_TOKEN], [1000, 2000]);

    expect(await minter.devFundsLength()).is.eq(2);
    expect((await minter.devFundsList(0)).toLowerCase()).is.eq(MaticAddresses.WMATIC_TOKEN);
    expect((await minter.devFundsList(1)).toLowerCase()).is.eq(MaticAddresses.USDC_TOKEN);

    await minter.setDevFunds([MaticAddresses.WMATIC_TOKEN], [3000]);

    expect(await minter.devFundsLength()).is.eq(1);
    expect((await minter.devFundsList(0)).toLowerCase()).is.eq(MaticAddresses.WMATIC_TOKEN);

    await minter.setDevFunds([MaticAddresses.WMATIC_TOKEN, MaticAddresses.USDC_TOKEN], [1000, 2000]);

    expect(await minter.devFundsLength()).is.eq(2);
    expect((await minter.devFundsList(0)).toLowerCase()).is.eq(MaticAddresses.WMATIC_TOKEN);
    expect((await minter.devFundsList(1)).toLowerCase()).is.eq(MaticAddresses.USDC_TOKEN);
  });

  it("mint all available emission", async () => {
    const amount = '0';
    const destination = signer.address;
    expect(await Erc20Utils.balanceOf(core.rewardToken.address, signer.address)).is.eq(0);
    await core.announcer.announceMint(utils.parseUnits(amount), destination, destination, true);
    await TimeUtils.advanceBlocksOnTs(60 * 60 * 48);
    await core.controller.mintAndDistribute(utils.parseUnits(amount), destination, destination, true);

    expect(await Erc20Utils.balanceOf(core.rewardToken.address, signer.address)).is.eq('129746127000000000000000000');
  });

});

