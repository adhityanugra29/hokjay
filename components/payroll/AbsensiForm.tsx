"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, PanelHead } from "@/components/ui/Panel";
import { Input } from "@/components/ui/Form";

interface KaryawanOption {
  _id: string;
  nama: string;
  jabatan?: string;
}

interface AbsensiRow {
  _id: string;
  karyawan: string;
}

/** Admin marks who was hadir on a given day — see models/Absensi.ts. */
export default function AbsensiForm({
  tanggal,
  karyawanList,
  hadirRows,
}: {
  tanggal: string;
  karyawanList: KaryawanOption[];
  hadirRows: AbsensiRow[];
}) {
  const router = useRouter();
  const [hadirMap, setHadirMap] = useState<Map<string, string>>(
    () => new Map(hadirRows.map((r) => [r.karyawan, r._id]))
  );
  const [busyId, setBusyId] = useState<string | null>(null);

  function changeTanggal(value: string) {
    router.push(`/payroll/absensi?tanggal=${value}`);
  }

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

  return (
    <Panel>
      <PanelHead title="Absensi Harian">
        <Input type="date" value={tanggal} onChange={(e) => changeTanggal(e.target.value)} className="w-auto" />
      </PanelHead>
      <div className="divide-y divide-line">
        {karyawanList.map((k) => {
          const hadir = hadirMap.has(k._id);
          return (
            <label
              key={k._id}
              className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 hover:bg-[#fbfaf5]"
            >
              <div>
                <div className="font-sans text-[0.9rem] font-semibold">{k.nama}</div>
                {k.jabatan && <div className="font-mono text-[0.72rem] text-muted">{k.jabatan}</div>}
              </div>
              <input
                type="checkbox"
                checked={hadir}
                disabled={busyId === k._id}
                onChange={() => toggle(k._id)}
                className="h-5 w-5 accent-accent"
              />
            </label>
          );
        })}
        {karyawanList.length === 0 && (
          <div className="px-5 py-8 text-center font-mono text-sm text-muted">
            Belum ada karyawan aktif. Tambahkan di tab Karyawan.
          </div>
        )}
      </div>
    </Panel>
  );
}
