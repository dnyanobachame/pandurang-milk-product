-- ============================================================
-- 14_delivery_transactions.sql
-- Atomic delivery workflow transactions
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ACCEPT DELIVERY
-- delivery assignment: assigned -> accepted
-- order delivery_status: assigned -> accepted
-- ============================================================

CREATE OR REPLACE FUNCTION public.accept_delivery(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_assignment public.delivery_assignments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND role = 'delivery_partner'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active delivery partners can accept deliveries.';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.delivery_assignments
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery assignment not found or not assigned to you.';
  END IF;

  IF v_assignment.status <> 'assigned' THEN
    RAISE EXCEPTION
      'Delivery cannot be accepted from status: %.',
      v_assignment.status;
  END IF;

  UPDATE public.delivery_assignments
  SET
    status = 'accepted',
    accepted_at = COALESCE(accepted_at, now())
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
    AND status = 'assigned';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery assignment could not be accepted.';
  END IF;

  UPDATE public.orders
  SET
    delivery_status = 'accepted',
    updated_at = now()
  WHERE id = v_assignment.order_id
    AND order_status = 'assigned'
    AND delivery_status = 'assigned';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order is not in the expected assigned state.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'order_id', v_assignment.order_id,
    'status', 'accepted'
  );
END;
$$;


-- ============================================================
-- 2. START DELIVERY
-- delivery assignment: accepted -> out_for_delivery
-- order: assigned -> out_for_delivery
-- ============================================================

CREATE OR REPLACE FUNCTION public.start_delivery(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_assignment public.delivery_assignments%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND role = 'delivery_partner'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active delivery partners can start deliveries.';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.delivery_assignments
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery assignment not found or not assigned to you.';
  END IF;

  IF v_assignment.status <> 'accepted' THEN
    RAISE EXCEPTION
      'Delivery cannot be started from status: %.',
      v_assignment.status;
  END IF;

  UPDATE public.delivery_assignments
  SET
    status = 'out_for_delivery',
    picked_up_at = COALESCE(picked_up_at, v_now),
    out_for_delivery_at = COALESCE(out_for_delivery_at, v_now)
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
    AND status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery assignment could not be started.';
  END IF;

  UPDATE public.orders
  SET
    order_status = 'out_for_delivery',
    delivery_status = 'out_for_delivery',
    updated_at = v_now
  WHERE id = v_assignment.order_id
    AND order_status = 'assigned'
    AND delivery_status = 'accepted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order is not in the expected accepted state.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'order_id', v_assignment.order_id,
    'status', 'out_for_delivery'
  );
END;
$$;


-- ============================================================
-- 3. REACH CUSTOMER
-- delivery assignment: out_for_delivery -> reached_customer
-- order delivery_status: out_for_delivery -> reached_customer
--
-- OTP generation remains in application code.
-- ============================================================

CREATE OR REPLACE FUNCTION public.reach_customer(
  p_assignment_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_assignment public.delivery_assignments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND role = 'delivery_partner'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Only active delivery partners can reach customers.';
  END IF;

  SELECT *
  INTO v_assignment
  FROM public.delivery_assignments
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery assignment not found or not assigned to you.';
  END IF;

  IF v_assignment.status <> 'out_for_delivery' THEN
    RAISE EXCEPTION
      'Customer cannot be reached from status: %.',
      v_assignment.status;
  END IF;

  UPDATE public.delivery_assignments
  SET
    status = 'reached_customer'
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
    AND status = 'out_for_delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery assignment could not be marked as reached.';
  END IF;

  UPDATE public.orders
  SET
    delivery_status = 'reached_customer',
    updated_at = now()
  WHERE id = v_assignment.order_id
    AND order_status = 'out_for_delivery'
    AND delivery_status = 'out_for_delivery';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order is not in the expected out-for-delivery state.';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'order_id', v_assignment.order_id,
    'status', 'reached_customer'
  );
END;
$$;


-- ============================================================
-- 4. CONFIRM DELIVERY TRANSACTION
--
-- Atomic:
--   OTP verification
--   delivery assignment -> delivered
--   order -> delivered
--   COD payment -> paid
--   cash collection
--
-- OTP uses the exact same SHA-256 algorithm as lib/otp.ts:
--
-- createHash('sha256').update(otp).digest('hex')
--
-- PostgreSQL equivalent:
--
-- encode(digest(otp, 'sha256'), 'hex')
-- ============================================================

