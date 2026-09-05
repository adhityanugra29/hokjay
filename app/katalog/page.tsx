import KatalogClient from "@/components/katalog/KatalogClient";
import { dbConnect } from "@/lib/db";
import { Category } from "@/models/Category";
import { Product } from "@/models/Product";
import { getSession } from "@/lib/auth/session";
import { queryKatalogProducts, CAN_EDIT_PRODUCT_ROLES, CAN_FLASH_SALE_ROLES } from "@/lib/katalog";

export const dynamic = "force-dynamic";

const KATALOG_PAGE_SIZE = 12;

export default async function KatalogPage() {
  await dbConnect();
  const session = await getSession();
  const canEditProduct = !!session && CAN_EDIT_PRODUCT_ROLES.includes(session.role);
  const canFlashSale = !!session && CAN_FLASH_SALE_ROLES.includes(session.role);
  // Owner role only (not Super Admin — narrower than canFlashSale above),
  // skips the diskon plafon on each card's inline diskon field. Per the
  // user's request 2026-09-05 ("khusus untuk owner hojay, plafon diskon
  // di hilangkan").
  const isOwner = session?.role === "owner";

  // Only page 1 (12 products, unfiltered/default-sorted) is fetched
  // server-side — TASK-012 (2026-09-04), per the user's request to speed
  // up the initial load by limiting the actual data pull instead of
  // shipping every matching product (200+ today) up front. Every page
  // after this, and every filter/search/sort change, goes through
  // app/api/katalog/route.ts — same queryKatalogProducts() underneath, so
  // page 1 can never drift from how the rest of the grid behaves.
  // Cheap (index-backed by ProductSchema's {isCustom,stok,name} index) —
  // just the header's "N PRODUK TERSEDIA" figure, same base filter as
  // before this task, never affected by the client's own search/filter
  // state (that text never updated live even before this task, since
  // PageHeader is server-rendered once).
  const [{ products, nextCursor }, categories, totalProductCount] = await Promise.all([
    queryKatalogProducts({}, { cursor: 0, limit: KATALOG_PAGE_SIZE, canEditProduct, canFlashSale }),
    Category.find().sort({ name: 1 }).lean(),
    Product.countDocuments({ isCustom: { $ne: true }, stok: { $gt: 0 } }),
  ]);

  return (
    <KatalogClient
      canEditProduct={canEditProduct}
      canFlashSale={canFlashSale}
      isOwner={isOwner}
      categories={categories.map((c) => c.name)}
      initialProducts={products}
      initialNextCursor={nextCursor}
      totalProductCount={totalProductCount}
    />
  );
}
