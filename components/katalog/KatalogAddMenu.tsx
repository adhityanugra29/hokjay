"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CurrencyInput } from "@/components/ui/Form";
import { useCart } from "@/components/cart/CartProvider";
import { makeJasaCartItem } from "@/lib/jasaCart";

interface JasaOption {
  _id: string;
  nama: string;
}

const itemCls =
  "flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left font-sans text-[0.85rem] font-extrabold text-ink hover:bg-accent-100";

/**
 * Katalog header's single primary "+ Tambah" action — replaces the separate
 * "Pesan Produk Custom" / "Lihat Produk Custom" buttons and adds Jasa (service
 * fee) as the first entry, per the approved mockup
 * (docs/SDD/mockups/jasa-v2.html). Jasa never shows up as a card in the grid or
 * in the catalog PDF; this menu is only an entry point that opens a panel
 * where a price is typed and the jasa is added to the same cart as products.
 * Per the user's request 2026-10-07.
 */
export default function KatalogAddMenu() {
  const { addItem } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [jasaList, setJasaList] = useState<JasaOption[] | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Record<string, boolean>>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function openPanel() {
    setMenuOpen(false);
    setPanelOpen(true);
    if (jasaList === null) {
      fetch("/api/jasa?aktif=1")
        .then((r) => (r.ok ? r.json() : []))
        .then(setJasaList)
        .catch(() => setJasaList([]));
    }
  }

  function addJasa(j: JasaOption) {
    const harga = Number(prices[j._id] || 0);
    if (!(harga > 0)) return;
    addItem(makeJasaCartItem(j, harga));
    setPrices((p) => ({ ...p, [j._id]: "" }));
    setAdded((a) => ({ ...a, [j._id]: true }));
    setTimeout(() => setAdded((a) => ({ ...a, [j._id]: false })), 1800);
  }

  return (
    <>
      <div ref={wrapRef} className="relative">
        <Button type="button" onClick={() => setMenuOpen((v) => !v)} aria-haspopup="true" aria-expanded={menuOpen}>
          + Tambah ▾
        </Button>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-[calc(100%+6px)] z-30 min-w-[240px] rounded-xl border border-line bg-panel p-1.5 shadow-lg"
          >
            <button type="button" role="menuitem" onClick={openPanel} className={itemCls}>
              Jasa
              <span className="font-normal text-[0.72rem] text-muted">Tambah biaya service ke invoice</span>
            </button>
            <Link href="/katalog/custom-order" role="menuitem" className={itemCls}>
              Pesan Produk Custom
              <span className="font-normal text-[0.72rem] text-muted">Buat produk pesanan khusus</span>
            </Link>
            <hr className="mx-1 my-1.5 border-0 border-t border-line" />
            <Link href="/katalog/custom" role="menuitem" className={itemCls}>
              Lihat Produk Custom
              <span className="font-normal text-[0.72rem] text-muted">Daftar produk custom yang sudah dibuat</span>
            </Link>
          </div>
        )}
      </div>

      {panelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPanelOpen(false);
          }}
        >
          <div role="dialog" aria-label="Tambah Jasa ke Invoice" className="w-full max-w-[560px] rounded-2xl bg-panel p-5 shadow-xl">
            <h2 className="font-sans text-[1.05rem] font-extrabold text-ink">Tambah Jasa ke Invoice</h2>
            <p className="mt-1 font-sans text-[0.8rem] text-muted">
              Isi harga jasa, lalu tambahkan. Jasa tidak punya stok, diskon, maupun komisi.
            </p>
            <div className="mt-4 max-h-[50vh] overflow-y-auto rounded-xl border border-line">
              {jasaList === null && <div className="px-4 py-5 font-mono text-[0.8rem] text-muted">Memuat jasa...</div>}
              {jasaList?.length === 0 && (
                <div className="px-4 py-5 font-mono text-[0.8rem] text-muted">
                  Belum ada jasa aktif. Tambahkan di Inventory &rarr; tab Jasa.
                </div>
              )}
              {jasaList?.map((j) => {
                const harga = Number(prices[j._id] || 0);
                return (
                  <div key={j._id} className="flex flex-wrap items-center justify-between gap-2.5 border-b border-line px-4 py-3 last:border-b-0">
                    <span className="min-w-0 flex-1 font-sans text-[0.9rem] font-bold">{j.nama}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-[150px]">
                        <CurrencyInput
                          value={prices[j._id] ?? ""}
                          onChange={(v) => setPrices((p) => ({ ...p, [j._id]: v }))}
                          placeholder="0"
                          showPrefix
                        />
                      </div>
                      <Button type="button" onClick={() => addJasa(j)} disabled={!(harga > 0)}>
                        {added[j._id] ? "Ditambahkan" : "Tambah"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4">
              <Button type="button" variant="ghost" onClick={() => setPanelOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
