import Head from 'next/head';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Header from './Header';

const TeddyChat = dynamic(() => import('./TeddyChat'), { ssr: false });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://products.devcabin.tech';

function toAbsoluteUrl(path = '/') {
  const cleanPath = path.split('#')[0].split('?')[0] || '/';
  return `${SITE_URL.replace(/\/$/, '')}${cleanPath.startsWith('/') ? cleanPath : `/${cleanPath}`}`;
}

export default function Layout({
  children,
  title = 'CabinMind Agents',
  description = 'CabinMind AI Agent Marketplace to automate lead generation, sales, support, and WordPress growth workflows.',
  fullBleed = false,
  canonicalPath,
  noindex = false,
  schema = [],
}) {
  const router = useRouter();
  const [showChat, setShowChat] = useState(false);

  const path = canonicalPath || router.asPath || '/';
  const canonicalUrl = useMemo(() => toAbsoluteUrl(path), [path]);
  const shouldShowHeader = !router.pathname.startsWith('/embed/');
  const shouldShowChat = !router.pathname.startsWith('/admin') &&
    !router.pathname.startsWith('/dashboard') &&
    !router.pathname.startsWith('/embed/');

  useEffect(() => {
    if (!shouldShowChat) return;
    let timeoutId = null;
    let idleId = null;

    const show = () => setShowChat(true);
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(show, { timeout: 2000 });
    } else {
      timeoutId = setTimeout(show, 1200);
    }

    return () => {
      if (idleId && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [shouldShowChat]);

  const builtInSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'CabinMind',
      url: SITE_URL,
      sameAs: ['https://devcabin.tech'],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'CabinMind',
      url: SITE_URL,
      inLanguage: 'en',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_URL}/agents?search={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: title,
      description,
      url: canonicalUrl,
      isPartOf: {
        '@type': 'WebSite',
        name: 'CabinMind',
        url: SITE_URL,
      },
    },
  ];

  const schemaBlocks = [...builtInSchema, ...schema];

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'} />
        <meta name="theme-color" content="#0b1220" />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="CabinMind" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://connect.facebook.net" />
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        {schemaBlocks.map((block, idx) => (
          <script
            key={`schema-${idx}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(block) }}
          />
        ))}
      </Head>
      {shouldShowHeader && <Header />}
      <main className={fullBleed ? '' : 'pt-16'}>
        {children}
      </main>
      {showChat && shouldShowChat && <TeddyChat />}
    </>
  );
}