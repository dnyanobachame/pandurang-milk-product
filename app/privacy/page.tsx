import { StaticPage } from '@/components/StaticPage';

export const metadata = { title: 'Privacy Policy | Mauli Milk and Products' };

export default function PrivacyPage() {
  return (
    <StaticPage title="Privacy Policy">
      <p className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800">
        Draft template — have this reviewed against India&apos;s Digital Personal Data
        Protection Act before publishing.
      </p>
      <h2 className="text-lg font-medium">What we collect</h2>
      <p>
        Name, mobile number, email, delivery addresses, order history, and payment status
        (never full card/bank details — we don&apos;t collect or store those). If you opt in
        to WhatsApp updates, we use your mobile number to send order notifications through
        the WhatsApp Business API.
      </p>
      <h2 className="text-lg font-medium">How we use it</h2>
      <p>
        To fulfil and deliver your orders, verify payments, provide customer support, and
        send order/delivery updates through the channels you&apos;ve opted into (in-app,
        WhatsApp, push notifications).
      </p>
      <h2 className="text-lg font-medium">Who can see it</h2>
      <p>
        Only staff whose role requires it — for example, a delivery partner sees the address
        and phone number for orders assigned to them, not your full order history. Row-level
        access controls enforce this at the database level.
      </p>
      <h2 className="text-lg font-medium">Your choices</h2>
      <p>
        You can update or delete your saved addresses, opt out of WhatsApp updates, and
        disable push notifications at any time from your account.
      </p>
    </StaticPage>
  );
}
