export type TransferOutcome = {
  transactionId: string;
  destinationWallet: string;
  amountPoisha: bigint;
  note: string | null;
  createdAt: string;
  replayed: boolean;
};

export type TransactionHistoryItem = {
  ledgerEntryId: number;
  transactionId: string;
  direction: "DEBIT" | "CREDIT";
  amountPoisha: bigint;
  balanceAfterPoisha: bigint;
  createdAt: string;
};

export type TransactionHistoryPage = {
  items: TransactionHistoryItem[];
  nextCursor: string | null;
};
