import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Service-role client: bypasses RLS entirely. Only for operations that
 * genuinely cannot run as the acting user -- creating an auth.users row via
 * the Admin API (registration, before any session exists) and the
 * RECONCILE_ADMIN_TOKEN-gated admin/reconcile endpoint (Phase 7). Never
 * import this into a Client Component or anything that could bundle it to
 * the browser; SUPABASE_SECRET_KEY must never leave the server.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
