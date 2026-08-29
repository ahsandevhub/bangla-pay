import { createClient } from "@/lib/supabase/server";
import { SupabaseRequestRepository } from "@/lib/requests/request.repository";
import { RequestService } from "@/lib/requests/request.service";

export async function createRequestService(): Promise<RequestService> {
  const client = await createClient();
  return new RequestService(new SupabaseRequestRepository(client));
}
