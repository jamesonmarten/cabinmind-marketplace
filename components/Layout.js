import Head from 'next/head';
import Header from './Header';

export default function Layout({ children, title = 'CabinMind Agents', fullBleed = false }) {
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="CabinMind AI Agent Marketplace – automate your business with powerful AI agents." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Header />
      <main className={fullBleed ? '' : 'pt-16'}>
        {children}
      </main>
    </>
  );
}