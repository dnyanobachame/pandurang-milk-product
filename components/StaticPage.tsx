export function StaticPage({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <a
        href="/"
        className="inline-flex min-h-10 items-center rounded-lg text-sm font-medium text-gray-500 transition-colors hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        <span aria-hidden="true">←</span>
        <span className="ml-1">
          Pandurang Milk Product
        </span>
      </a>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
        {title}
      </h1>

      <div className="prose prose-sm mt-6 max-w-none text-gray-700 sm:prose-base">
        {children}
      </div>
    </main>
  );
}