-- Private bucket for the reference files an organizer attaches in Materials.
--
-- These used to travel as base64 inside the /api/group/lesson-plan JSON body,
-- which Vercel's ~4.5 MB function body cap rejected at around 3.3 MB of raw
-- file. They now go browser → Storage via a signed upload URL, and the route
-- reads them back with the service role.
--
-- Private on purpose: homework and worksheets carry student names and answers,
-- so this bucket must never become public and must not be folded into
-- card-images. No RLS policies are needed — every write is a signed upload URL
-- minted by the service role, and every read and delete is service-role only.
-- file_size_limit is storage's own backstop for a client that skips the
-- advisory size check; the combined-size cap lives in the app.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('lesson-documents', 'lesson-documents', false, 10485760,
        array['application/pdf', 'text/plain'])
on conflict (id) do nothing;
