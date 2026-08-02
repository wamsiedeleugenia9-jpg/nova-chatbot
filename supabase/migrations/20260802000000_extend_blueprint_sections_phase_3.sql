alter table public.blueprint_sections
  add column if not exists interpreted_summary text,
  add column if not exists key_elements jsonb;

comment on column public.blueprint_sections.interpreted_summary is
  'Generated summary of the answers in this atelier.';

comment on column public.blueprint_sections.key_elements is
  'Generated key elements for this atelier, stored as a JSON array.';
