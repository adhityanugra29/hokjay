import PageHeader from "@/components/layout/PageHeader";
import PengirimanClient from "@/components/pengiriman/PengirimanClient";
import { getPengirimanData } from "@/lib/pengiriman";
import { getSession } from "@/lib/auth/session";
import { Courier } from "@/models/Courier";
import { dbConnect } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Pengiriman (TASK-046, mockup docs/SDD/mockups/pengiriman-v1.html) — the
 * dedicated shipping page. Replaces the old `/follow-up?view=kirim` branch
 * (that URL now redirects here). Reachable by every role like /follow-up
 * was; a plain "sales" only receives their own invoices (see
 * getPengirimanData → invoiceVisibilityFilter).
 */
export default async function PengirimanPage() {
  const session = await getSession();
  const { todo, sent } = await getPengirimanData(session);

  await dbConnect();
  const couriers = (await Courier.find().sort({ name: 1 }).lean()).map((c) => ({ _id: String(c._id), name: c.name }));

  return (
    <>
      <PageHeader
        title="Pengiriman"
        subtitle={
          session?.role === "sales"
            ? "PENGIRIMAN UNTUK INVOICE ANDA"
            : "SEMUA INVOICE YANG PERLU DIKIRIM · LUNAS → SUDAH DP → BELUM BAYAR"
        }
      />
      <PengirimanClient todo={todo} sent={sent} couriers={couriers} />
    </>
  );
}
