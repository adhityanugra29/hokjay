import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { isAllowedPage } from "@/lib/auth/access";
import { NAV_GROUPS } from "@/lib/nav";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { LOW_STOCK_THRESHOLD } from "@/lib/constants";
import MenuBackButton from "@/components/layout/MenuBackButton";
import LogoutButton from "@/components/layout/LogoutButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  sales: "Sales",
  finance: "Finance",
  purchasing: "Purchasing",
  admin: "Admin",
};

/**
 * "7g" — full-screen mobile menu, reached from the bottom tab bar's "Menu"
 * tab. Same content the desktop sidebar already shows (NAV_GROUPS, filtered
 * through the identical isAllowedPage check), just laid out as a dark
 * full-page grid instead of a 248px rail — see the 2026-08-24 mobile design
 * doc's "7g". Reachable on desktop too (direct URL), where it shows a short
 * redirect notice instead since the sidebar already covers this there.
 */
export default async function MenuPage() {
  const session = await getSession();
  if (!session) return null;

  await dbConnect();
  const [invoiceCount, lowStock] = await Promise.all([
    Invoice.countDocuments({ status: { $in: ["draft", "unpaid"] } }),
    Product.countDocuments({ stok: { $lte: LOW_STOCK_THRESHOLD }, isCustom: { $ne: true } }),
  ]);
  const counts = { invoiceCount, lowStock };

  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((item) => isAllowedPage(session.role, item.href)),
  })).filter((g) => g.items.length > 0 && g.label !== null);

  return (
    <>
      {/* Mobile — the actual "7g" menu */}
      <div className="flex min-h-[calc(100vh-58px)] flex-col bg-ink text-panel md:hidden">
        <div className="flex items-center justify-between gap-3 border-b-2 border-white/25 px-4 py-4">
          <div>
            <div className="font-sans text-[1.05rem] font-extrabold tracking-tight text-white">CV HORECA JAYA</div>
            <div className="mt-1 font-sans text-[0.68rem] text-white/45">
              {session.nama} · {ROLE_LABEL[session.role] ?? session.role}
            </div>
          </div>
          <MenuBackButton />
        </div>

        <div className="flex-1">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <div className="px-4 pb-1.5 pt-4 font-sans text-[9.5px] font-bold uppercase tracking-[0.16em] text-accent">
                {group.label}
              </div>
              <div className="grid grid-cols-2 gap-px bg-white/15">
                {group.items.map((item) => {
                  const badgeValue = item.badge === "invoiceCount" ? counts.invoiceCount : counts.lowStock;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex min-h-[44px] items-center justify-between gap-2 bg-ink px-4 py-3.5 no-underline"
                    >
                      <b className="font-sans text-[0.85rem] text-white">{item.label}</b>
                      {item.badge && badgeValue > 0 && (
                        <span className="bg-accent px-1.5 py-0.5 font-sans text-[10px] font-bold text-white">{badgeValue}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-white/20">
          <LogoutButton className="flex w-full min-h-[44px] items-center justify-start px-4 py-3.5 font-sans text-[0.85rem] font-bold text-accent">
            Keluar
          </LogoutButton>
        </div>
      </div>

      {/* Desktop — this page is a mobile-only concept, sidebar already covers it */}
      <div className="hidden min-h-[60vh] flex-col items-center justify-center gap-3 px-9 text-center md:flex">
        <div className="font-sans text-[1.1rem] font-extrabold">Menu ini untuk tampilan ponsel</div>
        <p className="max-w-[420px] font-sans text-[0.85rem] text-muted">
          Di layar besar semua modul sudah ada di sidebar kiri.
        </p>
        <Link href="/" className="font-sans text-[0.8rem] text-accent underline underline-offset-2">
          Kembali ke Beranda
        </Link>
      </div>
    </>
  );
}
