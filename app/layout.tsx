import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import AppShell from "@/components/layout/AppShell";
import { CartProvider } from "@/components/cart/CartProvider";
import CartBar from "@/components/cart/CartBar";
import CatalogPrintDoc from "@/components/cart/CatalogPrintDoc";
import { CatalogSelectionProvider } from "@/components/katalog/CatalogSelectionProvider";
import { LoadingOverlayProvider } from "@/components/ui/LoadingOverlay";
import { DialogProvider } from "@/components/ui/Dialog";
import { getSession } from "@/lib/auth/session";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { getProdukBaruIds } from "@/lib/katalog";
import { invoiceVisibilityFilter } from "@/lib/invoice-visibility";
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
  // See components/layout/AppShell.tsx / components/layout/NavBadge.tsx /
  // lib/nav.ts. Inventory's badge switched from "stok tipis" to "produk
  // baru" (products added recently) per the user's request 2026-08-25.
  // Once a "new" product has sold at least once (any StockMovement with
  // alasan "Penjualan"), it no longer counts — per the user's follow-up
  // request 2026-08-25 ("jika produk baru sudah laku, badge akan
  // berkurang"). Shared definition (see lib/katalog.ts's getProdukBaruIds)
  // with the Katalog Filter sidebar's own "Produk Baru" filter, added
  // 2026-08-28.
  //
  // Deliberately NOT awaited here — this ran on every single navigation,
  // in front of the page's own content, for 3-4 extra MongoDB round trips
  // (session cookie is a cheap in-process JWT decrypt, this DB work is
  // the actual cost). Passed down as a bare Promise instead; AppShell's
  // NavBadge (a small Suspense-wrapped child, see that file) unwraps it
  // with React's use() so only the badge numbers themselves wait on
  // it — the nav structure and the page's own content render immediately.
  // Per the user's request 2026-08-28 ("optimalisasi... jangan rusak
  // apapun") — a targeted, low-risk streaming boundary was chosen over
  // touching any page's own rendering/caching behavior.
  let badgeCountsPromise: Promise<{ invoiceCount: number; produkBaru: number }> | undefined;
  if (user) {
    badgeCountsPromise = (async () => {
      await dbConnect();
      // Per-sales invoice privacy extends to this badge too — per the
      // user's report 2026-08-30 ("notif masih terlihat di semua akun,
      // tapi invoicenya sudah tidak ada"): this count had no sales-scoping
      // at all, so a sales rep saw a number that included other reps'
      // invoices even though opening one of those directly is already
      // correctly blocked.
      const [invoiceCount, produkBaruIds] = await Promise.all([
        Invoice.countDocuments({ status: { $in: ["draft", "unpaid"] }, ...invoiceVisibilityFilter(session) }),
        getProdukBaruIds(),
      ]);
      return { invoiceCount, produkBaru: produkBaruIds.size };
    })();
  }

  return (
    <html lang="id" className={archivo.variable}>
      <body className="min-h-screen bg-paper text-ink font-sans antialiased">
        <DialogProvider>
          <LoadingOverlayProvider>
            <CartProvider>
              <CatalogSelectionProvider>
                <AppShell user={user} badgeCounts={badgeCountsPromise}>
                  {children}
                </AppShell>
                {user && <CartBar />}
                {user && <CatalogPrintDoc user={user} />}
              </CatalogSelectionProvider>
            </CartProvider>
          </LoadingOverlayProvider>
        </DialogProvider>
      </body>
    </html>
  );
}
