import Head from "next/head";
import dynamic from "next/dynamic";

/* The app loads her data from the server and depends on today's date, so it renders on the client only. */
const App = dynamic(() => import("@/components/Gate"), {
  ssr: false,
  loading: () => (
    <div className="grid min-h-dvh place-items-center">
      <span className="float text-5xl" aria-label="Loading">
        💗
      </span>
    </div>
  ),
});

export default function Home() {
  return (
    <>
      <Head>
        <title>D-Tracker</title>
        <meta name="description" content="A cycle tracker and comfort corner, built by an Engineer for a Doctor." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="D-Tracker" />
        <meta property="og:title" content="D-Tracker" />
        <meta property="og:description" content="A tracker for a Doctor." />
      </Head>
      <App />
    </>
  );
}
