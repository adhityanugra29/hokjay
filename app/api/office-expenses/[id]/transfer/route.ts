import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import { recordCashflow } from "@/lib/services/recordCashflow";
import { getSession } from "@/lib/auth/session";

/**
 * Records that the money has actually been sent — posts a normal
 * Operasional cashflow + journal entry (account 6300, same as the manual
 * expense form) so this reconciles into Keuangan/Akuntansi like any other
 * operational spend. Atomic status:"disetujui" guard prevents a double-post
 * from a retried/duplicate request, same pattern as /api/insentif/bayar.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/office-expenses/[id]/transfer">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();
  const session = await getSession();

  const nominal = Number(body.nominal) || 0;
  if (nominal <= 0) return NextResponse.json({ error: "Nominal transfer harus lebih dari 0" }, { status: 400 });
  if (!body.buktiUrl) return NextResponse.json({ error: "Bukti transfer wajib diupload" }, { status: 400 });

  const tanggal = body.tanggal ? new Date(body.tanggal) : new Date();

  const request = await OfficeExpenseRequest.findOneAndUpdate(
    { _id: id, status: "disetujui" },
    {
      status: "dibayar",
      buktiTransferUrl: body.buktiUrl,
      buktiTransferTanggal: tanggal,
      buktiTransferNominal: nominal,
      buktiTransferOleh: session?.nama,
    }
  );
  if (!request) {
    return NextResponse.json({ error: "Request tidak ditemukan atau belum disetujui" }, { status: 400 });
  }

  await recordCashflow({
    tipe: "keluar",
    keterangan: `Kebutuhan kantor: ${request.nama}`,
    kategori: "Operasional",
    akunKode: "6-2000",
    referensi: String(request._id),
    nominal,
    tanggal,
    buktiUrl: body.buktiUrl,
  });

  return NextResponse.json({ ok: true });
}
