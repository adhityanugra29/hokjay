"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { CurrencyInput, Select } from "@/components/ui/Form";
import { useCart } from "@/components/cart/CartProvider";
import { makeJasaCartItem } from "@/lib/jasaCart";

interface JasaOption {
  _id: string;
  nama: string;
}

interface JasaLine {
  key: number;
  jasaId: string;
  harga: string;
}

const itemCls =
  "flex w-full cursor-pointer flex-col items-start gap-0.5 rounded-lg border-0 bg-transparent px-3 py-2.5 text-left font-sans text-[0.85rem] font-extrabold text-ink hover:bg-accent-100";

let lineKey = 0;
const newLine = (): JasaLine => ({ key: ++lineKey, jasaId: "", harga: "" });

/**
 * Katalog header's single primary "+ Tambah" action — replaces the separate
 * "Pesan Produk Custom" / "Lihat Produk Custom" buttons and adds Jasa (service
 * fee) as the first entry, per the approved mockup
 * (docs/SDD/mockups/jasa-v2.html). Jasa never shows up as a card in the grid or
 * in the catalog PDF; this menu is only an entry point. The panel is a list of
 * rows (jasa dropdown first, price field only once a jasa is picked) with a
 * "+ Tambah jasa lain" button for two or more at once, all added to the same
 * cart as products. Per the user's request 2026-10-07.
 */
export default function KatalogAddMenu() {
  const { addItem } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [jasaList, setJasaList] = useState<JasaOption[] | null>(null);
  const [lines, setLines] = useState<JasaLine[]>(() => [newLine()]);
  const [justAdded, setJustAdded] = useState(false);
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

  function patchLine(key: number, patch: Partial<JasaLine>) {
    setJustAdded(false);
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  const picked = lines.filter((l) => l.jasaId).length;
  const ready = lines.filter((l) => l.jasaId && Number(l.harga) > 0).length;
  const allPicked = picked === lines.length;
  const canAdd = picked > 0 && allPicked && ready === picked;

  function addAll() {
    if (!canAdd || !jasaList) return;
    for (const l of lines) {
      const jasa = jasaList.find((j) => j._id === l.jasaId);
      if (jasa) addItem(makeJasaCartItem(jasa, Number(l.harga)));
    }
    setLines([newLine()]);
    setJustAdded(true);
  }

  const hint = justAdded
    ? "Jasa ditambahkan ke keranjang"
    : picked === 0
      ? "Pilih jasa dulu"
      : !canAdd
        ? "Lengkapi jasa dan harga di setiap baris"
        : `${picked} jasa siap ditambahkan`;

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
              Pilih jasa yang dipakai, lalu isi harganya. Jasa tidak punya stok, diskon, maupun komisi.
            </p>

            <div className="mt-4 flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto">
              {jasaList === null && <div className="py-3 font-mono text-[0.8rem] text-muted">Memuat jasa...</div>}
              {jasaList?.length === 0 && (
                <div className="py-3 font-mono text-[0.8rem] text-muted">
                  Belum ada jasa aktif. Tambahkan di Inventory &rarr; tab Jasa.
                </div>
              )}
              {jasaList && jasaList.length > 0 &&
                lines.map((l) => (
                  <div key={l.key} className="grid grid-cols-[minmax(0,1fr)_32px] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_150px_32px]">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[0.68rem] uppercase tracking-wide text-muted">Jasa</span>
                      <Select
                        value={l.jasaId}
                        onChange={(e) => patchLine(l.key, { jasaId: e.target.value, harga: "" })}
                        aria-label="Pilih jasa"
                      >
                        <option value="">— Pilih jasa —</option>
                        {jasaList.map((j) => (
                          <option key={j._id} value={j._id}>
                            {j.nama}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div className="order-last col-span-2 flex flex-col gap-1 sm:order-none sm:col-span-1">
                      <span className="font-mono text-[0.68rem] uppercase tracking-wide text-muted">Harga Jasa</span>
                      {/* Disabled until a jasa is picked — price only makes sense for a chosen jasa. */}
                      <div className={l.jasaId ? "" : "pointer-events-none opacity-50"}>
                        <CurrencyInput
                          value={l.harga}
                          onChange={(v) => patchLine(l.key, { harga: v })}
                          placeholder="Rp 0"
                          showPrefix
                        />
                      </div>
                    </div>
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        aria-label="Hapus baris jasa"
                        onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                        className="h-10 w-8 cursor-pointer rounded-lg border border-line bg-transparent text-[1rem] leading-none text-danger hover:bg-black/5"
                      >
                        ×
                      </button>
                    ) : (
                      <span />
                    )}
                  </div>
                ))}
            </div>

            {jasaList && jasaList.length > 0 && (
              <div className="mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-1.5 text-[0.78rem]"
                  disabled={!allPicked}
                  onClick={() => setLines((ls) => [...ls, newLine()])}
                >
                  + Tambah jasa lain
                </Button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
              <span className="font-sans text-[0.78rem] text-muted">{hint}</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setPanelOpen(false)}>
                  Tutup
                </Button>
                <Button type="button" onClick={addAll} disabled={!canAdd}>
                  {canAdd && picked > 1 ? `Tambah (${picked})` : "Tambah"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
