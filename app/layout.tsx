import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { CartProvider } from "@/components/cart/CartProvider";
import CartBar from "@/components/cart/CartBar";
import CatalogPrintDoc from "@/components/cart/CatalogPrintDoc";
import { CatalogSelectionProvider } from "@/components/katalog/CatalogSelectionProvider";
import { ActiveCustomerProvider } from "@/components/penjualan/ActiveCustomerProvider";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "600", "800"],
});

export const metadata: Metadata = {
  title: "CV HORECA JAYA — Kelola Usaha",
  description: "Aplikasi kelola usaha internal CV HORECA JAYA",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={archivo.variable}>
      <body className="min-h-screen bg-paper text-ink font-sans antialiased">
        <ActiveCustomerProvider>
          <CartProvider>
            <CatalogSelectionProvider>
              <AppShell>{children}</AppShell>
              <CartBar />
              <CatalogPrintDoc />
            </CatalogSelectionProvider>
          </CartProvider>
        </ActiveCustomerProvider>
      </body>
    </html>
  );
}
