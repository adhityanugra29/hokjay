import PageHeader from "@/components/layout/PageHeader";
import InvoiceForm from "@/components/invoice/InvoiceForm";
import { dbConnect } from "@/lib/db";
import { Customer } from "@/models/Customer";
import { Sales } from "@/models/Sales";
import { Courier } from "@/models/Courier";
import { peekNextInvoiceNumber } from "@/lib/counters";
import { getSession } from "@/lib/auth/session";
import { customerVisibilityFilter } from "@/lib/pelanggan";

export const dynamic = "force-dynamic";

export default async function InvoiceBaruPage() {
  await dbConnect();
  const session = await getSession();
  // Same per-sales customer privacy as /pelanggan and the customer-search
  // API (2026-08-27) — without this, a plain "sales" account could still
  // pick another rep's customer straight from this dropdown. Fetched
  // before the Promise.all below since the filter itself depends on it.
  const [customers, salesList, couriers, nextNumber] = await Promise.all([
    Customer.find(customerVisibilityFilter(session)).sort({ nama: 1 }).lean(),
    Sales.find({ aktif: true }).sort({ nama: 1 }).lean(),
    Courier.find().sort({ name: 1 }).lean(),
    peekNextInvoiceNumber(),
  ]);

  return (
    <>
      <PageHeader title="Buat Invoice Baru" subtitle={`NOMOR OTOMATIS · ${nextNumber}`} />
      <div className="p-6 md:p-9">
        <InvoiceForm
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
          nextNumberHint={nextNumber}
          currentUser={session ? { nama: session.nama, role: session.role } : null}
        />
      </div>
    </>
  );
}
