import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tempo Receive Policies",
  description:
    "Configure account-level receive policies on Tempo. Blocklist TIP-20 tokens, watch blocked receipts, and reclaim held funds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
