import { z } from "zod";
import { DECIMAL_AMOUNT_PATTERN } from "@/lib/shared/domain/money";

export const createRequestSchema = z.object({
  payerWallet: z.string().regex(/^\+8801[3-9][0-9]{8}$/, "Enter a valid Bangladeshi mobile number."),
  amount: z.string().regex(DECIMAL_AMOUNT_PATTERN, "Enter a valid amount with up to two decimal places."),
  note: z.string().max(280).optional(),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>;

export const requestIdParamSchema = z.object({
  id: z.string().uuid(),
});
