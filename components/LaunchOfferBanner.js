/**
 * components/LaunchOfferBanner.js
 * Signup-friction reducer: surfaces the active perks (launch discount,
 * bonus leads, referral program) at the top of pricing/demo/landing pages.
 */
import { useRouter } from 'next/router';

export default function LaunchOfferBanner({ className = '' }) {
  const router = useRouter();
  const isReferred = typeof router?.query?.ref === 'string';

  return (
    <div className={`mx-auto max-w-3xl mb-10 rounded-2xl border px-5 py-4 text-center ${
      isReferred
        ? 'border-green-500/30 bg-green-500/10'
        : 'border-brand-500/30 bg-brand-500/10'
    } ${className}`}>
      {isReferred ? (
        <p className="text-sm sm:text-base text-green-300 font-semibold">
          🎁 You were referred — your first month is <span className="underline">100% free</span> on any monthly plan.
        </p>
      ) : (
        <p className="text-sm sm:text-base text-brand-200 font-semibold">
          🚀 Launch offer — <span className="underline">50% off your first month</span>, plus <span className="underline">+50 bonus leads</span> on any Lead Researcher plan. No setup calls, no contracts.
        </p>
      )}
      <p className="text-xs text-gray-400 mt-1">
        Discount applies automatically at checkout · refer a friend and you both get a free month
      </p>
    </div>
  );
}
