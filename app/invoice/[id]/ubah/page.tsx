import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import EditInvoiceLoader from "@/components/invoice/EditInvoiceLoader";
import type { CartItem } from "@/components/cart/CartProvider";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { Sales } from "@/models/Sales";
import { Courier } from "@/models/Courier";
import { Product } from "@/models/Product";
import { JournalEntry } from "@/models/JournalEntry";
import { getSession } from "@/lib/auth/session";
import { customerVisibilityFilter } from "@/lib/pelanggan";

export const dynamic = "force-dynamic";

export default async function InvoiceUbahPage({ params }: PageProps<"/invoice/[id]/ubah">) {
  const { id } = await params;
  await dbConnect();

  const invoice = await Invoice.findById(id);
  if (!invoice) notFound();
  if (invoice.status === "paid") notFound(); // paid invoices aren't editable — see lib/services/updateInvoice.ts

  const productIds = invoice.items.filter((i) => i.product).map((i) => i.product);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map((p) => [String(p._id), p]));

  // Since 2026-08-27, a new-style unpaid invoice never deducted stock, so
  // there's nothing to add back here. The one exception is an invoice
  // finalized under the pre-2026-08-27 rule (stock deducted at "unpaid"
  // time) — detected via its "invoice-finalisasi" journal entry — whose
  // qty is still deducted from stock right now; add it back for display so
  // the field shows what will actually be available once the edit is
  // saved (updateInvoice reverses that old deduction on save).
  const wasFinalized =
    invoice.status === "unpaid" &&
    (await JournalEntry.exists({ invoice: invoice._id, sumberTipe: "invoice-finalisasi" }));

  const cartItems: CartItem[] = invoice.items.map((item) => {
    const product = item.product ? productMap.get(String(item.product)) : undefined;
    const liveStok = product ? product.stok + (wasFinalized ? item.qty : 0) : 999999;
    return {
      productId: item.product ? String(item.product) : `custom-${item.namaSnapshot}`,
      name: item.namaSnapshot,
      hargaJual: item.hargaJual,
      hargaMinimum: item.hargaMinimumSnapshot,
      // No snapshot for this one (unlike hargaMinimumSnapshot) — falls back
      // to the live product's current hargaRekomendasi; custom items (no
      // product) just don't get the "Pakai Rekomendasi" shortcut.
      hargaRekomendasi: product?.hargaRekomendasi,
      komisiNominal: item.komisiPerItemSnapshot,
      stok: liveStok,
      qty: item.qty,
      diskonPerUnit: item.diskonPerUnit,
      isCustom: item.isCustom,
      kondisi: (product?.kondisi as "baru" | "bekas") ?? "baru",
    };
  });

  // Same per-sales customer privacy as /pelanggan and /invoice/baru
  // (2026-08-27) — but this invoice's own customer must always be
  // included even if it's not normally visible to the editing sales rep
  // (any role can open any invoice's edit page, not just their own), or
  // the picker would silently blank out the already-assigned customer.
  const session = await getSession();
  const baseFilter = customerVisibilityFilter(session);
  const customerFilter = invoice.customer?.ref
    ? { $or: [baseFilter, { _id: invoice.customer.ref }] }
    : baseFilter;

  const [customers, salesList, couriers] = await Promise.all([
    Customer.find(customerFilter).sort({ nama: 1 }).lean(),
    Sales.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Courier.find().sort({ name: 1 }).lean(),
  ]);

  const selectedCourier = couriers.find((c) => c.name === invoice.kurir);

  return (
    <>
      <PageHeader title={`Ubah ${invoice.nomor}`} subtitle="PERUBAHAN LANGSUNG TERSIMPAN, NOMOR TETAP SAMA" />
      <div className="p-6 md:p-9">
        <EditInvoiceLoader
          invoiceId={id}
          nomor={invoice.nomor}
          items={cartItems}
          initial={{
            customerId: invoice.customer?.ref ? String(invoice.customer.ref) : undefined,
            salesId: invoice.sales?.ref ? String(invoice.sales.ref) : undefined,
            kurirId: selectedCourier ? String(selectedCourier._id) : undefined,
            ongkosKirim: invoice.ongkosKirim ?? 0,
            tanggalInvoice: invoice.tanggalInvoice ? invoice.tanggalInvoice.toISOString().slice(0, 10) : undefined,
            tanggalKirim: invoice.tanggalKirim ? invoice.tanggalKirim.toISOString().slice(0, 10) : undefined,
            shipAddress: invoice.shipAddress ?? undefined,
          }}
          customers={customers.map((c) => ({
            _id: String(c._id),
            nama: c.nama,
            alamat: c.alamat,
            whatsapp: c.whatsapp,
            provinsi: c.provinsi ?? "",
            kota: c.kota ?? "",
          }))}
          salesList={salesList.map((s) => ({ _id: String(s._id), nama: s.nama }))}
          couriers={couriers.map((c) => ({ _id: String(c._id), name: c.name }))}
        />
      </div>
    </>
  );
}
