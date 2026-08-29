import { createClient } from "@/lib/supabase/server";
import { SupabaseMoneyRepository } from "@/lib/money/money.repository";
import { MoneyService } from "@/lib/money/money.service";

export async function createMoneyService(): Promise<MoneyService> {
  const client = await createClient();
  return new MoneyService(new SupabaseMoneyRepository(client));
}
