-- Gap found while building Phase 5: Phase 1 only added a SELECT policy for
-- the kyc-documents bucket (docs/ARCHITECTURE.md's KYC section wasn't
-- explicit about the write side). A signed upload URL still needs the
-- calling user's own INSERT policy to actually accept the upload -- and
-- UPDATE, since Supabase's createSignedUploadUrl supports an upsert option
-- that becomes an UPDATE when the object already exists (e.g. a user
-- retrying a failed KYC upload with the same path). Both stay scoped to the
-- same owner-path-prefix rule as the existing SELECT policy.
create policy kyc_documents_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy kyc_documents_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'kyc-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
