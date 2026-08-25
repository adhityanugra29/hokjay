import { Counter } from "@/models/Counter";
import { currentJakartaMonthYear } from "@/lib/timezone";
import { getPlateCode } from "@/lib/platNomor";

/** Atomically allocates the next number in a named sequence. */
async function nextSeq(name: string): Promise<number> {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" }
  );
  return doc!.seq;
}

/** "202608" for August 2026 (Jakarta time) — the counter resets every month, one sequence per YYYYMM. */
function invoiceYearMonth(): string {
  const { year, month } = currentJakartaMonthYear();
  return `${year}${String(month).padStart(2, "0")}`;
}

/**
 * Format: INV-YYYYMM#### (e.g. INV-2026080001) — resets to 0001 each month,
 * confirmed with the user 2026-08-22. Invoices created before this change
 * keep their old INV-#### numbers; only new ones use this format.
 */
export async function nextInvoiceNumber(): Promise<string> {
  const yyyymm = invoiceYearMonth();
  const seq = await nextSeq(`invoice:${yyyymm}`);
  return `INV-${yyyymm}${String(seq).padStart(4, "0")}`;
}

/**
 * Read-only preview of what the next invoice number will be, for display in
 * the "Buat Invoice Baru" form. Doesn't increment the counter — the real
 * number is only allocated by nextInvoiceNumber() when the invoice is
 * actually saved, so under concurrent creation this preview can occasionally
 * be off by one.
 */
export async function peekNextInvoiceNumber(): Promise<string> {
  const yyyymm = invoiceYearMonth();
  const doc = await Counter.findById(`invoice:${yyyymm}`);
  const seq = (doc?.seq ?? 0) + 1;
  return `INV-${yyyymm}${String(seq).padStart(4, "0")}`;
}

/**
 * Format: {kode plat kota}{YY}{MM}{4-digit seq} — e.g. "B26080001" for a
 * Jakarta customer created August 2026, per the user's request 2026-08-25.
 * Kota's plate code comes from lib/platNomor.ts (falls back to "B" when
 * kota is empty/unrecognized — Kota is optional on the customer form).
 * The 4-digit sequence resets per plat-code per month, matching the
 * per-bucket reset convention already used elsewhere (nextInvoiceNumber,
 * nextProductSku).
 */
export async function nextCustomerCode(kota?: string): Promise<string> {
  const plat = getPlateCode(kota);
  const { year, month } = currentJakartaMonthYear();
  const yy = String(year).slice(-2);
  const mm = String(month).padStart(2, "0");
  const seq = await nextSeq(`customer:${plat}:${year}${mm}`);
  return `${plat}${yy}${mm}${String(seq).padStart(4, "0")}`;
}

export async function nextPurchaseRequestCode(): Promise<string> {
  const seq = await nextSeq("purchase-request");
  return `PR-${String(seq).padStart(4, "0")}`;
}

/** "Material Order" (formerly "Tagihan Pembelian") — renamed 2026-08-23; old records keep their PB- numbers. */
export async function nextPurchaseBillCode(): Promise<string> {
  const seq = await nextSeq("material-order");
  return `MO-${String(seq).padStart(4, "0")}`;
}

/** "Job Order" (formerly "Kebutuhan Kantor") — office operational expense requests. */
export async function nextJobOrderCode(): Promise<string> {
  const seq = await nextSeq("job-order");
  return `JO-${String(seq).padStart(4, "0")}`;
}

/** Purchasing's restocking PO — design "6a", see models/PurchaseOrder.ts. Resets monthly like INV-. */
export async function nextPurchaseOrderCode(): Promise<string> {
  const yyyymm = invoiceYearMonth();
  const seq = await nextSeq(`purchase-order:${yyyymm}`);
  return `PO-${yyyymm}${String(seq).padStart(4, "0")}`;
}

/** Inventaris Kantor asset tag — design "6c", see models/OfficeAsset.ts. Never resets. */
export async function nextAssetCode(): Promise<string> {
  const seq = await nextSeq("office-asset");
  return `AST-${String(seq).padStart(3, "0")}`;
}

/**
 * Derives a short SKU prefix from the product's CATEGORY (per the user's
 * request 2026-08-25 — was previously derived from the product name's
 * initials). Multi-word categories use each word's initial (e.g. "Working
 * Table" -> "WT"); a single-word category uses its first 3 letters instead
 * (e.g. "Kompor" -> "KOM") since a lone initial would be too ambiguous. The
 * sequence is per-prefix so every category gets its own 001, 002, ...
 * numbering, e.g. "WT_001".
 */
export async function nextProductSku(category: string): Promise<string> {
  const words = category.trim().split(/\s+/).filter(Boolean);
  let letters: string;
  if (words.length > 1) {
    letters = words
      .map((w) => w.replace(/[^A-Za-z]/g, "")[0] ?? "")
      .join("")
      .toUpperCase();
  } else {
    letters = (words[0] ?? "").replace(/[^A-Za-z]/g, "").toUpperCase();
  }
  const prefix = words.length > 1 ? (letters || "PRD").slice(0, 4) : (letters || "PRD").slice(0, 3).padEnd(2, "X");
  const seq = await nextSeq(`sku:${prefix}`);
  return `${prefix}_${String(seq).padStart(3, "0")}`;
}
