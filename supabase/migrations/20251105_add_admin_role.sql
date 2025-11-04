INSERT INTO public.user_roles (id, user_id, role, created_at)
VALUES (
  gen_random_uuid(),
  '5c3b5235-2e98-4140-b379-6d54082cd155',  -- <- wklej swój UUID z tabeli profiles
  'admin',
  now()
);
