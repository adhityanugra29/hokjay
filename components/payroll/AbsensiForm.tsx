"use client";

import { useState } from "react";
import Link from "next/link";
import { Avatar, PaySwitch, bigFigureCls, eyebrowCls, heroCls } from "@/components/payroll/ui";
import { periodeLabel } from "@/lib/payrollPeriod";

interface KaryawanOption {
  _id: string;
  nama: string;
  jabatan?: string;
}

interface AbsensiRow {
  _id: string;
  karyawan: string;
}

const DAY_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

/**
 * Admin marks who was hadir on a given day — see models/Absensi.ts.
 * Redesigned 2026-10-01 to match the rest of Payroll (mockup-approved): the
 * month comes from PayrollNav's shared stepper, the day from the strip of
 * dates below the summary card (plain links, `?periode=&tanggal=`), and each
 * karyawan is one tappable row with a Hadir switch. Every tap still saves
 * immediately (POST/DELETE /api/absensi), exactly as before. The server page
 * mounts this with key={tanggal} so the hadir state resets per day.
 */
export default function AbsensiForm({
  tanggal,
  periode,
  maxDay,
  karyawanList,
  hadirRows,
}: {
  tanggal: string;
  periode: string;
  /** Last selectable day-of-month in `periode` (today for the running month, else the month's last day). */
  maxDay: number;
  karyawanList: KaryawanOption[];
  hadirRows: AbsensiRow[];
}) {
  const [hadirMap, setHadirMap] = useState<Map<string, string>>(
    () => new Map(hadirRows.map((r) => [r.karyawan, r._id]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  const [y, m] = periode.split("-").map(Number);
  const dayNum = Number(tanggal.slice(8, 10));
  const dayLabel = `${DAY_SHORT[new Date(Date.UTC(y, m - 1, dayNum)).getUTCDay()]}, ${dayNum} ${periodeLabel(periode)}`;
  const hadirCount = karyawanList.filter((k) => hadirMap.has(k._id)).length;
  const pct = karyawanList.length ? Math.round((hadirCount / karyawanList.length) * 100) : 0;

  async function toggle(karyawanId: string) {
    setBusyId(karyawanId);
    try {
      const existingAbsensiId = hadirMap.get(karyawanId);
      if (existingAbsensiId) {
        await fetch(`/api/absensi/${existingAbsensiId}`, { method: "DELETE" });
        setHadirMap((prev) => {
          const next = new Map(prev);
          next.delete(karyawanId);
          return next;
        });
      } else {
        const res = await fetch("/api/absensi", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ karyawanId, tanggal }),
        });
        const row = await res.json();
        setHadirMap((prev) => new Map(prev).set(karyawanId, row._id));
      }
    } finally {
      setBusyId(null);
    }
  }

  const days = Array.from({ length: new Date(Date.UTC(y, m, 0)).getUTCDate() }, (_, i) => i + 1);

  return (
    <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
      <section className={heroCls}>
        <div className={eyebrowCls}>Hadir {dayLabel}</div>
        <div className={bigFigureCls}>
          {hadirCount}{" "}
          <span className="text-[0.5em] font-extrabold text-muted">dari {karyawanList.length} karyawan</span>
        </div>
        <p className="mt-1 font-sans text-[12.5px] text-muted">Dasar perhitungan gaji harian. Setiap ketukan langsung tersimpan.</p>
        <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-line" role="img" aria-label={`${pct} persen hadir`}>
          <div className="h-full rounded-full bg-[#087a52]" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <section className="min-w-0 rounded-2xl bg-panel shadow-sm">
        <div className="px-4 pb-2 pt-3.5 md:px-5">
          <h2 className="font-sans text-[0.98rem] font-extrabold">Absensi harian</h2>
          <div className="font-sans text-[12px] text-muted">{dayLabel}</div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-4 pb-2 md:px-5" role="group" aria-label="Pilih tanggal">
          {days.map((d) => {
            const dateStr = `${periode}-${String(d).padStart(2, "0")}`;
            const active = d === dayNum;
            const base =
              "flex w-[50px] shrink-0 flex-col items-center rounded-2xl py-1.5 text-center font-sans leading-tight no-underline";
            const dn = DAY_SHORT[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
            if (d > maxDay) {
              return (
                <span key={d} className={`${base} bg-surface opacity-35`} aria-hidden="true">
                  <small className="text-[10px] font-bold text-muted">{dn}</small>
                  <b className="text-[0.98rem] font-extrabold">{d}</b>
                </span>
              );
            }
            return (
              <Link
                key={d}
                href={`/payroll/absensi?periode=${periode}&tanggal=${dateStr}`}
                aria-current={active ? "date" : undefined}
                aria-label={`${dn} ${d}`}
                className={`${base} ${active ? "bg-ink text-paper" : "bg-surface text-ink hover:bg-line"}`}
              >
                <small className={`text-[10px] font-bold ${active ? "opacity-70" : "text-muted"}`}>{dn}</small>
                <b className="text-[0.98rem] font-extrabold">{d}</b>
              </Link>
            );
          })}
        </div>

        <div className="px-4 pb-1 md:px-5">
          {karyawanList.map((k) => {
            const hadir = hadirMap.has(k._id);
            return (
              <div
                key={k._id}
                className="grid min-h-[64px] grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border-t border-line py-3 first:border-t-0 md:grid-cols-[40px_minmax(0,1fr)_auto_auto]"
              >
                <div className="hidden md:block">
                  <Avatar nama={k.nama} />
                </div>
                <div className="min-w-0">
                  <div className="font-sans text-[0.92rem] font-extrabold wrap-anywhere">{k.nama}</div>
                  <div className="font-sans text-[11.5px] text-muted">{k.jabatan || "Tanpa jabatan"}</div>
                </div>
                <span className={`w-[52px] text-right font-sans text-[12px] font-extrabold ${hadir ? "text-[#087a52]" : "text-muted"}`}>
                  {hadir ? "Hadir" : "Belum"}
                </span>
                <PaySwitch checked={hadir} disabled={busyId === k._id} onChange={() => toggle(k._id)} label={`Hadir ${k.nama}`} />
              </div>
            );
          })}
          {karyawanList.length === 0 && (
            <div className="py-8 text-center font-sans text-[0.85rem] text-muted">
              Belum ada karyawan aktif. Tambahkan di tab Karyawan.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
