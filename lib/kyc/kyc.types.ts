export type UploadUrlResult = {
  path: string;
  signedUrl: string;
  token: string;
};

export type KycVerificationOutcome = {
  accountId: string;
  walletNumber: string;
  balancePoisha: bigint;
};
