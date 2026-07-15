# Legacy SQL

These are historical, one-off SQL scripts kept for reference only — they document how the schema evolved but are not applied automatically.

The shared Supabase schema source of truth and only executable migration path is
`shop-kiwimu-com/supabase/migrations/`. Map must not publish shared database
migrations.

Do not execute any file in this directory directly against a live database. If
a shared schema change is needed, write and validate a forward migration in the
Shop repository instead.
