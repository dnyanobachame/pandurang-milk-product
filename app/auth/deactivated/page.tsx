import Link from 'next/link';

export default function DeactivatedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-xl2 shadow-sm border border-gray-100 p-8 text-center">
        <h1 className="text-xl font-semibold text-red-600 mb-2">
          Account Deactivated
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Your account has been deactivated. If you believe this is a
          mistake, please contact Pandurang Milk Product support.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          <a href="tel:7028591828" className="text-brand-700 font-medium">
            7028591828
          </a>{' '}
          ・{' '}
          <a
            href="mailto:milkpandurang@gmail.com"
            className="text-brand-700 font-medium"
          >
            milkpandurang@gmail.com
          </a>
        </p>
        <Link
          href="/auth/login"
          className="inline-block w-full rounded-full bg-brand-600 text-white py-2.5 font-medium hover:bg-brand-700"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
