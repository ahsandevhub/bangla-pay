-- Local/test fixture data only. Matches docs/CONTRACTS.md's frozen fixtures.
-- Mismatch-scenario fixtures (wrong DOB, wrong name, duplicate NID claim) are
-- submitted values tested against these two real rows -- they are not
-- separate registry rows themselves.

insert into public.fake_nid_records (nid_number, date_of_birth, bangla_name, english_name)
values
  ('19920115123456701', '1992-01-15', 'আহসান হাবিব', 'Ahsan Habib'),
  ('19930822123456702', '1993-08-22', 'সাইফুল ইসলাম', 'Md. Saiful Islam')
on conflict (nid_number) do nothing;
