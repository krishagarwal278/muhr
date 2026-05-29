-- When a user signs up, attach prior public-form license requests sent with the same email.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);

  IF NEW.email IS NOT NULL AND trim(NEW.email) <> '' THEN
    UPDATE public.license_requests
    SET brand_user_id = NEW.id
    WHERE brand_user_id IS NULL
      AND lower(trim(brand_email)) = lower(trim(NEW.email));
  END IF;

  RETURN NEW;
END;
$$;

NOTIFY pgrst, 'reload schema';
