export type Product = {
  id: string;
  name: string;
  name_marathi: string | null;
  category_id: string | null;
  sku: string;
  unit: string;
  net_quantity: number | null;
  selling_price: number;
  mrp: number | null;
  image_url: string | null;
  available_quantity: number;
  min_stock_level?: number;
  delivery_available: boolean;
  is_active: boolean;
};

export type ProductCategory = {
  id: string;
  name: string;
  name_marathi: string | null;
};

export type CartItem = {
  productId: string;
  name: string;
  unit: string;
  netQuantity: number | null;
  price: number;
  quantity: number;
};

export type CustomerAddress = {
  id: string;
  label: string;
  address_line: string;
  village_city: string;
  taluka: string | null;
  district: string;
  pin_code: string;
  is_default: boolean;
};
