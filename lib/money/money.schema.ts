import { z } from "zod";
import { DECIMAL_AMOUNT_PATTERN } from "@/lib/shared/domain/money";

// Route-boundary shape validation only (docs/ARCHITECTURE.md: "Route handlers
// perform HTTP parsing and Zod validation, then call services"). This regex
// does not reject zero -- Money.parse() in the service layer enforces that
// business rule, so "0" reaches INVALID_AMOUNT via the domain layer, not here.
export const transferRequestSchema = z.object({
  destinationWallet: z
    .string()
    .regex(/^\+8801[3-9][0-9]{8}$/, "Enter a valid Bangladeshi mobile number."),
  amount: z.string().regex(DECIMAL_AMOUNT_PATTERN, "Enter a valid amount with up to two decimal places."),
  idempotencyKey: z.string().uuid(),
  note: z.string().max(280).optional(),
});

export type TransferRequestInput = z.infer<typeof transferRequestSchema>;

export const transactionHistoryQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
});

export type TransactionHistoryQueryInput = z.infer<typeof transactionHistoryQuerySchema>;
