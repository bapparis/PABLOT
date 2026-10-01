import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "PABLOT",
  description: "PABLOT — Earn, complete tasks and grow your rewards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />

        <Script
          src="https://sad.adsgram.ai/js/sad.min.js"
          strategy="afterInteractive"
        />

        <Script
          src="//libtl.com/sdk.js"
          data-zone="11934399"
          data-sdk="show_11934399"
          strategy="afterInteractive"
        />
        {children}
      </body>
    </html>
  );
}
