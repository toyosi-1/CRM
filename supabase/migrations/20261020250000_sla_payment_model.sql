-- SLA billing model: prepaid annual contract vs pay-per-service
alter table public.facility_vendor_slas
  add column if not exists payment_model text not null default 'per_service';
