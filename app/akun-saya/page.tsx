import PageHeader from "@/components/layout/PageHeader";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import { requireSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  purchasing: "Purchasing",
  admin: "Admin",
  owner: "Owner Hojay",
  super_admin: "Super Admin",
  manager: "Manager Hojay",
};

/**
 * "Akun Saya" — self-service password change, reachable by every role (see
 * isKomisiSayaAllowed-style override in lib/auth/access.ts: "/akun-saya" is
 * added to the "viewable by every role" list, same tier as "/" itself).
 * Distinct from Admin's account management at /admin/akun, which resets
 * *other* people's passwords and needs no current-password confirmation —
 * this one is each person changing their own, current-password-verified.
 */
export default async function AkunSayaPage() {
  const session = await requireSession();

  return (
    <>
      <PageHeader
        title="Akun Saya"
        subtitle={`${session.nama} · ${ROLE_LABEL[session.role] ?? session.role}`}
      />
      <div className="p-6 md:max-w-[560px] md:p-9">
        <ChangePasswordForm />
      </div>
    </>
  );
}
