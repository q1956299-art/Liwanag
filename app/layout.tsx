import type { Metadata } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { Toaster } from 'sonner';
import { Footer } from '@/ui/components/footer';
import { Navbar } from '@/ui/components/navbar';
import { WalletProvider } from '@/ui/wallet/wallet-context';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
  axes: ['opsz'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'),
  title: {
    default: 'Liwanag — Charity money, brought to light',
    template: '%s · Liwanag',
  },
  description:
    'Liwanag is a public, on-chain transparency ledger for charity campaigns on Stellar. Every donation and every payout is a verifiable transaction — no black boxes.',
  icons: { icon: [{ url: '/icon.svg', type: 'image/svg+xml' }] },
  openGraph: {
    title: 'Liwanag — Charity money, brought to light',
    description:
      'A public on-chain ledger for charity. Donations and payouts you can verify on Stellar.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-screen antialiased">
        <WalletProvider>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster richColors position="top-center" />
        </WalletProvider>
      </body>
    </html>
  );
}
