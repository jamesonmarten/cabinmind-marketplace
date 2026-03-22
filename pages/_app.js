import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';

// ─── Tracking IDs ────────────────────────────────────────────────────────────
const GA4_ID     = process.env.NEXT_PUBLIC_GA4_ID     || '';   // G-V2TT0W7L2G
const META_PIXEL = process.env.NEXT_PUBLIC_META_PIXEL || '';   // optional — add later

// ─── Helpers (exported so success.js can fire conversion events) ─────────────

/** Send a GA4 event via gtag */
export function gtagEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.gtag) return;
  window.gtag('event', eventName, params);
}

/** Fire a Meta Pixel event (no-op if pixel not configured yet) */
export function pixelEvent(eventName, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', eventName, params);
}

/** Alias kept so checkout/success.js import still works */
export const gtmEvent = gtagEvent;

/** Capture UTM params from URL and persist to sessionStorage */
function captureUTMs() {
  try {
    const params = new URLSearchParams(window.location.search);
    const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
    const captured = {};
    UTM_KEYS.forEach(k => { if (params.get(k)) captured[k] = params.get(k); });
    if (Object.keys(captured).length) {
      sessionStorage.setItem('cabinmind_utms', JSON.stringify(captured));
    }
  } catch {}
}

/** Read stored UTMs (called by useCheckout to pass into Stripe metadata) */
export function getStoredUTMs() {
  try { return JSON.parse(sessionStorage.getItem('cabinmind_utms') || '{}'); } catch { return {}; }
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Capture UTMs once on load
  useEffect(() => { captureUTMs(); }, []);

  // Fire page_view on every client-side navigation
  useEffect(() => {
    const handleRoute = (url) => {
      if (GA4_ID && window.gtag) {
        window.gtag('config', GA4_ID, { page_path: url });
      }
      if (window.fbq) window.fbq('track', 'PageView');
    };
    router.events.on('routeChangeComplete', handleRoute);
    return () => router.events.off('routeChangeComplete', handleRoute);
  }, [router.events]);

  return (
    <>
      {/* ── Google Analytics 4 — direct gtag (no GTM needed) ── */}
      {GA4_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA4_ID}', { send_page_view: true });
            `}
          </Script>
        </>
      )}

      {/* ── Meta Pixel — optional, add NEXT_PUBLIC_META_PIXEL to Vercel when ready ── */}
      {META_PIXEL && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
            n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;
            s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
            (window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init','${META_PIXEL}');
            fbq('track','PageView');
          `}
        </Script>
      )}

      <Component {...pageProps} />
    </>
  );
}