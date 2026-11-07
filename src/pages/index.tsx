import Head from "next/head";
import Universe from "@/components/Universe";

export default function Home() {
  return (
    <>
      <Head>
        <title>A Little Universe for Doctor 💗</title>
        <meta name="description" content="A tiny handmade universe, built by an Engineer for a Doctor." />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta property="og:title" content="A Little Universe for Doctor 💗" />
        <meta property="og:description" content="An Engineer built something… and for once, it's not a software project." />
      </Head>
      <Universe />
    </>
  );
}
