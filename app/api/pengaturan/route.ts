import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Pengaturan, DEFAULT_SYARAT_KETENTUAN } from "@/models/Pengaturan";
import { postKasAwal } from "@/lib/services/journal";

export async function GET() {
  await dbConnect();
  const doc = (await Pengaturan.findById("singleton")) ?? (await Pengaturan.create({ _id: "singleton" }));
  // Backfill for the singleton doc that already existed (since 2026-08-20,
  // Kas Awal only) before `syaratKetentuan` was added — a Mongoose schema
  // `default` only applies when a document is newly CREATED, never
  // retroactively to one already sitting in the database (same class of
  // gap as Customer's kota/provinsi, see models/Customer.ts's own doc
  // comment). Without this, both this settings form and every Invoice PDF
  // silently saw an empty Syarat & Ketentuan forever. Self-heals once,
  // here, rather than needing a one-off migration script.
  if (doc.syaratKetentuan === undefined) {
    doc.syaratKetentuan = DEFAULT_SYARAT_KETENTUAN;
    await doc.save();
  }
  return NextResponse.json(doc);
}

export async function PUT(req: NextRequest) {
  await dbConnect();
  const body = await req.json();

  // Two independent sub-forms share this one singleton doc (Kas Awal,
  // Syarat & Ketentuan) — only touch the fields actually sent, so saving
  // one doesn't clobber the other. Per the user's request 2026-09-19.
  const update: Record<string, unknown> = {};

  if (body.kasAwal !== undefined) {
    const kasAwal = Number(body.kasAwal ?? 0);
    const kasAwalTanggal = body.kasAwalTanggal ? new Date(body.kasAwalTanggal) : new Date();
    if (kasAwal < 0) {
      return NextResponse.json({ error: "Kas awal tidak boleh negatif" }, { status: 400 });
    }
    update.kasAwal = kasAwal;
    update.kasAwalTanggal = kasAwalTanggal;
  }

  if (body.syaratKetentuan !== undefined) {
    update.syaratKetentuan = String(body.syaratKetentuan);
  }

  try {
    const doc = await Pengaturan.findByIdAndUpdate("singleton", update, { upsert: true, new: true });
    if (update.kasAwal !== undefined) {
      await postKasAwal(update.kasAwal as number, update.kasAwalTanggal as Date);
    }
    return NextResponse.json(doc);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal menyimpan pengaturan" },
      { status: 400 }
    );
  }
}
