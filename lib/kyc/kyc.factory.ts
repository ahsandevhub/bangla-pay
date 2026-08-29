import { createClient } from "@/lib/supabase/server";
import { SupabaseKycRepository } from "@/lib/kyc/kyc.repository";
import { KycService } from "@/lib/kyc/kyc.service";

export async function createKycService(): Promise<KycService> {
  const client = await createClient();
  return new KycService(new SupabaseKycRepository(client));
}
