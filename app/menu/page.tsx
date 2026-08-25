import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { isAllowedPage } from "@/lib/auth/access";
import { NAV_GROUPS } from "@/lib/nav";
import { dbConnect } from "@/lib/db";
import { Invoice } from "@/models/Invoice";
import { Product } from "@/models/Product";
import { StockMovement } from "@/models/StockMovement";
import { PurchaseBill } from "@/models/PurchaseBill";
import { OfficeExpenseRequest } from "@/models/OfficeExpenseRequest";
import MenuBackButton from "@/components/layout/MenuBackButton";
import LogoutButton from "@/components/layout/LogoutButton";
import Logo from "@/components/layout/Logo";

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

interface MenuItem {
  href: string;
  label: string;
  badge?: number;
}

/**
 * "7g" — full-screen mobile menu, reached from the bottom tab bar's "Menu"
 * tab. Starts from the same NAV_GROUPS the desktop sidebar shows (still
 * filtered through the identical isAllowedPage check), then — mobile-menu
 * only, doesn't touch the shared sidebar — splices in Material Order, Job
 * Order, and Supplier as their own rows under "Barang", matching the
 * 2026-08-25 mobile design doc's "7g". These are real existing pages
 * (currently reachable only via Purchasing's SubnavTabs); Job Order here is
 * still the existing office-expense-request feature (listrik/wifi/pulsa),
 * NOT the production-tracking concept the doc's "7k" describes — that one
 * was skipped per the user's confirmation 2026-08-25 (name conflict with a
 * real existing feature, would need its own design).
 */
export default async function MenuPage() {
  const session = await getSession();
  if (!session) return null;

  await dbConnect();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [invoiceCount, soldProductIds, materialOrderUnpaid, jobOrderPending] = await Promise.all([
    Invoice.countDocuments({ status: { $in: ["draft", "unpaid"] } }),
    StockMovement.distinct("product", { alasan: "Penjualan" }),
    PurchaseBill.countDocuments({ status: "belum_dibayar" }),
    OfficeExpenseRequest.countDocuments({ status: "diajukan" }),
  ]);
  const produkBaru = await Product.countDocuments({
    createdAt: { $gte: sevenDaysAgo },
    isCustom: { $ne: true },
    _id: { $nin: soldProductIds },
  });
  const counts = { invoiceCount, produkBaru };

  const visibleGroups = NAV_GROUPS.map((g) => ({
    label: g.label,
    items: g.items
      .filter((item) => isAllowedPage(session.role, item.href))
      .map(
        (item): MenuItem => ({
          href: item.href,
          label: item.label,
          badge: item.badge === "invoiceCount" ? counts.invoiceCount : item.badge === "produkBaru" ? counts.produkBaru : undefined,
        })
      ),
  })).filter((g) => g.label !== null && g.items.length > 0) as { label: string; items: MenuItem[] }[];

  const barang = visibleGroups.find((g) => g.label === "Barang");
  if (barang && isAllowedPage(session.role, "/purchasing")) {
    barang.items.push(
      { href: "/purchasing/tagihan", label: "Material Order", badge: materialOrderUnpaid || undefined },
      { href: "/purchasing/job-order", label: "Job Order", badge: jobOrderPending || undefined },
      { href: "/purchasing/supplier", label: "Supplier" }
    );
  }

  return (
    <>
      {/* Mobile — the actual "7g" menu */}
      <div className="flex min-h-[calc(100vh-58px)] flex-col bg-ink text-panel md:hidden">
        <div className="flex items-center justify-between gap-3 border-b-2 border-white/25 px-4 py-4">
          <div>
            <Logo tone="white" size="sm" />
            <div className="mt-2 font-sans text-[0.68rem] text-white/45">
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
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex min-h-[44px] items-center justify-between gap-2 bg-ink px-4 py-3.5 no-underline"
                  >
                    <b className="font-sans text-[0.85rem] text-white">{item.label}</b>
                    {!!item.badge && (
                      <span className="bg-accent px-1.5 py-0.5 font-sans text-[10px] font-bold text-white">{item.badge}</span>
                    )}
                  </Link>
                ))}
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
