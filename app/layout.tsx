import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { CartProvider } from "@/components/cart/CartProvider";
import CartBar from "@/components/cart/CartBar";
import CatalogPrintDoc from "@/components/cart/CatalogPrintDoc";
import { CatalogSelectionProvider } from "@/components/katalog/CatalogSelectionProvider";
import { LoadingOverlayProvider } from "@/components/ui/LoadingOverlay";
import { getSession } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
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

  // Sidebar badge counts (Invoice's "N", Inventory's "N Produk Baru") —
  // cheap counts, only fetched once per request when there's someone to
  // show them to. See components/layout/AppShell.tsx / lib/nav.ts.
  // Inventory's badge switched from "stok tipis" to "produk baru" (products
  // added in the last 7 days) per the user's request 2026-08-25. Once a
  // "new" product has sold at least once (any StockMovement with alasan
  // "Penjualan"), it no longer counts — per the user's follow-up request
  // 2026-08-25 ("jika produk baru sudah laku, badge akan berkurang").
  let badgeCounts: { invoiceCount: number; produkBaru: number } | undefined;
  if (user) {
    await dbConnect();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [invoiceCount, soldProductIds] = await Promise.all([
      Invoice.countDocuments({ status: { $in: ["draft", "unpaid"] } }),
      StockMovement.distinct("product", { alasan: "Penjualan" }),
    ]);
    const produkBaru = await Product.countDocuments({
      createdAt: { $gte: sevenDaysAgo },
      isCustom: { $ne: true },
      _id: { $nin: soldProductIds },
    });
    badgeCounts = { invoiceCount, produkBaru };
  }

  return (
    <html lang="id" className={archivo.variable}>
      <body className="min-h-screen bg-paper text-ink font-sans antialiased">
        <LoadingOverlayProvider>
          <CartProvider>
            <CatalogSelectionProvider>
              <AppShell user={user} badgeCounts={badgeCounts}>
                {children}
              </AppShell>
              {user && <CartBar />}
              {user && <CatalogPrintDoc user={user} />}
            </CatalogSelectionProvider>
          </CartProvider>
        </LoadingOverlayProvider>
      </body>
    </html>
  );
}
