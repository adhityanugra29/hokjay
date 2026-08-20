import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import EditInvoiceLoader from "@/components/invoice/EditInvoiceLoader";
import type { CartItem } from "@/components/cart/CartProvider";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Customer } from "@/models/Customer";
import { Sales } from "@/models/Sales";
import { Courier } from "@/models/Courier";
import { ShippingZone } from "@/models/ShippingZone";
import { Product } from "@/models/Product";

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

  // If this invoice was already finalized, its qty is still deducted from
  // stock right now — add it back for display so the field shows what will
  // actually be available once the edit is saved (updateInvoice reverses
  // the old deduction before re-applying the edited one).
  const wasFinalized = invoice.status === "unpaid";

  const cartItems: CartItem[] = invoice.items.map((item) => {
    const product = item.product ? productMap.get(String(item.product)) : undefined;
    const liveStok = product ? product.stok + (wasFinalized ? item.qty : 0) : 999999;
    return {
      productId: item.product ? String(item.product) : `custom-${item.namaSnapshot}`,
      name: item.namaSnapshot,
      hargaJual: item.hargaJual,
      hargaMinimum: item.hargaMinimumSnapshot,
      komisiNominal: item.komisiPerItemSnapshot,
      stok: liveStok,
      qty: item.qty,
      diskonPerUnit: item.diskonPerUnit,
      isCustom: item.isCustom,
      kondisi: (product?.kondisi as "baru" | "bekas") ?? "baru",
    };
  });

  const [customers, salesList, couriers, zones] = await Promise.all([
    Customer.find().sort({ nama: 1 }).lean(),
    Sales.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Courier.find().sort({ name: 1 }).lean(),
    ShippingZone.find().sort({ cost: 1 }).lean(),
  ]);

  const selectedCourier = couriers.find((c) => c.name === invoice.kurir);
  // Invoice only stores the ongkosKirim amount, not which zone it came
  // from — best-effort match by cost so editing pre-selects it.
  const selectedZone = zones.find((z) => z.cost === (invoice.ongkosKirim ?? 0));

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
            zonaId: selectedZone ? String(selectedZone._id) : undefined,
            tanggalInvoice: invoice.tanggalInvoice ? invoice.tanggalInvoice.toISOString().slice(0, 10) : undefined,
            tanggalKirim: invoice.tanggalKirim ? invoice.tanggalKirim.toISOString().slice(0, 10) : undefined,
            shipAddress: invoice.shipAddress ?? undefined,
          }}
          customers={customers.map((c) => ({ _id: String(c._id), nama: c.nama, alamat: c.alamat, whatsapp: c.whatsapp }))}
          salesList={salesList.map((s) => ({ _id: String(s._id), nama: s.nama }))}
          couriers={couriers.map((c) => ({ _id: String(c._id), name: c.name }))}
          zones={zones.map((z) => ({ _id: String(z._id), name: z.name, cost: z.cost }))}
        />
      </div>
    </>
  );
}
