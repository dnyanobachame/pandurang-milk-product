'use client';

import { useRouter } from 'next/navigation';

import {
  ProductForm,
  type EditableProduct,
  type ProductCategoryOption,
} from '@/components/admin/ProductForm';

export function ProductDetailEditor({
  product,
  categories,
}: {
  product: EditableProduct;
  categories: ProductCategoryOption[];
}) {
  const router = useRouter();

  return (
    <ProductForm
      product={product}
      categories={categories}
      onClose={() => router.push('/admin/products')}
      onSaved={() => {
        router.push('/admin/products');
        router.refresh();
      }}
    />
  );
}
