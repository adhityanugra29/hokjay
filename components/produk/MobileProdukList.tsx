import Link from "next/link";
import { rupiah } from "@/lib/format";
import { RowActionLink } from "@/components/ui/RowAction";
import DeleteProductButton from "@/components/produk/DeleteProductButton";

export interface MobileProdukRow {
  id: string;
  name: string;
  category: string;
  merk?: string;
  sku: string;
  hargaRekomendasi: number;
  stok: number;
  kondisi: string;
  umurStokLabel: string;
  umurStokVariant: "ok" | "low" | "out";
}

const UMUR_DOT: Record<MobileProdukRow["umurStokVariant"], string> = {
  ok: "#16A34A",
  low: "#D97706",
  out: "#DC2626",
};

/**
 * Mobile-only card list for Inventory's "Semua Produk" table — the plain
 * <table> (still used at md+, wrapped in TableScroll) just becomes tiny
 * horizontally-scrolled text on a phone. Mirrors the established
 * Mobile* card-list pattern (e.g. components/purchasing/MobileSupplier.tsx)
 * rather than inventing a new one. Per the user's request 2026-08-25.
 */
export default function MobileProdukList({ products }: { products: MobileProdukRow[] }) {
  return (
    <div className="border-t border-line md:hidden">
      {products.map((p) => (
        <div key={p.id} className="border-b border-line px-4 py-3.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-sans text-[0.88rem] font-semibold">{p.name}</div>
              <div className="mt-0.5 truncate font-mono text-[0.68rem] text-muted">
                {p.category}
                {p.merk ? ` · ${p.merk}` : ""} · {p.sku}
              </div>
            </div>
            {/* Just "Bekas"/"Baru", filled bright color — same convention as
                the Katalog card badge. Per the user's request 2026-08-25. */}
            <span
              className="shrink-0 px-2 py-1 text-[0.62rem] font-semibold whitespace-nowrap text-white"
              style={{ background: p.kondisi === "bekas" ? "#D97706" : "#16A34A" }}
            >
              {p.kondisi === "bekas" ? "Bekas" : "Baru"}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[0.78rem]">
            <span className="font-semibold">{rupiah(p.hargaRekomendasi)}</span>
            <span className="text-muted">Stok {p.stok}</span>
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: UMUR_DOT[p.umurStokVariant] }} />
              {p.umurStokLabel}
            </span>
          </div>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <RowActionLink href={`/produk/${p.id}/edit`}>Ubah</RowActionLink>
            <DeleteProductButton productId={p.id} productName={p.name} />
          </div>
        </div>
      ))}
      {products.length === 0 && (
        <div className="px-4 py-8 text-center font-mono text-sm text-muted">
          Belum ada produk.{" "}
          <Link href="/produk/baru" className="text-moss-deep underline">
            Tambah produk pertama
          </Link>
        </div>
      )}
    </div>
  );
}
