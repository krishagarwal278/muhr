-- License asset deliveries: tracks which vault assets a creator has delivered
-- to a brand for a given license request. The brand accesses files via
-- service-role signed URLs generated on demand — no file duplication.

create table if not exists public.license_deliveries (
  id            uuid primary key default gen_random_uuid(),
  license_request_id uuid not null references public.license_requests(id) on delete cascade,
  vault_asset_id     uuid not null references public.vault_assets(id) on delete cascade,
  delivered_by       uuid not null references auth.users(id) on delete cascade,
  delivered_at       timestamptz not null default now(),

  -- prevent duplicate deliveries of the same asset to the same request
  unique (license_request_id, vault_asset_id)
);

create index if not exists idx_license_deliveries_request
  on public.license_deliveries(license_request_id);

create index if not exists idx_license_deliveries_by_user
  on public.license_deliveries(delivered_by);

alter table public.license_deliveries enable row level security;

create policy "Creator can view own deliveries"
  on public.license_deliveries for select
  using (
    delivered_by = auth.uid()
    or exists (
      select 1 from public.license_requests lr
      where lr.id = license_request_id
        and lr.creator_id = auth.uid()
    )
  );

create policy "Creator can insert deliveries for own requests"
  on public.license_deliveries for insert
  with check (
    delivered_by = auth.uid()
    and exists (
      select 1 from public.license_requests lr
      where lr.id = license_request_id
        and lr.creator_id = auth.uid()
        and lr.status = 'accepted'
    )
  );

create policy "Brand can view deliveries for their requests"
  on public.license_deliveries for select
  using (
    exists (
      select 1 from public.license_requests lr
      where lr.id = license_request_id
        and (
          lr.brand_user_id = auth.uid()
          or (
            trim(coalesce(auth.jwt() ->> 'email', '')) <> ''
            and lower(trim(lr.brand_email)) = lower(trim(auth.jwt() ->> 'email'))
          )
        )
    )
  );

create policy "Creator can delete own deliveries"
  on public.license_deliveries for delete
  using (delivered_by = auth.uid());
