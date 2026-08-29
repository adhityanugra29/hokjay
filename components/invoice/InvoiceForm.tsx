"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Field, FormGrid, FormActions, Input, Select, CurrencyInput } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { useDialog } from "@/components/ui/Dialog";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import ItemRowEditor from "./ItemRowEditor";
import InlineCustomerForm, { type CreatedCustomer } from "./InlineCustomerForm";
import AddProductSidebar from "./AddProductSidebar";
import { computeLineCommission } from "@/lib/commission";
import { rupiah } from "@/lib/format";

interface CustomerOption {
  _id: string;
  nama: string;
  alamat: string;
  whatsapp: string;
  provinsi: string;
  kota: string;
}
interface SalesOption {
  _id: string;
  nama: string;
}
interface CourierOption {
  _id: string;
  name: string;
}

// Tanggal Pengiriman defaults to H+3 (today + 3 days) on a fresh invoice —
// per the user's request 2026-08-25.
function defaultTanggalKirim(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d.toISOString().slice(0, 10);
}

export interface InvoiceFormInitial {
  customerId?: string;
  salesId?: string;
  kurirId?: string;
  ongkosKirim?: number;
  tanggalInvoice?: string;
  tanggalKirim?: string;
  shipAddress?: string;
}

export default function InvoiceForm({
  customers,
  salesList,
  couriers,
  nextNumberHint,
  mode = "create",
  invoiceId,
  initial,
  currentUser,
}: {
  customers: CustomerOption[];
  salesList: SalesOption[];
  couriers: CourierOption[];
  nextNumberHint: string;
  mode?: "create" | "edit";
  invoiceId?: string;
  initial?: InvoiceFormInitial;
  currentUser?: { nama: string; role: string } | null;
}) {
  const router = useRouter();
  const { items, clear } = useCart();
  const { confirm, alert } = useDialog();
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();
  // Keeps "Mohon menunggu" visible for the WHOLE save-then-navigate flow —
  // the overlay used to hide the instant the save fetch() resolved, but
  // the router.push() navigation that follows still takes a moment to
  // actually land, leaving a ~1s gap with nothing showing. Per the user's
  // report 2026-08-28. showLoading() is called before navigating and
  // deliberately never paired with a hideLoading() call in the success
  // path here — LoadingOverlayProvider itself clears it the moment the
  // route actually changes (see components/ui/LoadingOverlay.tsx), which
  // is more reliable than this component trying to track the transition
  // itself (an earlier attempt using useTransition's isPending got stuck
  // showing on the destination page — this component can get unmounted by
  // the very navigation it's waiting on, before it ever observes isPending
  // fall back to false).

  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  // Pelanggan is picked right here, inline — this form shows it read-only
  // at the top once picked, only opening back up to a picker when there's
  // genuinely no customer yet or the user explicitly clicks "Ubah".
  // Customer-picking used to happen upstream on a separate /penjualan page
  // before browsing Katalog; that page was dropped and picking moved here
  // (invoice time) per the user's request 2026-08-25.
  const [editingCustomer, setEditingCustomer] = useState(false);
  // Own copy of the customer list so a brand-new customer (added inline,
  // below) can be appended and selected immediately without a page
  // refresh. "Tambah pelanggan baru" used to navigate away to
  // /pelanggan/baru and back; now it expands InlineCustomerForm right
  // here instead. Per the user's request 2026-08-27.
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  const [shipAddress, setShipAddress] = useState(initial?.shipAddress ?? "");
  const [salesId, setSalesId] = useState(initial?.salesId ?? "");
  const [tanggalInvoice, setTanggalInvoice] = useState(
    initial?.tanggalInvoice ?? new Date().toISOString().slice(0, 10)
  );
  const [tanggalKirim, setTanggalKirim] = useState(
    initial?.tanggalKirim ?? (mode === "create" ? defaultTanggalKirim() : "")
  );
  const [kurirId, setKurirId] = useState(initial?.kurirId ?? "");
  const [ongkosKirim, setOngkosKirim] = useState(initial?.ongkosKirim ?? 0);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "+ Tambah Produk" navigates away to /katalog and back — that remounts
  // this whole form from scratch, so every field above (pelanggan/sales/
  // tanggal/kurir/ongkir) would otherwise snap back to its initial value
  // and silently lose whatever the user had already filled in. Per the
  // user's report 2026-08-27 ("ketika tambah produk, datanya reset dari
  // awal"). Sessions-scoped (clears on tab close) rather than permanent —
  // this is a same-session convenience, not a real draft feature.
  const draftKey = mode === "edit" ? `invoiceHeaderDraft:edit:${invoiceId}` : "invoiceHeaderDraft:baru";

  useEffect(() => {
    // Only a genuine "back from Katalog" round trip has items already in
    // the cart on mount — a brand new invoice (create mode) or a freshly
    // opened edit page both start with an empty cart at this point
    // (EditInvoiceLoader hasn't loaded the invoice's items yet on the very
    // first render), so this never clobbers a true first load.
    if (items.length === 0) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        customerId: string;
        shipAddress: string;
        salesId: string;
        tanggalInvoice: string;
        tanggalKirim: string;
        kurirId: string;
        ongkosKirim: number;
      }>;
      if (draft.customerId) setCustomerId(draft.customerId);
      if (draft.shipAddress) setShipAddress(draft.shipAddress);
      if (draft.salesId) setSalesId(draft.salesId);
      if (draft.tanggalInvoice) setTanggalInvoice(draft.tanggalInvoice);
      if (draft.tanggalKirim) setTanggalKirim(draft.tanggalKirim);
      if (draft.kurirId) setKurirId(draft.kurirId);
      if (draft.ongkosKirim) setOngkosKirim(draft.ongkosKirim);
    } catch {
      // malformed/unavailable storage — not worth surfacing an error for
    }
    // Deliberately only on mount — this restores whatever was saved right
    // before navigating to Katalog, not on every keystroke afterward.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({ customerId, shipAddress, salesId, tanggalInvoice, tanggalKirim, kurirId, ongkosKirim })
      );
    } catch {
      // storage full/unavailable — this is a convenience, not critical
    }
  }, [draftKey, customerId, shipAddress, salesId, tanggalInvoice, tanggalKirim, kurirId, ongkosKirim]);

  // Logged in as sales (or manager — manager is treated as a sales rep
  // with extra authority, same as the Katalog/Leaderboard/Komisi Saya
  // extension confirmed 2026-08-27) -> "Sales Consultant" auto-fills with
  // their own account, matched by nama against the Sales roster (same
  // nama-matching convention used elsewhere, e.g. Insentif ranking). Only
  // on a fresh invoice with nothing picked yet — never overrides an
  // explicit pick or an existing invoice being edited. Per the user's
  // request 2026-08-25, extended to manager 2026-08-27, and to owner
  // 2026-08-29 ("untuk owner, bisa berjualan ya") — requires a matching
  // Sales roster entry to exist for that name, same as manager.
  useEffect(() => {
    if (
      mode === "create" &&
      !initial?.salesId &&
      !salesId &&
      (currentUser?.role === "sales" || currentUser?.role === "manager" || currentUser?.role === "owner")
    ) {
      const own = salesList.find((s) => s.nama.trim().toLowerCase() === currentUser.nama.trim().toLowerCase());
      if (own) setSalesId(own._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, salesList]);

  const selectedCourier = couriers.find((c) => c._id === kurirId);
  const subtotalProduk = useMemo(
    () => items.reduce((s, i) => s + (i.hargaJual - i.diskonPerUnit) * i.qty, 0),
    [items]
  );
  const grandTotal = subtotalProduk + ongkosKirim;
  // Per the user's request 2026-08-29 ("total diskon belum ada di
  // sebelum preview") — same figure now shown on the invoice detail
  // page/PDF, added here too so it's visible at every stage.
  const totalDiskon = useMemo(() => items.reduce((s, i) => s + i.diskonPerUnit * i.qty, 0), [items]);
  const komisiTotal = useMemo(
    () =>
      items.reduce(
        (s, i) =>
          s +
          // diskon wasn't factored into this summary total before —
          // found and fixed alongside the 2026-08-29 diskon/komisi work
          // (ItemRowEditor's own per-line figure already did).
          computeLineCommission({
            isCustom: i.isCustom,
            kondisi: i.kondisi,
            hargaJual: i.hargaJual,
            diskon: i.diskonPerUnit,
            hargaMinimum: i.hargaMinimum,
          }) *
            i.qty,
        0
      ),
    [items]
  );

  function selectCustomer(id: string) {
    setCustomerId(id);
    const c = customerList.find((c) => c._id === id);
    if (c) {
      setShipAddress(c.alamat);
      setEditingCustomer(false); // collapse back to the read-only view once a real pick is made
    }
  }

  function handleCustomerCreated(c: CreatedCustomer) {
    const option: CustomerOption = {
      _id: c._id,
      nama: c.nama,
      alamat: c.alamat,
      whatsapp: c.whatsapp,
      provinsi: c.provinsi,
      kota: c.kota,
    };
    setCustomerList((prev) => [...prev, option].sort((a, b) => a.nama.localeCompare(b.nama)));
    setCustomerId(c._id);
    setShipAddress(c.alamat);
    setAddingCustomer(false);
    setEditingCustomer(false);
  }

  const selectedCustomer = customerList.find((c) => c._id === customerId);

  async function submit(status: "draft" | "unpaid") {
    setError(null);
    if (items.length === 0) {
      setError("Belum ada produk di invoice ini.");
      return;
    }
    const customer = customerList.find((c) => c._id === customerId);
    const sales = salesList.find((s) => s._id === salesId);
    if (!customer) return setError("Pilih pelanggan terlebih dahulu.");
    if (!sales) return setError("Pilih sales terlebih dahulu.");

    setSaving(true);
    showLoading();
    try {
      const url = mode === "edit" ? `/api/invoices/${invoiceId}` : "/api/invoices";
      const res = await fetch(url, {
        method: mode === "edit" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customer._id,
          customerNama: customer.nama,
          customerWhatsapp: customer.whatsapp,
          shipAddress,
          salesId: sales._id,
          salesNama: sales.nama,
          tanggalInvoice: tanggalInvoice || undefined,
          tanggalKirim: tanggalKirim || undefined,
          kurir: selectedCourier?.name,
          ongkosKirim,
          status,
          items: items.map((i) => ({
            productId: i.isCustom ? undefined : i.productId,
            namaSnapshot: i.isCustom ? i.name : undefined,
            qty: i.qty,
            hargaJual: i.hargaJual,
            diskonPerUnit: i.diskonPerUnit,
            isFlashSale: i.isFlashSale,
          })),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || (mode === "edit" ? "Gagal mengubah invoice" : "Gagal membuat invoice"));
      }
      const invoice = await res.json();
      clear();
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        // ignore — nothing to clean up if storage was never available
      }
      // showLoading() called above is deliberately not matched with a
      // hideLoading() here — LoadingOverlayProvider clears it itself once
      // the route actually changes (see components/ui/LoadingOverlay.tsx),
      // so it stays visible through the whole navigation.
      router.push(status === "draft" ? "/invoice" : `/invoice/${invoice._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan invoice");
      hideLoading(); // no navigation follows an error — nothing else will clear this
    } finally {
      setSaving(false);
    }
  }

  // "Batal" deletes the invoice outright rather than just discarding
  // unsaved changes — per the user's explicit request 2026-08-27, with a
  // confirm() warning first since it's destructive either way. Edit mode
  // has a real Invoice document to delete (server-side guards in
  // deleteInvoice.ts still apply — e.g. refuses if a DP was already
  // received, surfaced here via the error message). Create mode never has
  // a saved record yet at this point (only Simpan/Simpan sebagai Draft
  // create one, and both navigate away immediately after), so there's
  // nothing to call the API for — just the cart to clear.
  async function handleCancel() {
    if (mode === "edit") {
      const ok = await confirm(
        `Hapus invoice ${nextNumberHint}? Tindakan ini akan menghapus invoice ini sepenuhnya dan tidak bisa dibatalkan.`,
        { danger: true }
      );
      if (!ok) return;
      setCanceling(true);
      showLoading();
      try {
        const res = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Gagal menghapus invoice");
        }
        clear();
        try {
          sessionStorage.removeItem(draftKey);
        } catch {
          // ignore — nothing to clean up if storage was never available
        }
        // Same reasoning as submit() above — LoadingOverlayProvider clears
        // the overlay itself once the route changes.
        router.push("/invoice");
        router.refresh();
      } catch (err) {
        await alert(err instanceof Error ? err.message : "Gagal menghapus invoice");
        hideLoading();
        setCanceling(false);
      }
      return;
    }

    if (items.length > 0) {
      const ok = await confirm("Batalkan? Produk yang sudah dipilih di keranjang akan dikosongkan.");
      if (!ok) return;
    }
    clear();
    try {
      sessionStorage.removeItem(draftKey);
    } catch {
      // ignore — nothing to clean up if storage was never available
    }
    showLoading();
    router.push("/invoice");
  }

  const showCustomerPicker = !customerId || editingCustomer;

  return (
    <Panel className="max-w-4xl p-7">
      {/* Pelanggan sits at the very top and is read-only by default once
          picked (or already set from the invoice being edited); "Ubah"
          reopens the picker inline instead of it being a plain editable
          dropdown mixed in with the rest of the fields. */}
      <div className="mb-5 border border-line bg-[#f7f5ee] p-4">
        <label className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Pelanggan</label>
        {showCustomerPicker ? (
          <div className="mt-1.5">
            {addingCustomer ? (
              <InlineCustomerForm onCreated={handleCustomerCreated} onCancel={() => setAddingCustomer(false)} />
            ) : (
              <>
                <Select value={customerId} onChange={(e) => selectCustomer(e.target.value)}>
                  <option value="">— Pilih pelanggan —</option>
                  {customerList.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.nama}
                    </option>
                  ))}
                </Select>
                <div className="mt-1.5 flex flex-wrap items-center gap-3 font-mono text-[0.7rem] text-muted">
                  <button
                    type="button"
                    onClick={() => setAddingCustomer(true)}
                    className="cursor-pointer text-moss underline"
                  >
                    Tambah pelanggan baru
                  </button>
                  {customerId && (
                    <button
                      type="button"
                      onClick={() => setEditingCustomer(false)}
                      className="cursor-pointer underline"
                    >
                      Batal
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <div>
              <div className="font-sans text-[1rem] font-bold">{selectedCustomer?.nama}</div>
              {selectedCustomer?.whatsapp && (
                <div className="font-mono text-[0.72rem] text-muted">{selectedCustomer.whatsapp}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditingCustomer(true)}
              className="cursor-pointer border border-line bg-panel px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-ink hover:border-accent hover:text-accent"
            >
              Ubah
            </button>
          </div>
        )}
      </div>

      <FormGrid className="mb-5 max-w-[420px]">
        <Field label="Nomor Invoice">
          <Input disabled value={nextNumberHint} />
        </Field>
        <Field label="Tanggal Invoice">
          <Input type="date" value={tanggalInvoice} onChange={(e) => setTanggalInvoice(e.target.value)} />
        </Field>
      </FormGrid>

      <FormGrid>
        <Field label="Sales Consultant">
          <Select value={salesId} onChange={(e) => setSalesId(e.target.value)}>
            <option value="">— Pilih sales —</option>
            {salesList.map((s) => (
              <option key={s._id} value={s._id}>
                {s.nama}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tanggal Pengiriman">
          <Input type="date" value={tanggalKirim} onChange={(e) => setTanggalKirim(e.target.value)} />
        </Field>
        <Field label="Alamat Kirim">
          <Input
            value={shipAddress}
            onChange={(e) => setShipAddress(e.target.value)}
            placeholder="Otomatis terisi setelah pilih pelanggan"
          />
        </Field>
        {/* Provinsi/Kota — read-only, auto-filled from the selected
            pelanggan's own data (not editable, not saved separately onto
            the invoice). Per the user's request 2026-08-25. */}
        <Field label="Provinsi">
          <Input disabled value={selectedCustomer?.provinsi ?? ""} placeholder="Otomatis terisi setelah pilih pelanggan" />
        </Field>
        <Field label="Kota / Kabupaten">
          <Input disabled value={selectedCustomer?.kota ?? ""} placeholder="Otomatis terisi setelah pilih pelanggan" />
        </Field>
        <Field label="Pilih Kurir">
          <Select value={kurirId} onChange={(e) => setKurirId(e.target.value)}>
            <option value="">— Pilih kurir —</option>
            {couriers.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Ongkos Kirim">
          <CurrencyInput
            value={String(ongkosKirim)}
            onChange={(v) => setOngkosKirim(v ? Number(v) : 0)}
            placeholder="0"
          />
        </Field>
      </FormGrid>

      <div className="mt-7">
        <label className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Item Produk</label>
        <div className="mt-3">
          {items.map((item) => (
            <ItemRowEditor key={item.productId} item={item} />
          ))}
          {items.length === 0 && (
            <div className="border border-dashed border-line py-6 text-center font-mono text-[0.8rem] text-muted">
              Belum ada produk. Klik &quot;+ Tambah Produk&quot; di bawah.
            </div>
          )}
        </div>
        {/* Opens the inline sidebar instead of navigating to /katalog —
            "Lanjut ke Invoice" there always routes to /invoice/baru (a
            brand new invoice), which silently discarded an in-progress
            edit's pelanggan/sales/etc. Per the user's report 2026-08-27
            ("customernya tereset"). Originally edit-mode only per the
            user's own initial scoping choice; extended to create mode too
            2026-08-28 once the user asked for the same fix there. */}
        <button
          type="button"
          onClick={() => setAddingProduct(true)}
          className="mt-1 block w-full cursor-pointer rounded border-[1.5px] border-dashed border-line py-3 text-center font-sans text-[0.85rem] text-muted hover:border-moss hover:bg-[#fbfaf5] hover:text-moss-deep"
        >
          + Tambah Produk
        </button>
      </div>

      <div className="mt-5 border border-line bg-[#f7f5ee] p-5">
        <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Estimasi Komisi Sales</h3>
        <div className="mt-1.5 font-mono text-[0.85rem]">
          Total komisi jika invoice ini lunas:{" "}
          <strong className="text-moss-deep">{rupiah(komisiTotal)}</strong>
        </div>
      </div>

      <div className="ml-auto mt-5 w-full max-w-[280px] font-mono text-[0.88rem]">
        <div className="flex justify-between py-1.5">
          <span>Subtotal Produk</span>
          <span>{rupiah(subtotalProduk)}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span>Total Diskon</span>
          <span>− {rupiah(totalDiskon)}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span>Ongkos Kirim</span>
          <span>{rupiah(ongkosKirim)}</span>
        </div>
        <div className="mt-2 flex justify-between border-t-2 border-ink pt-3 font-serif text-lg font-semibold">
          <span>Total</span>
          <span>{rupiah(grandTotal)}</span>
        </div>
      </div>

      {error && <div className="mt-3 font-mono text-[0.75rem] text-danger">{error}</div>}

      <FormActions>
        <Button variant="clay" disabled={saving || canceling} onClick={() => submit("unpaid")}>
          {saving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan & Kirim Invoice"}
        </Button>
        <Button variant="ghost" disabled={saving || canceling} onClick={() => submit("draft")}>
          Simpan sebagai Draft
        </Button>
        <Button variant="ghost" disabled={saving || canceling} onClick={handleCancel}>
          {canceling ? "Menghapus..." : "Batal"}
        </Button>
      </FormActions>

      <AddProductSidebar
        open={addingProduct}
        onClose={() => setAddingProduct(false)}
        invoiceId={mode === "edit" ? invoiceId : undefined}
      />
    </Panel>
  );
}
