-- Incident categories and PPM job completion form uploads.

alter table public.incidents
  add column if not exists category text;

alter table public.ppm_schedules
  add column if not exists job_completion_url text;
