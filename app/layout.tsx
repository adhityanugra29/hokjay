import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { CartProvider } from "@/components/cart/CartProvider";
import CartBar from "@/components/cart/CartBar";
import CatalogPrintDoc from "@/components/cart/CatalogPrintDoc";
import { CatalogSelectionProvider } from "@/components/katalog/CatalogSelectionProvider";
import { ActiveCustomerProvider } from "@/components/penjualan/ActiveCustomerProvider";
import { getSession } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const user = session ? { nama: session.nama, role: session.role } : null;

  // Sidebar badge counts (Invoice's "N", Inventory's "N tipis") — cheap
  // counts, only fetched once per request when there's someone to show them
  // to. See components/layout/AppShell.tsx / lib/nav.ts.
  let badgeCounts: { invoiceCount: number; lowStock: number } | undefined;
  if (user) {
    await dbConnect();
    const [invoiceCount, lowStock] = await Promise.all([
      Invoice.countDocuments({ status: { $in: ["draft", "unpaid"] } }),
      Product.countDocuments({ stok: { $lte: LOW_STOCK_THRESHOLD }, isCustom: { $ne: true } }),
    ]);
    badgeCounts = { invoiceCount, lowStock };
  }

  return (
    <html lang="id" className={archivo.variable}>
      <body className="min-h-screen bg-paper text-ink font-sans antialiased">
        <ActiveCustomerProvider>
          <CartProvider>
            <CatalogSelectionProvider>
              <AppShell user={user} badgeCounts={badgeCounts}>
                {children}
              </AppShell>
              {user && <CartBar />}
              {user && <CatalogPrintDoc />}
            </CatalogSelectionProvider>
          </CartProvider>
        </ActiveCustomerProvider>
      </body>
    </html>
  );
}
