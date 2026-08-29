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
  type: "INITIAL_FUNDING" | "TRANSFER" | "REQUEST_SETTLEMENT";
  direction: "DEBIT" | "CREDIT";
  amountPoisha: bigint;
  balanceAfterPoisha: bigint;
  note: string | null;
  counterpartyWalletNumber: string;
  createdAt: string;
};

export type TransactionHistoryPage = {
  items: TransactionHistoryItem[];
  nextCursor: string | null;
};