CREATE OR REPLACE FUNCTION public.confirm_delivery_transaction(
  p_assignment_id uuid,
  p_otp text,
  p_cash_collected numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();

  v_assignment public.delivery_assignments%ROWTYPE;
  v_order public.orders%ROWTYPE;
  v_otp public.delivery_otp%ROWTYPE;
  v_payment public.payments%ROWTYPE;

  v_now timestamptz := now();
BEGIN

  -- ==========================================================
  -- Authentication / role
  -- ==========================================================

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND role = 'delivery_partner'
      AND is_active = true
  ) THEN
    RAISE EXCEPTION
      'Only active delivery partners can confirm deliveries.';
  END IF;


  -- ==========================================================
  -- Lock assignment
  -- ==========================================================

  SELECT *
  INTO v_assignment
  FROM public.delivery_assignments
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Delivery assignment not found or not assigned to you.';
  END IF;

  IF v_assignment.status <> 'reached_customer' THEN
    RAISE EXCEPTION
      'Delivery cannot be confirmed from status: %.',
      v_assignment.status;
  END IF;


  -- ==========================================================
  -- Lock order
  -- ==========================================================

  SELECT *
  INTO v_order
  FROM public.orders
  WHERE id = v_assignment.order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found.';
  END IF;

  IF v_order.order_status <> 'out_for_delivery' THEN
    RAISE EXCEPTION
      'Order is not ready for delivery confirmation. Current status: %.',
      v_order.order_status;
  END IF;

  IF v_order.delivery_status <> 'reached_customer' THEN
    RAISE EXCEPTION
      'Order delivery status is not reached_customer. Current status: %.',
      v_order.delivery_status;
  END IF;


  -- ==========================================================
  -- Validate OTP format
  -- ==========================================================

  IF p_otp IS NULL OR p_otp !~ '^[0-9]{4,8}$' THEN
    RAISE EXCEPTION 'Invalid OTP format.';
  END IF;


  -- ==========================================================
  -- Lock latest OTP
  -- ==========================================================

  SELECT *
  INTO v_otp
  FROM public.delivery_otp
  WHERE order_id = v_assignment.order_id
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Delivery OTP not found.';
  END IF;

  IF v_otp.is_verified THEN
    RAISE EXCEPTION 'Delivery OTP has already been used.';
  END IF;

  IF v_otp.expires_at <= v_now THEN
    RAISE EXCEPTION 'Delivery OTP has expired.';
  END IF;


  -- ==========================================================
  -- SHA-256 OTP verification
  --
  -- Node:
  -- createHash('sha256').update(otp).digest('hex')
  --
  -- PostgreSQL:
  -- encode(digest(otp, 'sha256'), 'hex')
  -- ==========================================================

  IF encode(digest(p_otp, 'sha256'), 'hex') <> v_otp.otp_hash THEN
    RAISE EXCEPTION 'Invalid delivery OTP.';
  END IF;


  -- ==========================================================
  -- COD validation
  -- ==========================================================

  IF v_order.payment_method = 'cod' THEN

    IF p_cash_collected IS NULL THEN
      RAISE EXCEPTION
        'Cash collected amount is required for COD.';
    END IF;

    IF p_cash_collected < 0 THEN
      RAISE EXCEPTION
        'Cash collected amount cannot be negative.';
    END IF;

    IF p_cash_collected <> v_order.total THEN
      RAISE EXCEPTION
        'Cash collected (₹%) does not match order total (₹%).',
        p_cash_collected,
        v_order.total;
    END IF;

  ELSE

    IF p_cash_collected IS NOT NULL
       AND p_cash_collected <> 0 THEN
      RAISE EXCEPTION
        'Cash collected must be zero for non-COD orders.';
    END IF;

  END IF;


  -- ==========================================================
  -- Lock payment row for COD
  -- ==========================================================

  IF v_order.payment_method = 'cod' THEN

    SELECT *
    INTO v_payment
    FROM public.payments
    WHERE order_id = v_assignment.order_id
      AND payment_method = 'cod'
    ORDER BY created_at DESC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'COD payment record not found.';
    END IF;

    IF v_payment.status = 'refunded' THEN
      RAISE EXCEPTION
        'COD payment has already been refunded.';
    END IF;

  END IF;


  -- ==========================================================
  -- OTP -> verified
  -- ==========================================================

  UPDATE public.delivery_otp
  SET
    is_verified = true,
    verified_at = v_now
  WHERE id = v_otp.id
    AND is_verified = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Delivery OTP could not be verified.';
  END IF;


  -- ==========================================================
  -- Assignment -> delivered
  -- ==========================================================

  UPDATE public.delivery_assignments
  SET
    status = 'delivered',
    delivered_at = v_now,
    cash_collected =
      CASE
        WHEN v_order.payment_method = 'cod'
        THEN p_cash_collected
        ELSE NULL
      END
  WHERE id = p_assignment_id
    AND delivery_partner_id = v_user_id
    AND status = 'reached_customer';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Delivery assignment could not be completed.';
  END IF;


  -- ==========================================================
  -- Order -> delivered
  -- ==========================================================

  UPDATE public.orders
  SET
    order_status = 'delivered',
    delivery_status = 'delivered',
    payment_status =
      CASE
        WHEN v_order.payment_method = 'cod'
        THEN 'paid'::payment_status
        ELSE payment_status
      END,
    updated_at = v_now
  WHERE id = v_assignment.order_id
    AND order_status = 'out_for_delivery'
    AND delivery_status = 'reached_customer';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Order could not be marked as delivered.';
  END IF;


  -- ==========================================================
  -- COD payment -> paid
  -- ==========================================================

  IF v_order.payment_method = 'cod' THEN

    UPDATE public.payments
    SET
      status = 'paid',
      paid_at = v_now,
      verified_by = v_user_id,
      verified_at = v_now
    WHERE id = v_payment.id
      AND status <> 'refunded';

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'COD payment could not be marked as paid.';
    END IF;

  END IF;


  -- ==========================================================
  -- Success
  -- ==========================================================

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', p_assignment_id,
    'order_id', v_assignment.order_id,
    'order_status', 'delivered',
    'delivery_status', 'delivered',
    'payment_status',
      CASE
        WHEN v_order.payment_method = 'cod'
        THEN 'paid'
        ELSE v_order.payment_status::text
      END,
    'cash_collected',
      CASE
        WHEN v_order.payment_method = 'cod'
        THEN p_cash_collected
        ELSE NULL
      END
  );

END;
$$;


-- ============================================================
-- Permissions
-- ============================================================

REVOKE ALL
ON FUNCTION public.accept_delivery(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.start_delivery(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.reach_customer(uuid)
FROM PUBLIC;

REVOKE ALL
ON FUNCTION public.confirm_delivery_transaction(uuid, text, numeric)
FROM PUBLIC;


GRANT EXECUTE
ON FUNCTION public.accept_delivery(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.start_delivery(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.reach_customer(uuid)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.confirm_delivery_transaction(uuid, text, numeric)
TO authenticated;


COMMIT;