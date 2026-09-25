-- ============================================================================
-- DEMO / SEED DATA
-- NOTE: These are placeholder demo values only. Admin must configure real
-- prices, contact details, and delivery areas before going live.
-- ============================================================================

insert into company_settings (company_name, tagline, phone, email, address, upi_id, cod_enabled, qr_payment_enabled, default_delivery_fee, free_delivery_above)
values (
  'Pandurang Milk Product',
  'Fresh. Pure. Trusted.',
  '+91-7028591828',       -- Pandurang Milk Product contact
  'milkpandurang@gmail.com',
  'Latur District, Maharashtra',
  '7028591828-6@ybl',      -- Pandurang Milk Product UPI ID
  true,
  true,
  30,
  500
);

insert into delivery_areas (city_or_village, pin_code, is_active, delivery_fee, min_order_amount) values
  ('Latur',              '413512', true, 0,  0),
  ('Ausa',               '413520', true, 30, 0),
  ('Nilanga',            '413521', true, 30, 0),
  ('Udgir',              '413517', true, 40, 0),
  ('Ahmedpur',           '413515', true, 40, 0),
  ('Chakur',             '413526', false, 40, 0),
  ('Renapur',            '413527', false, 40, 0),
  ('Deoni',              '413519', false, 40, 0),
  ('Jalkot',             '413531', false, 40, 0),
  ('Shirur Anantpal',    '413613', false, 40, 0);

insert into product_categories (name, name_marathi, sort_order) values
  ('Milk',           'दूध',        1),
  ('Curd & Buttermilk', 'दही व ताक', 2),
  ('Paneer & Cream', 'पनीर व मलई',  3),
  ('Ghee & Butter',  'तूप व लोणी',  4),
  ('Other',          'इतर',        5);

-- demo products (editable by Admin; treat prices as placeholders)
insert into products (name, name_marathi, category_id, sku, product_code, unit, net_quantity, selling_price, mrp, available_quantity, min_stock_level, shelf_life_days, is_active)
select 'Pandurang Cow Milk 500ml', 'पांडुरंग गाईचे दूध ५०० मिली', id, 'PM-CM-500', 'CM500', 'ml', 500, 35, 40, 0, 200, 2, true
from product_categories where name = 'Milk';

insert into products (name, name_marathi, category_id, sku, product_code, unit, net_quantity, selling_price, mrp, available_quantity, min_stock_level, shelf_life_days, is_active)
select 'Pandurang Cow Milk 1 Litre', 'पांडुरंग गाईचे दूध १ लिटर', id, 'PM-CM-1000', 'CM1000', 'ml', 1000, 65, 72, 0, 150, 2, true
from product_categories where name = 'Milk';

insert into products (name, name_marathi, category_id, sku, product_code, unit, net_quantity, selling_price, mrp, available_quantity, min_stock_level, shelf_life_days, is_active)
select 'Pandurang Curd 500g', 'पांडुरंग दही ५०० ग्रॅम', id, 'PM-CD-500', 'CD500', 'g', 500, 50, 55, 0, 100, 5, true
from product_categories where name = 'Curd & Buttermilk';

insert into products (name, name_marathi, category_id, sku, product_code, unit, net_quantity, selling_price, mrp, available_quantity, min_stock_level, shelf_life_days, is_active)
select 'Pandurang Buttermilk 500ml', 'पांडुरंग ताक ५०० मिली', id, 'PM-BM-500', 'BM500', 'ml', 500, 25, 28, 0, 100, 3, true
from product_categories where name = 'Curd & Buttermilk';

insert into products (name, name_marathi, category_id, sku, product_code, unit, net_quantity, selling_price, mrp, available_quantity, min_stock_level, shelf_life_days, is_active)
select 'Pandurang Paneer 200g', 'पांडुरंग पनीर २०० ग्रॅम', id, 'PM-PN-200', 'PN200', 'g', 200, 90, 100, 0, 50, 5, true
from product_categories where name = 'Paneer & Cream';

insert into products (name, name_marathi, category_id, sku, product_code, unit, net_quantity, selling_price, mrp, available_quantity, min_stock_level, shelf_life_days, is_active)
select 'Pandurang Ghee 500ml', 'पांडुरंग तूप ५०० मिली', id, 'PM-GH-500', 'GH500', 'ml', 500, 350, 380, 0, 30, 180, true
from product_categories where name = 'Ghee & Butter';

insert into expense_categories (name) values
  ('Raw Milk Purchase'), ('Packaging'), ('Transport'), ('Fuel'),
  ('Electricity'), ('Salaries'), ('Maintenance'), ('Marketing'), ('Rent'), ('Other');

-- Demo suppliers
insert into suppliers (supplier_code, name, mobile, village, is_active) values
  ('SUP-001', 'Ram Jadhav', '+91-XXXXXXXXXX', 'Anand Nagar, Latur', true),
  ('SUP-002', 'Suresh Patil', '+91-XXXXXXXXXX', 'Ausa', true);

-- NOTE: profiles/customers/orders are NOT seeded here because they require
-- corresponding auth.users rows created through Supabase Auth signup flow.
-- Create a first Admin user via Supabase Auth, then run:
--   update profiles set role = 'admin' where email = 'you@example.com';
