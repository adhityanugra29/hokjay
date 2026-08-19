import type { Metadata } from "next";
import { Fraunces, Space_Grotesk, IBM_Plex_Mono } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { CartProvider } from "@/components/cart/CartProvider";
import CartBar from "@/components/cart/CartBar";
import CatalogPrintDoc from "@/components/cart/CatalogPrintDoc";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CV HORECA JAYA — Kelola Usaha",
  description: "Aplikasi kelola usaha internal CV HORECA JAYA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${fraunces.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}
    >
      <body className="min-h-screen bg-paper text-ink font-sans antialiased">
        <CartProvider>
          <AppShell>{children}</AppShell>
          <CartBar />
          <CatalogPrintDoc />
        </CartProvider>
      </body>
    </html>
  );
}
