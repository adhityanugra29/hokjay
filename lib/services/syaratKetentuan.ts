import { Pengaturan } from "@/models/Pengaturan";
import { normalizeSyarat, validateSyarat } from "@/lib/syaratKetentuan";

/**
 * The global template — Pengaturan.syaratKetentuan, edited at Admin →
 * Invoice. Normalized the same way a saved invoice's text is, so the two
 * can be compared directly.
 */
export async function getSyaratKetentuanTemplate(): Promise<string> {
  const pengaturan = await Pengaturan.findById("singleton").lean();
  return normalizeSyarat(pengaturan?.syaratKetentuan);
}

/**
 * Resolves what to store in Invoice.syaratKetentuan on save. Per the
 * user's request 2026-10-12:
 *
 *  - `undefined` stored = "follow the template live" — only ever allowed
 *    while the invoice is a draft.
 *  - The moment an invoice is sent (status leaves draft), the text in
 *    force right then is frozen onto the invoice, so a later template
 *    change never alters an invoice already sent to a customer. Once
 *    frozen, it stays frozen (the form always sends the explicit text for
 *    a non-draft invoice).
 *
 * `input`: undefined = leave as is, null = "back to the template",
 * string = this invoice's own text ("" = deliberately no S&K block).
 */
export async function resolveSyaratKetentuanForSave(opts: {
  input: string | null | undefined;
  existing?: { status: string; syaratKetentuan?: string | null };
  finalStatus: "draft" | "unpaid";
}): Promise<string | undefined> {
  const { input, existing, finalStatus } = opts;
  const template = await getSyaratKetentuanTemplate();

  let value: string | undefined;
  if (input === undefined) {
    value = existing?.syaratKetentuan ?? undefined;
  } else if (input === null) {
    value = undefined;
  } else {
    value = normalizeSyarat(input);
    // The template itself is the owner's own text — only a custom edit is
    // held to the size limits.
    if (value !== template) {
      const err = validateSyarat(value);
      if (err) throw new Error(err);
    }
  }

  const alreadySent = existing !== undefined && existing.status !== "draft";
  if (value === undefined && (finalStatus !== "draft" || alreadySent)) value = template;
  return value;
}
