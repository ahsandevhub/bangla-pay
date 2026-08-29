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
