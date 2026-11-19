-- Billing customer IDs are server-owned. RLS row ownership does not protect
-- individual columns: authenticated users can otherwise bind a victim's Stripe
-- customer to their own profile and access billing/plan through Edge Functions.
-- Apply together with the billing Edge Functions, after verifying existing data.
CREATE OR REPLACE FUNCTION public.protect_stripe_customer_binding()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF TG_OP = 'INSERT' AND NEW.stripe_customer_id IS NOT NULL THEN
      RAISE EXCEPTION 'Stripe customer binding is managed by the billing service';
    END IF;
    IF TG_OP = 'UPDATE' AND NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id THEN
      RAISE EXCEPTION 'Stripe customer binding is managed by the billing service';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_stripe_customer_binding_on_profiles ON public.profiles;
CREATE TRIGGER protect_stripe_customer_binding_on_profiles
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_stripe_customer_binding();
