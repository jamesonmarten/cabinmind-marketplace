import Head from 'next/head';
import Header from './Header';
import TeddyChat from './TeddyChat';

export default function Layout({ children, title = 'CabinMind Agents', fullBleed = false }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="CabinMind AI Agent Marketplace – automate your business with powerful AI agents." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </Head>
      <Header />
      <main className={fullBleed ? '' : 'pt-16'}>
        {children}
      </main>
      <TeddyChat />
    </>
  );
}