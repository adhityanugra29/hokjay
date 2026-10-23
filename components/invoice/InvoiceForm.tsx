"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormCard, FormSection, FormCardActions } from "@/components/ui/FormSection";
import { Field, FormGrid, Input, Select, CurrencyInput, Textarea } from "@/components/ui/Form";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/components/cart/CartProvider";
import { useDialog } from "@/components/ui/Dialog";
import { useLoadingOverlay } from "@/components/ui/LoadingOverlay";
import ItemRowEditor from "./ItemRowEditor";
import JasaRowEditor from "./JasaRowEditor";
import InlineCustomerForm, { type CreatedCustomer } from "./InlineCustomerForm";
import AddProductSidebar from "./AddProductSidebar";
import SyaratKetentuanEditor from "./SyaratKetentuanEditor";
import { normalizeSyarat, parseSyaratPoin, validateSyarat } from "@/lib/syaratKetentuan";
import { computeLineCommission, allocateBulkDiskon } from "@/lib/commission";
import { rupiah } from "@/lib/format";
import { makeJasaCartItem } from "@/lib/jasaCart";

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

export interface InvoiceFormInitial {
  customerId?: string;
  salesId?: string;
  kurirId?: string;
  ongkosKirim?: number;
  tanggalInvoice?: string;
  tanggalKirim?: string;
  shipAddress?: string;
  provinsi?: string;
  kota?: string;
  catatan?: string;
  /** Edit mode: the S&K text in force right now (own text, else the template). */
  syaratKetentuan?: string;
  /** Edit mode: invoice already sent (not draft) — its S&K no longer follows the template. */
  syaratKetentuanFrozen?: boolean;
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
  syaratKetentuanTemplate = "",
}: {
  customers: CustomerOption[];
  salesList: SalesOption[];
  couriers: CourierOption[];
  nextNumberHint: string;
  mode?: "create" | "edit";
  invoiceId?: string;
  initial?: InvoiceFormInitial;
  currentUser?: { nama: string; role: string } | null;
  /** Admin → Invoice's template text — the starting point for this invoice's own Syarat & Ketentuan. */
  syaratKetentuanTemplate?: string;
}) {
  const router = useRouter();
  // Owner-only "no plafon diskon": a UI convenience (no clamp/warning); the real enforcement is server-side in createInvoice/updateInvoice, resolved from the session.
  const isOwner = currentUser?.role === "owner";
  const { items, clear, updateItem, addItem } = useCart();
  const { confirm, alert } = useDialog();
  const { show: showLoading, hide: hideLoading } = useLoadingOverlay();
  // showLoading() is deliberately NOT paired with hideLoading() on success: LoadingOverlayProvider clears it when the route actually changes, keeping "Mohon menunggu"
  // visible through the whole save-then-navigate flow. (useTransition's isPending got stuck: this component unmounts mid-navigation, before it sees isPending fall back to false.)

  const [customerId, setCustomerId] = useState(initial?.customerId ?? "");
  // Pelanggan is picked inline: read-only once picked, reopening to a picker only when there is no customer yet or the user clicks "Ubah".
  const [editingCustomer, setEditingCustomer] = useState(false);
  // Own copy of the customer list so a customer added inline can be appended and selected immediately, without a refresh.
  const [customerList, setCustomerList] = useState<CustomerOption[]>(customers);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [addingProduct, setAddingProduct] = useState(false);
  // "+ Tambah Jasa": service fees (models/Jasa.ts) are picked from a dropdown of active jasa, loaded on first open. They never appear in Katalog.
  const [pickingJasa, setPickingJasa] = useState(false);
  const [jasaOptions, setJasaOptions] = useState<{ _id: string; nama: string }[] | null>(null);
  const [shipAddress, setShipAddress] = useState(initial?.shipAddress ?? "");
  // Provinsi/Kota are editable (not locked to the customer's record): pre-filled on pick, but the typed value is what gets saved on the invoice.
  const [provinsi, setProvinsi] = useState(initial?.provinsi ?? "");
  const [kota, setKota] = useState(initial?.kota ?? "");
  // Free-text note, shown on the printed Invoice/Bukti Transfer and Surat Jalan.
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  // Per-invoice Syarat & Ketentuan: starts from this invoice's own text when editing, else the Admin → Invoice template. Only this invoice is
  // ever changed; the template is never written from here.
  const templateLines = useMemo(() => parseSyaratPoin(syaratKetentuanTemplate), [syaratKetentuanTemplate]);
  const skFrozen = initial?.syaratKetentuanFrozen ?? false;
  const [skLines, setSkLines] = useState<string[]>(() =>
    initial?.syaratKetentuan !== undefined ? parseSyaratPoin(initial.syaratKetentuan) : templateLines
  );
  const skText = normalizeSyarat(skLines.join("\n"));
  const skIsDefault = skText === normalizeSyarat(syaratKetentuanTemplate);
  const [salesId, setSalesId] = useState(initial?.salesId ?? "");
  const [tanggalInvoice, setTanggalInvoice] = useState(
    initial?.tanggalInvoice ?? new Date().toISOString().slice(0, 10)
  );
  // Deliberately no default date.
  const [tanggalKirim, setTanggalKirim] = useState(initial?.tanggalKirim ?? "");
  const [kurirId, setKurirId] = useState(initial?.kurirId ?? "");
  const [ongkosKirim, setOngkosKirim] = useState(initial?.ongkosKirim ?? 0);
  const [saving, setSaving] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "+ Tambah Produk" navigates to /katalog and back, which remounts this form; without this every field above would snap back to its initial value.
  // Session-scoped (clears on tab close): a same-session convenience, not a real draft feature.
  const draftKey = mode === "edit" ? `invoiceHeaderDraft:edit:${invoiceId}` : "invoiceHeaderDraft:baru";

  useEffect(() => {
    // Only a genuine "back from Katalog" round trip has items in the cart on mount (a new or freshly opened edit page starts empty), so this never clobbers a first load.
    if (items.length === 0) return;
    try {
      const raw = sessionStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw) as Partial<{
        customerId: string;
        shipAddress: string;
        provinsi: string;
        kota: string;
        catatan: string;
        skLines: string[];
        salesId: string;
        tanggalInvoice: string;
        tanggalKirim: string;
        kurirId: string;
        ongkosKirim: number;
      }>;
      if (draft.customerId) setCustomerId(draft.customerId);
      if (draft.shipAddress) setShipAddress(draft.shipAddress);
      if (draft.provinsi) setProvinsi(draft.provinsi);
      if (draft.kota) setKota(draft.kota);
      if (draft.catatan) setCatatan(draft.catatan);
      if (Array.isArray(draft.skLines)) setSkLines(draft.skLines);
      if (draft.salesId) setSalesId(draft.salesId);
      if (draft.tanggalInvoice) setTanggalInvoice(draft.tanggalInvoice);
      if (draft.tanggalKirim) setTanggalKirim(draft.tanggalKirim);
      if (draft.kurirId) setKurirId(draft.kurirId);
      if (draft.ongkosKirim) setOngkosKirim(draft.ongkosKirim);
    } catch {
      // malformed/unavailable storage — not worth surfacing an error for
    }
    // Only on mount: restores what was saved right before navigating to Katalog, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          customerId,
          shipAddress,
          provinsi,
          kota,
          catatan,
          skLines,
          salesId,
          tanggalInvoice,
          tanggalKirim,
          kurirId,
          ongkosKirim,
        })
      );
    } catch {
      // storage full/unavailable — this is a convenience, not critical
    }
  }, [
    draftKey,
    customerId,
    shipAddress,
    provinsi,
    kota,
    catatan,
    skLines,
    salesId,
    tanggalInvoice,
    tanggalKirim,
    kurirId,
    ongkosKirim,
  ]);

  // Logged in as sales/manager/owner: "Sales Consultant" auto-fills with their own account, matched by nama against the Sales roster (needs a matching roster entry).
  // Only on a fresh invoice with nothing picked yet; never overrides an explicit pick or an invoice being edited.
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
  // Total Diskon, shown at every stage. A Flash Sale line's diskonPerUnit is always 0, so its implied discount is Harga Rekomendasi − hargaJual.
  const totalDiskon = useMemo(
    () =>
      items.reduce((s, i) => {
        const diskon =
          i.isFlashSale && i.hargaRekomendasi != null
            ? Math.max(0, i.hargaRekomendasi - i.hargaJual)
            : i.diskonPerUnit;
        return s + diskon * i.qty;
      }, 0),
    [items]
  );
  // "Total Belanja" sums Harga (Harga Rekomendasi for a Flash Sale line, hargaJual otherwise). subtotalProduk still drives grandTotal, and
  // Total Belanja − Total Diskon always equals it (see InvoicePrintDoc.tsx).
  const totalBelanja = useMemo(
    () =>
      items.reduce((s, i) => {
        const harga = i.isFlashSale && i.hargaRekomendasi != null ? i.hargaRekomendasi : i.hargaJual;
        return s + harga * i.qty;
      }, 0),
    [items]
  );
  const komisiTotal = useMemo(
    () =>
      items.reduce(
        (s, i) =>
          s +
          // Jasa lines never earn komisi (computeLineCommission would treat them as baru, 6%).
          (i.isJasa ? 0 : 1) *
          // diskon is factored in, like ItemRowEditor's per-line figure.
          computeLineCommission({
            isCustom: i.isCustom,
            kondisi: i.kondisi,
            hargaJual: i.hargaJual,
            diskon: i.diskonPerUnit,
            hargaMinimum: i.hargaMinimum,
            isFlashSale: i.isFlashSale,
            komisiBekasPercent: i.komisiBekasPercent,
          }) *
            i.qty,
        0
      ),
    [items]
  );

  // Diskon Bulk: one total discount distributed across eligible lines in Rp10.000 multiples, eroding commission as little as possible
  // (allocateBulkDiskon, lib/commission.ts).
  const [bulkDiskonInput, setBulkDiskonInput] = useState("");
  const [bulkDiskonStatus, setBulkDiskonStatus] = useState<{ text: string; warn: boolean } | null>(null);
  // productId -> the diskonPerUnit this feature itself last set. allocateBulkDiskon only fills lines at Rp0, so without this a second run found nothing left to
  // redistribute. Re-running first resets lines that STILL hold exactly what the last run set; a manual entry (or one the rep typed over) is never in this map.
  const [lastBulkDiskon, setLastBulkDiskon] = useState<Map<string, number>>(new Map());

  function applyBulkDiskon() {
    const requested = Number(bulkDiskonInput) || 0;
    if (requested <= 0) {
      setBulkDiskonStatus({ text: "Masukkan jumlah diskon dulu.", warn: true });
      return;
    }

    const ownLineIds = new Set(
      items.filter((i) => lastBulkDiskon.get(i.productId) === i.diskonPerUnit).map((i) => i.productId)
    );
    for (const productId of ownLineIds) updateItem(productId, { diskonPerUnit: 0 });

    const result = allocateBulkDiskon(
      items.filter((i) => !i.isJasa).map((i) => ({
        productId: i.productId,
        isCustom: i.isCustom,
        kondisi: i.kondisi,
        hargaJual: i.hargaJual,
        hargaMinimum: i.hargaMinimum,
        komisiBekasPercent: i.komisiBekasPercent,
        diskonPerUnit: ownLineIds.has(i.productId) ? 0 : i.diskonPerUnit,
        isFlashSale: i.isFlashSale,
        qty: i.qty,
      })),
      requested,
      isOwner
    );
    if (result.allocations.size === 0) {
      setLastBulkDiskon(new Map());
      setBulkDiskonStatus({
        text: "Tidak ada baris yang bisa diisi — semua sudah didiskon manual, Flash Sale, atau kapasitasnya penuh.",
        warn: true,
      });
      return;
    }
    for (const [productId, diskonPerUnit] of result.allocations) {
      updateItem(productId, { diskonPerUnit });
    }
    setLastBulkDiskon(new Map(result.allocations));
    setBulkDiskonStatus(
      result.capped
        ? { text: `Maksimal yang bisa dicapai: ${rupiah(result.achieved)} (diminta ${rupiah(requested)}).`, warn: true }
        : { text: `Terdistribusi ${rupiah(result.achieved)} ke ${result.allocations.size} baris.`, warn: false }
    );
  }

  function selectCustomer(id: string) {
    setCustomerId(id);
    const c = customerList.find((c) => c._id === id);
    if (c) {
      setShipAddress(c.alamat);
      setProvinsi(c.provinsi);
      setKota(c.kota);
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
    setProvinsi(c.provinsi);
    setKota(c.kota);
    setAddingCustomer(false);
    setEditingCustomer(false);
  }

  const selectedCustomer = customerList.find((c) => c._id === customerId);

  async function submit(status: "draft" | "unpaid") {
    setError(null);
    if (items.length === 0) {
      setError("Belum ada produk atau jasa di invoice ini.");
      return;
    }
    if (items.some((i) => i.isJasa && !(i.hargaJual > 0))) {
      setError("Harga jasa wajib diisi.");
      return;
    }
    const customer = customerList.find((c) => c._id === customerId);
    const sales = salesList.find((s) => s._id === salesId);
    if (!customer) return setError("Pilih pelanggan terlebih dahulu.");
    if (!sales) return setError("Pilih sales terlebih dahulu.");

    const skError = validateSyarat(skText);
    if (skError) return setError(skError);

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
          provinsi: provinsi || undefined,
          kota: kota || undefined,
          catatan: catatan || undefined,
          // null = still the template (a draft keeps following it; saving as unpaid freezes it server-side). A sent invoice always sends its explicit
          // text. See lib/services/syaratKetentuan.ts.
          syaratKetentuan: skIsDefault && !skFrozen ? null : skText,
          salesId: sales._id,
          salesNama: sales.nama,
          tanggalInvoice: tanggalInvoice || undefined,
          tanggalKirim: tanggalKirim || undefined,
          kurir: selectedCourier?.name,
          ongkosKirim,
          status,
          items: items.map((i) => ({
            jasaId: i.isJasa ? i.jasaId : undefined,
            productId: i.isCustom || i.isJasa ? undefined : i.productId,
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
      // No hideLoading() here: see the note at the top (LoadingOverlayProvider clears it once the route changes).
      router.push(status === "draft" ? "/invoice" : `/invoice/${invoice._id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan invoice");
      hideLoading(); // no navigation follows an error — nothing else will clear this
    } finally {
      setSaving(false);
    }
  }

  // "Batal" deletes the invoice outright (after a confirm, since it's destructive). Edit mode deletes the real Invoice (server guards in deleteInvoice.ts
  // still apply, e.g. it refuses if a DP was received, surfaced via the error); create mode has no saved record yet, so it just clears the cart.
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
        // Same as submit(): LoadingOverlayProvider clears the overlay once the route changes.
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
    <FormCard
      className="max-w-4xl"
      title={mode === "edit" ? `Ubah Invoice ${nextNumberHint}` : "Invoice Baru"}
      description="Pilih pelanggan, isi detail pengiriman, lalu tambahkan produk dari Katalog."
    >
      <FormSection label="Pelanggan">
      <div className="border border-line bg-[#f7f5ee] p-4">
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
              className="cursor-pointer border border-line bg-panel px-3 py-1.5 font-sans text-[0.72rem] font-semibold text-ink hover:border-accent hover:text-accent-700"
            >
              Ubah
            </button>
          </div>
        )}
      </div>
      </FormSection>

      <FormSection label="Detail Invoice">
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
        <Field label="Provinsi">
          <Input
            value={provinsi}
            onChange={(e) => setProvinsi(e.target.value)}
            placeholder="Otomatis terisi setelah pilih pelanggan"
          />
        </Field>
        <Field label="Kota / Kabupaten">
          <Input
            value={kota}
            onChange={(e) => setKota(e.target.value)}
            placeholder="Otomatis terisi setelah pilih pelanggan"
          />
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
        <Field label="Catatan (opsional)" span2>
          <Textarea
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder="Instruksi khusus, catatan pengiriman, dll."
            rows={2}
          />
        </Field>
      </FormGrid>
      </FormSection>

      <FormSection label="Item Produk &amp; Jasa">
      <div>
        <div>
          {items.map((item) =>
            item.isJasa ? (
              <JasaRowEditor key={item.productId} item={item} />
            ) : (
              <ItemRowEditor key={item.productId} item={item} isOwner={isOwner} />
            )
          )}
          {items.length === 0 && (
            <div className="border border-dashed border-line py-6 text-center font-mono text-[0.8rem] text-muted">
              Belum ada item. Klik &quot;+ Tambah Produk&quot; atau &quot;+ Tambah Jasa&quot; di bawah.
            </div>
          )}
        </div>
        {/* Opens the inline sidebar instead of navigating to /katalog: "Lanjut ke Invoice" there always routes to a brand new invoice, which discarded an
            in-progress edit's pelanggan/sales/etc. */}
        <button
          type="button"
          onClick={() => setAddingProduct(true)}
          className="mt-1 block w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-line py-3 text-center font-sans text-[0.85rem] text-muted hover:border-moss hover:bg-[#fbfaf5] hover:text-moss-deep"
        >
          + Tambah Produk
        </button>
        {pickingJasa ? (
          <div className="mt-2 flex flex-wrap items-center gap-2.5 rounded-xl border-[1.5px] border-dashed border-accent-700 bg-accent-100 p-3">
            <div className="min-w-[200px] flex-1">
              <Select
                value=""
                onChange={(e) => {
                  const j = jasaOptions?.find((o) => o._id === e.target.value);
                  if (!j) return;
                  addItem(makeJasaCartItem(j));
                  setPickingJasa(false);
                }}
              >
                <option value="">
                  {jasaOptions === null ? "Memuat jasa..." : jasaOptions.length === 0 ? "Belum ada jasa aktif" : "— Pilih jasa —"}
                </option>
                {(jasaOptions ?? []).map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.nama}
                  </option>
                ))}
              </Select>
            </div>
            <button type="button" onClick={() => setPickingJasa(false)} className="cursor-pointer font-mono text-[0.72rem] underline">
              Batal
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setPickingJasa(true);
              if (jasaOptions === null) {
                fetch("/api/jasa?aktif=1")
                  .then((r) => (r.ok ? r.json() : []))
                  .then(setJasaOptions)
                  .catch(() => setJasaOptions([]));
              }
            }}
            className="mt-2 block w-full cursor-pointer rounded-xl border-[1.5px] border-dashed border-line py-3 text-center font-sans text-[0.85rem] text-muted hover:border-moss hover:bg-[#fbfaf5] hover:text-moss-deep"
          >
            + Tambah Jasa
          </button>
        )}
      </div>
      </FormSection>

      <FormSection label="Ringkasan">
      <div className="border border-line bg-[#f7f5ee] p-5">
        <h3 className="font-mono text-[0.7rem] uppercase tracking-wide text-muted">Estimasi Komisi Sales</h3>
        <div className="mt-1.5 font-mono text-[0.85rem]">
          Total komisi jika invoice ini lunas:{" "}
          <strong className="text-moss-deep">{rupiah(komisiTotal)}</strong>
        </div>
      </div>

      {/* Diskon Bulk: sits right above Total Diskon so both figures update when "Distribusikan" runs. Only fills lines at Rp0 diskon; manual per-line edits are never touched. */}
      <div className="mt-4 rounded-xl border-[1.5px] border-dashed border-accent-700 bg-accent-100 p-4">
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex-1" style={{ minWidth: 180 }}>
            <label className="mb-1.5 block font-mono text-[0.68rem] font-semibold uppercase tracking-wide text-accent-700">
              Diskon Bulk (Rp)
            </label>
            <CurrencyInput
              value={bulkDiskonInput}
              onChange={(v) => {
                setBulkDiskonInput(v);
                setBulkDiskonStatus(null);
              }}
              placeholder="0"
              showPrefix
            />
          </div>
          <Button type="button" onClick={applyBulkDiskon}>
            Distribusikan
          </Button>
        </div>
        <p className="mt-2.5 font-sans text-[0.74rem] text-accent-700">
          Dibagi otomatis ke setiap item, isi kelipatan Rp10.000.
        </p>
        {bulkDiskonStatus && (
          <p className={`mt-2 font-mono text-[0.76rem] ${bulkDiskonStatus.warn ? "text-danger" : "text-moss-deep"}`}>
            {bulkDiskonStatus.text}
          </p>
        )}
      </div>

      <div className="ml-auto mt-5 w-full max-w-[280px] font-mono text-[0.88rem]">
        <div className="flex justify-between py-1.5">
          <span>Total Belanja</span>
          <span>{rupiah(totalBelanja)}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span>Total Diskon</span>
          <span>{totalDiskon > 0 ? `− ${rupiah(totalDiskon)}` : rupiah(totalDiskon)}</span>
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
      </FormSection>

      <FormSection label="Syarat &amp; Ketentuan" last>
        <SyaratKetentuanEditor
          lines={skLines}
          onChange={setSkLines}
          templateLines={templateLines}
          isDefault={skIsDefault}
          frozen={skFrozen}
        />
      </FormSection>

      <FormCardActions>
        <Button variant="clay" disabled={saving || canceling} onClick={() => submit("unpaid")}>
          {saving ? "Menyimpan..." : mode === "edit" ? "Simpan Perubahan" : "Simpan & Kirim Invoice"}
        </Button>
        <Button variant="ghost" disabled={saving || canceling} onClick={() => submit("draft")}>
          Simpan sebagai Draft
        </Button>
        <Button variant="ghost" disabled={saving || canceling} onClick={handleCancel}>
          {canceling ? "Menghapus..." : "Batal"}
        </Button>
      </FormCardActions>

      <AddProductSidebar
        open={addingProduct}
        onClose={() => setAddingProduct(false)}
        invoiceId={mode === "edit" ? invoiceId : undefined}
      />
    </FormCard>
  );
}
