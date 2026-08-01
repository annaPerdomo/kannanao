-- Atomic shop purchase.
--
-- The client used to run three separate writes (deduct XP → insert purchase →
-- equip). A failure after the first write meant the XP was spent server-side
-- but the item never delivered, and the client could only roll back its local
-- state. This function does the whole purchase in one transaction, with the
-- progress row locked so two concurrent purchases (double-click, second tab)
-- can't both pass the balance check or double-deduct.
--
-- SECURITY INVOKER on purpose: it runs as the calling user, so the existing
-- RLS policies on user_progress / user_purchases / user_equipped keep applying.
--
-- This is not a price-enforcement boundary. p_price comes from the client, so a
-- user with a console can buy anything for zero — but they can already write
-- total_xp directly (see useProgress), so the whole XP economy is client-trusted
-- and moving prices server-side here would close half a door. Enforcing it means
-- moving XP awards behind the server too; until then, don't read this function
-- as protecting the balance.

CREATE OR REPLACE FUNCTION purchase_item(p_item_key text, p_price integer, p_slot text)
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_spendable integer;
  v_charged integer;
BEGIN
  IF v_user IS NULL THEN
    RETURN 'not_authenticated';
  END IF;
  IF p_price < 0 THEN
    RETURN 'invalid_price';
  END IF;

  SELECT total_xp - COALESCE(total_xp_spent, 0)
    INTO v_spendable
    FROM user_progress
   WHERE user_id = v_user
     FOR UPDATE;

  IF v_spendable IS NULL THEN
    RETURN 'no_progress_row';
  END IF;

  IF EXISTS (
    SELECT 1 FROM user_purchases WHERE user_id = v_user AND item_key = p_item_key
  ) THEN
    RETURN 'already_owned';
  END IF;

  IF v_spendable < p_price THEN
    RETURN 'insufficient_xp';
  END IF;

  UPDATE user_progress
     SET total_xp_spent = COALESCE(total_xp_spent, 0) + p_price
   WHERE user_id = v_user;

  -- FOR UPDATE above only proves the row is visible. If the UPDATE policy is
  -- narrower than the SELECT one, or the row vanished under us, the UPDATE
  -- affects 0 rows without raising — and falling through would hand over the
  -- item for free. Nothing is written yet, so returning here leaves no trace.
  GET DIAGNOSTICS v_charged = ROW_COUNT;
  IF v_charged <> 1 THEN
    RETURN 'no_progress_row';
  END IF;

  INSERT INTO user_purchases (user_id, item_key) VALUES (v_user, p_item_key);

  INSERT INTO user_equipped (user_id, slot, item_key)
  VALUES (v_user, p_slot, p_item_key)
  ON CONFLICT (user_id, slot) DO UPDATE SET item_key = EXCLUDED.item_key;

  RETURN 'ok';
END;
$$;

GRANT EXECUTE ON FUNCTION purchase_item(text, integer, text) TO authenticated;
