export type RequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED";

export type MoneyRequest = {
  id: string;
  requesterAccountId: string;
  payerAccountId: string;
  amountPoisha: bigint;
  note: string | null;
  status: RequestStatus;
  settlementTransactionId: string | null;
  expiresAt: string;
  createdAt: string;
};

export type RequestSettlement = {
  transactionId: string;
  amountPoisha: bigint;
  createdAt: string;
  replayed: boolean;
};

// The payer's inbox: pending requests to act on. Carries the requester's
// wallet number, not their account id -- accounts_select_own hides the
// requester's own account row from the payer, so the id alone would be
// undisplayable client-side.
export type RequestInboxItem = {
  id: string;
  requesterWalletNumber: string;
  amountPoisha: bigint;
  note: string | null;
  expiresAt: string;
  createdAt: string;
};
