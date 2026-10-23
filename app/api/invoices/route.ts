import { NextRequest, NextResponse } from "next/server";
import { createInvoice, type CreateInvoiceInput } from "@/lib/services/createInvoice";
import { getSession } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  const session = await getSession();
  const body: CreateInvoiceInput = await req.json();
  try {
    // Owner-only "no plafon diskon" override — resolved here from the
    // session, never trusted from the request body. Per the user's
    // request 2026-09-05.
    const invoice = await createInvoice(body, { isOwner: session?.role === "owner" });
    return NextResponse.json(invoice, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal membuat invoice" },
      { status: 400 }
    );
  }
}
