import KatalogClient from "@/components/katalog/KatalogClient";
import { dbConnect } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { getSession } from "@/lib/auth/session";
import { getProductInvoiceStatusMap, getProdukBaruIds, getKategoriKomisiBekasMap } from "@/lib/katalog";
import { resolveKomisiBekasPercent } from "@/lib/commission";

export const dynamic = "force-dynamic";

// Only these roles get the inline "edit product" pencil on each Katalog
// card — per the user's request 2026-08-27, to fix data mistakes spotted
// while browsing without leaving for Inventory.
const CAN_EDIT_PRODUCT_ROLES = ["manager", "owner", "super_admin"];
// Flash Sale is Owner-only ("top down dari owner") — super_admin included
// too, matching the server-side check in
// app/api/products/[id]/flash-sale/route.ts. Per the user's request
// 2026-08-29.
const CAN_FLASH_SALE_ROLES = ["owner", "super_admin"];

export default async function KatalogPage() {
  await dbConnect();
  const session = await getSession();
  const canEditProduct = !!session && CAN_EDIT_PRODUCT_ROLES.includes(session.role);
  const canFlashSale = !!session && CAN_FLASH_SALE_ROLES.includes(session.role);
  const [products, categories, statusMap, produkBaruIds, kategoriKomisiBekasMap] = await Promise.all([
    // Custom-order products live on their own page (/katalog/custom) so
    // they don't clutter the regular stocked catalog — see confirmation
    // with the user 2026-08-19. Sold-out (stok 0) products are hidden too
    // — per the user's request 2026-08-25 — mirroring the same "hide, don't
    // delete" convention already used on Inventory's list (the stock/history
    // data stays intact, it just doesn't show here to browse/sell). Since
    // 2026-08-27 stok only reaches 0 once a product is genuinely paid/SOLD
    // out (Booked/Sudah DP invoices no longer touch it), so this still does
    // exactly what the user asked ("jika stock = 0, hide dari katalog").
    Product.find({ isCustom: { $ne: true }, stok: { $gt: 0 } })
      .sort({ name: 1 })
      .lean(),
    Category.find().sort({ name: 1 }).lean(),
    // Booked / Sudah DP / SOLD status per product — see lib/katalog.ts.
    // Replaces the old plain "Sudah Terjual" boolean (now SOLD xx, an
    // actual historical count) per the user's request 2026-08-27.
    getProductInvoiceStatusMap(),
    // "Produk Baru" — powers the Filter sidebar's "Hanya Produk Baru"
    // checkbox, same definition as the Inventory nav badge. Per the
    // user's request 2026-08-28.
    getProdukBaruIds(),
    // Category defaults for the barang-bekas commission override — see
    // resolveKomisiBekasPercent() below. Per the user's request 2026-09-03.
    getKategoriKomisiBekasMap(),
  ]);

  return (
    <KatalogClient
      canEditProduct={canEditProduct}
      canFlashSale={canFlashSale}
      categories={categories.map((c) => c.name)}
      products={products.map((p) => {
        const status = statusMap.get(String(p._id));
        return {
          _id: String(p._id),
          name: p.name,
          sku: p.sku,
          category: p.category,
          hargaRekomendasi: p.hargaRekomendasi,
          hargaMinimum: p.hargaMinimum,
          komisiPercent: p.komisiPercent,
          komisiNominal: p.komisiNominal,
          stok: p.stok,
          kondisi: p.kondisi ?? "baru",
          kondisiPercent: p.kondisiPercent ?? undefined,
          dimensi: p.dimensi ?? undefined,
          ketebalan: p.ketebalan ?? undefined,
          dayaListrik: p.dayaListrik ?? undefined,
          fotoUrl: p.fotoUrl ?? undefined,
          isCustom: p.isCustom ?? false,
          // Sent to everyone (not gated to canEditProduct) — powers the
          // Electric/Non-Electric filter in KatalogFilterSidebar. Per the
          // user's request 2026-08-27.
          tipeProduk: (p.tipeProduk as "elektronik" | "non-elektronik") ?? undefined,
          // Sent to everyone (not gated to canEditProduct) — shown right in
          // the card title (see productDisplayName() in ProductCard.tsx),
          // not just the edit form. Found while wiring TASK-005: this was
          // stuck inside the canEditProduct-only block below, so a Sales
          // rep's own Katalog view never got the Merk data to show at all.
          // Per the user's request 2026-09-02 ("kulkas hosizaki...").
          merk: p.merk ?? undefined,
          // Effective barang-bekas commission rate — resolved server-side
          // (product override -> category default -> global 10%), sent to
          // everyone since it drives the live commission preview on the
          // card. Per the user's request 2026-09-03.
          komisiBekasPercent: resolveKomisiBekasPercent(
            p.komisiBekasPercent,
            kategoriKomisiBekasMap.get(p.category)
          ),
          // Only sent for roles that actually see the edit pencil — feeds
          // EditProductDrawer directly with zero extra fetch. Per the
          // user's report 2026-08-27 that opening it felt slow.
          ...(canEditProduct && {
            tanggalBarangMasuk: p.tanggalBarangMasuk ? new Date(p.tanggalBarangMasuk).toISOString() : undefined,
            stokMinimum: p.stokMinimum ?? undefined,
            alertHariTidakTerjual: p.alertHariTidakTerjual ?? undefined,
            fotoSampingUrl: p.fotoSampingUrl ?? undefined,
            fotoBelakangUrl: p.fotoBelakangUrl ?? undefined,
            deskripsi: p.deskripsi ?? undefined,
          }),
          // The RAW per-product override (not the resolved one above) —
          // only for Owner/Super Admin, so EditProductDrawer's form shows
          // the actual stored value. Per the user's request 2026-09-03.
          ...(canFlashSale && { komisiBekasOverride: p.komisiBekasPercent ?? undefined }),
          bookedQty: status?.bookedQty ?? 0,
          bookedBy: status?.bookedBy ?? [],
          dpQty: status?.dpQty ?? 0,
          dpBy: status?.dpBy ?? [],
          soldQty: status?.soldQty ?? 0,
          isBaru: produkBaruIds.has(String(p._id)),
          // Sent to everyone (not gated to canFlashSale) — every viewer
          // needs to see the locked price/banner, only the button to
          // change it is owner-only. Per the user's request 2026-08-29.
          flashSale: p.flashSale?.active
            ? { active: true as const, harga: p.flashSale.harga ?? 0 }
            : undefined,
        };
      })}
    />
  );
}
