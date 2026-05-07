-- Aggregated login stats per user (avoids fetching all rows client-side)
CREATE OR REPLACE FUNCTION login_stats_per_user()
RETURNS TABLE (
  user_id uuid,
  last_login_at timestamptz,
  total_logins bigint,
  logins_30d bigint
) AS $$
  SELECT
    le.user_id,
    max(le.logged_in_at) AS last_login_at,
    count(*) AS total_logins,
    count(*) FILTER (WHERE le.logged_in_at >= now() - interval '30 days') AS logins_30d
  FROM login_events le
  GROUP BY le.user_id
$$ LANGUAGE sql STABLE SECURITY DEFINER;
