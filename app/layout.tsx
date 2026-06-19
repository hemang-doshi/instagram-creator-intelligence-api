import type { Metadata } from "next";

import { getPublicAppName } from "@/lib/env";

import "./globals.css";

const appName = getPublicAppName();

export const metadata: Metadata = {
  title: appName,
  description: "Minimal Instagram Creator Intelligence API for Custom GPT Actions.",
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
