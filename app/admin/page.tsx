import CategoryManager from "@/components/admin/CategoryManager";
import { getSession } from "@/lib/auth/session";
import { isKomisiSettingAllowed } from "@/lib/auth/access";

// This page itself stays reachable by every admin-level role (Manager
// included) — only the Komisi Bekas field within it is gated, Owner-only
// (see lib/auth/access.ts's isKomisiSettingAllowed).
export default async function AdminKategoriPage() {
  const session = await getSession();
  const isOwner = isKomisiSettingAllowed(session?.role);
  return <CategoryManager isOwner={isOwner} />;
}
