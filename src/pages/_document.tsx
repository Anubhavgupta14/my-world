import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="theme-color" content="#2a1d4e" />
        {/* A personal page: keep it out of search engines. */}
        <meta name="robots" content="noindex, nofollow" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </Head>
      <body className="antialiased">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
