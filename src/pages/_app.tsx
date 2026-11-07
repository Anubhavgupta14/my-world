import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { Caveat, DM_Sans, Fredoka } from "next/font/google";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const caveat = Caveat({
  subsets: ["latin"],
  variable: "--font-caveat",
  display: "swap",
});

const fontVars = [fredoka.variable, dmSans.variable, caveat.variable];

export default function App({ Component, pageProps }: AppProps) {
  // Sheets are portalled to <body>, so the font variables live on <html> too.
  useEffect(() => {
    document.documentElement.classList.add(...fontVars, "font-body");
  }, []);

  return (
    <div className={`${fredoka.variable} ${dmSans.variable} ${caveat.variable} font-body`}>
      <Component {...pageProps} />
    </div>
  );
}
