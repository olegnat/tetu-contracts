export class CoreAddresses {
  public readonly controller: string;
  public readonly announcer: string;
  public readonly feeRewardForwarder: string;
  public readonly bookkeeper: string;
  public readonly notifyHelper: string;
  public readonly mintHelper: string;
  public readonly rewardToken: string;
  public readonly psVault: string;
  public readonly fundKeeper: string;
  public readonly vaultController: string;
  public readonly vaultLogic: string;


  constructor(
      controller: string,
      announcer: string,
      feeRewardForwarder: string,
      bookkeeper: string,
      notifyHelper: string,
      mintHelper: string,
      rewardToken: string,
      psVault: string,
      fundKeeper: string,
      vaultController: string,
      vaultLogic: string
  ) {
    this.controller = controller;
    this.announcer = announcer;
    this.feeRewardForwarder = feeRewardForwarder;
    this.bookkeeper = bookkeeper;
    this.notifyHelper = notifyHelper;
    this.mintHelper = mintHelper;
    this.rewardToken = rewardToken;
    this.psVault = psVault;
    this.fundKeeper = fundKeeper;
    this.vaultController = vaultController;
    this.vaultLogic = vaultLogic;
  }
}
