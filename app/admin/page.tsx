import CategoryManager from "@/components/admin/CategoryManager";
import { getSession } from "@/lib/auth/session";

// Owner-only, matching app/katalog/page.tsx's CAN_FLASH_SALE_ROLES/
// app/api/products/[id]/komisi-bekas/route.ts. Per the user's request
// 2026-09-03. This page itself stays reachable by every admin-level role
// (Manager included) — only the Komisi Bekas field within it is gated.
const KOMISI_BEKAS_ROLES = ["owner", "super_admin"];

export default async function AdminKategoriPage() {
  const session = await getSession();
  const isOwner = !!session && KOMISI_BEKAS_ROLES.includes(session.role);
  return <CategoryManager isOwner={isOwner} />;
}
