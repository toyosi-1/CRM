-- Requests can be linked to an incident that was logged first in the Incidents log.
alter table public.requests add column if not exists linked_incident_id text;
