import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  queryKatalogProducts,
  queryKatalogAvailableIds,
  CAN_EDIT_PRODUCT_ROLES,
  CAN_FLASH_SALE_ROLES,
  type KatalogFiltersInput,
} from "@/lib/katalog";

/**
 * Katalog's server-paginated grid — TASK-012 (2026-09-04), per the user's
 * request to limit the actual data pull to 12 products/batch (infinite
 * scroll) instead of app/katalog/page.tsx shipping every matching product
 * on every page load. This route serves every page after the first
 * (page 1 is rendered server-side by app/katalog/page.tsx itself, using
 * the exact same queryKatalogProducts()) and every filter/search/sort
 * change from KatalogClient.tsx.
 *
 * `mode=ids` returns every matching *available* id instead (unpaginated,
 * minimal fields) — powers "Pilih Semua", which needs the complete
 * matching set the moment picking starts, not just what's been scrolled
 * into view so far.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();
  const canEditProduct = !!session && CAN_EDIT_PRODUCT_ROLES.includes(session.role);
  const canFlashSale = !!session && CAN_FLASH_SALE_ROLES.includes(session.role);

  const { searchParams } = new URL(req.url);
  const filters: KatalogFiltersInput = {
    search: searchParams.get("search") ?? undefined,
    categories: searchParams.getAll("category"),
    kondisi: (searchParams.get("kondisi") as KatalogFiltersInput["kondisi"]) || "",
    tipe: (searchParams.get("tipe") as KatalogFiltersInput["tipe"]) || "",
    hargaMin: searchParams.get("hargaMin") ?? undefined,
    hargaMax: searchParams.get("hargaMax") ?? undefined,
    hargaBasis: (searchParams.get("hargaBasis") as KatalogFiltersInput["hargaBasis"]) || "rekomendasi",
    nama: searchParams.get("nama") ?? undefined,
    ukuran: searchParams.get("ukuran") ?? undefined,
    produkBaru: searchParams.get("produkBaru") === "1",
    sort: (searchParams.get("sort") as KatalogFiltersInput["sort"]) || "",
  };

  if (searchParams.get("mode") === "ids") {
    const ids = await queryKatalogAvailableIds(filters);
    return NextResponse.json({ ids });
  }

  const cursor = Number(searchParams.get("cursor") ?? 0) || 0;
  const limit = Number(searchParams.get("limit") ?? 12) || 12;
  const result = await queryKatalogProducts(filters, { cursor, limit, canEditProduct, canFlashSale });
  return NextResponse.json(result);
}
