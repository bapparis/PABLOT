import type { Metadata } from "next";
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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
