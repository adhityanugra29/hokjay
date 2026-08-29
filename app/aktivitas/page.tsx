import Link from "next/link";
import PageHeader from "@/components/layout/PageHeader";
import NavIcon from "@/components/layout/NavIcons";
import { getActivityLog, type ActivityType } from "@/lib/activity";
import { formatDateFull } from "@/lib/format";

export const dynamic = "force-dynamic";

const TYPE_META: Record<ActivityType, { icon: "document" | "box" | "split" | "flame"; color: string }> = {
  "invoice-lunas": { icon: "document", color: "text-moss-deep" },
  "produk-baru": { icon: "box", color: "text-ink" },
  "komisi-cair": { icon: "split", color: "text-accent" },
  "flash-sale": { icon: "flame", color: "text-accent" },
};

function relativeTime(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay} hari lalu`;
  return formatDateFull(date);
}

/** Beranda's bell-icon destination — a real activity log, not a redirect to /follow-up. See confirmation with the user 2026-08-22. */
export default async function AktivitasPage() {
  const entries = await getActivityLog(50);

  return (
    <>
      <PageHeader
        title="Aktivitas"
        subtitle="Riwayat kejadian penting — invoice lunas, produk baru, dan komisi yang sudah dibayarkan."
      />
      <div className="p-6 md:p-9">
        {entries.map((e) => {
          const meta = TYPE_META[e.type];
          return (
            <Link
              key={e.id}
              href={e.href}
              className="grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-line py-3.5 no-underline hover:bg-[#fbfaf5]"
            >
              <div className={`flex h-9 w-9 items-center justify-center border border-line ${meta.color}`}>
                <NavIcon name={meta.icon} size={16} />
              </div>
              <div>
                <div className="font-sans text-[0.9rem] font-bold text-ink">{e.title}</div>
                <div className="mt-0.5 font-mono text-[0.75rem] text-muted">{e.detail}</div>
              </div>
              <div className="whitespace-nowrap font-mono text-[0.72rem] text-muted">
                {relativeTime(e.tanggal)}
              </div>
            </Link>
          );
        })}
        {entries.length === 0 && (
          <div className="border-b border-line py-10 text-center font-mono text-sm text-muted">
            Belum ada aktivitas.
          </div>
        )}
      </div>
    </>
  );
}
