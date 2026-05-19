import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { StarknetProvider } from "./providers";
import { WalletBar } from "./components/WalletBar";
import { Footer } from "./components/Footer";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OrdinalSync — Trustless Bitcoin Ordinals on Starknet",
    template: "%s | OrdinalSync",
  },
  description: "Tokenize Bitcoin inscriptions, runes, and rare sats on Starknet. No custody, no bridges, no trust.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-white">
        <StarknetProvider>
          <header className="border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="text-lg font-bold text-orange-500 hover:text-orange-400 transition-colors">
                OrdinalSync
              </Link>
              <nav className="hidden sm:flex items-center gap-4 text-sm text-gray-400">
                <Link href="/#explorer" className="hover:text-white transition-colors">Explorer</Link>
                <Link href="/tokenize" className="hover:text-white transition-colors">Tokenize</Link>
              </nav>
            </div>
            <WalletBar />
          </header>
          <div className="flex-1">{children}</div>
          <Footer />
        </StarknetProvider>
      </body>
    </html>
  );
}
