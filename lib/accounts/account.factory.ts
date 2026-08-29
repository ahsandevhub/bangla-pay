import { createClient } from "@/lib/supabase/server";
import { SupabaseAccountRepository } from "@/lib/accounts/account.repository";
import { AccountService } from "@/lib/accounts/account.service";

export async function createAccountService(): Promise<AccountService> {
  const client = await createClient();
  return new AccountService(new SupabaseAccountRepository(client));
}
