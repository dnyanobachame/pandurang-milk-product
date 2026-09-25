export function StaticPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <a href="/" className="text-sm text-gray-500 hover:text-brand-700">← Pandurang Milk Product</a>
      <h1 className="text-2xl font-semibold mt-3 mb-6">{title}</h1>
      <div className="prose prose-sm max-w-none text-gray-700 space-y-4">{children}</div>
    </main>
  );
}
