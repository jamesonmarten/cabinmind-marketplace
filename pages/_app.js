import '../styles/globals.css';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';

// ─── Tracking IDs ─────────────────────────────────────────────────────────────
// Replace these placeholders with your real IDs from Google Tag Manager
// and Meta Events Manager before going live with ads.
const GTM_ID      = process.env.NEXT_PUBLIC_GTM_ID      || 'GTM-XXXXXXX';   // Google Tag Manager
const META_PIXEL  = process.env.NEXT_PUBLIC_META_PIXEL  || 'XXXXXXXXXXXXXXX'; // Meta Pixel ID
const GA4_ID      = process.env.NEXT_PUBLIC_GA4_ID      || 'G-XXXXXXXXXX';   // GA4 Measurement ID

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Push an event to dataLayer (used by GTM → GA4 + Google Ads) */
export function gtmEvent(event, params = {}) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/** Fire a Meta Pixel standard or custom event */
export function pixelEvent(event, params = {}) {
  if (typeof window === 'undefined' || !window.fbq) return;
  window.fbq('track', event, params);
}

/** Capture UTM params from URL and persist to sessionStorage */
function captureUTMs() {
  try {
    const params = new URLSearchParams(window.location.search);
    const UTM_KEYS = ['utm_source','utm_medium','utm_campaign','utm_content','utm_term','gclid','fbclid'];
    const captured = {};
    UTM_KEYS.forEach(k => { if (params.get(k)) captured[k] = params.get(k); });
    if (Object.keys(captured).length) {
      sessionStorage.setItem('cabinmind_utms', JSON.stringify(captured));
    }
  } catch {}
}

/** Read stored UTMs (used at checkout to pass to Stripe metadata) */
export function getStoredUTMs() {
  try { return JSON.parse(sessionStorage.getItem('cabinmind_utms') || '{}'); } catch { return {}; }
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Capture UTMs on first load
  useEffect(() => { captureUTMs(); }, []);

  // Fire page_view on every client-side route change
  useEffect(() => {
    const handleRoute = (url) => {
      gtmEvent('page_view', { page_path: url });
      if (typeof window !== 'undefined' && window.fbq) {
        window.fbq('track', 'PageView');
      }
    };
    router.events.on('routeChangeComplete', handleRoute);
    return () => router.events.off('routeChangeComplete', handleRoute);
  }, [router.events]);

  return (
    <>
      {/* ── Google Tag Manager — fires before page renders ── */}
      <Script id="gtm-script" strategy="afterInteractive">
        {`
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${GTM_ID}');
        `}
      </Script>

      {/* ── Meta Pixel ── */}
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL}');
          fbq('track', 'PageView');
        `}
      </Script>

      {/* ── GTM noscript fallback ── */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
          height="0" width="0"
          style={{ display: 'none', visibility: 'hidden' }}
        />
      </noscript>

      <Component {...pageProps} />
    </>
  );
}