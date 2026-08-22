import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import { PurchaseRequest, PURCHASE_REQUEST_STATUSES } from "@/models/PurchaseRequest";

/** Purchasing updates a request's status as they work it (diproses/dibatalkan) — "dibeli" is set automatically when a PurchaseBill is created from it, see /api/purchase-bills. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/purchase-requests/[id]">) {
  await dbConnect();
  const { id } = await ctx.params;
  const body = await req.json();

  const request = await PurchaseRequest.findById(id);
  if (!request) return NextResponse.json({ error: "Request tidak ditemukan" }, { status: 404 });

  if (body.status !== undefined) {
    if (!PURCHASE_REQUEST_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
    }
    request.status = body.status;
  }
  if (body.catatan !== undefined) request.catatan = body.catatan;

  await request.save();
  return NextResponse.json(request);
}
