import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/shared/db/admin";
import { SupabaseAuthRepository } from "@/lib/auth/auth.repository";
import { AuthService } from "@/lib/auth/auth.service";

export async function createAuthService(): Promise<AuthService> {
  const client = await createClient();
  return new AuthService(new SupabaseAuthRepository(client, createAdminClient()));
}
