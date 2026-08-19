import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { createInvoice, type CreateInvoiceInput } from "@/lib/services/createInvoice";

export async function GET(req: NextRequest) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();

  const filter: Record<string, unknown> = {};
  if (search) {
    filter.$or = [
      { nomor: { $regex: search, $options: "i" } },
      { "customer.nama": { $regex: search, $options: "i" } },
    ];
  }

  const invoices = await Invoice.find(filter).sort({ createdAt: -1 });
  return NextResponse.json(invoices);
}

export async function POST(req: NextRequest) {
  const body: CreateInvoiceInput = await req.json();
  try {
    const invoice = await createInvoice(body);
    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat invoice" },
      { status: 400 }
    );
  }
}
