-- Product audit columns required by the product-management actions.
alter table public.products
  add column if not exists created_by uuid references auth.users(id),
  add column if not exists updated_by uuid references auth.users(id);

notify pgrst, 'reload schema';
