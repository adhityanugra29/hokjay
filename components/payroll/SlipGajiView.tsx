import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import Pill from "@/components/ui/Pill";
import { rupiah, formatDateShort } from "@/lib/format";
import type { SlipGaji } from "@/lib/payroll";

/** Read-only payslip for the logged-in Sales — no actions, Admin does all the paying. */
export default function SlipGajiView({ slip, salesNama }: { slip: SlipGaji | null; salesNama: string }) {
  if (!slip) {
    return (
      <Panel className="p-7">
        <p className="font-mono text-[0.85rem] text-muted">
          Data sales dengan nama <b className="text-ink">{salesNama}</b> belum terdaftar di roster Sales. Hubungi
          Admin untuk didaftarkan supaya slip gaji dan komisimu bisa muncul di sini.
        </p>
      </Panel>
    );
  }

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-3">
        <div className="border-2 border-ink bg-panel p-4.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Status Kepegawaian
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">
            {slip.statusKepegawaian === "tetap" ? "Tetap" : "Freelance"}
          </div>
        </div>
        {slip.statusKepegawaian === "tetap" && (
          <div className="border-2 border-line bg-panel p-4.5">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Gaji Pokok / Bulan
            </div>
            <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{rupiah(slip.gajiPokok)}</div>
          </div>
        )}
        <div className="border-2 border-line bg-panel p-4.5">
          <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            Total Komisi Diterima
          </div>
          <div className="mt-1.5 font-sans text-[1.4rem] font-extrabold">{rupiah(slip.totalKomisiDiterima)}</div>
        </div>
      </div>

      {slip.statusKepegawaian === "tetap" && (
        <Panel className="mb-5">
          <PanelHead title="Riwayat Gaji Pokok" />
          <TableScroll>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Periode
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Nominal
                  </th>
                  <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                    Tanggal Dibayar
                  </th>
                </tr>
              </thead>
              <tbody>
                {slip.riwayatGajiPokok.map((r) => (
                  <tr key={r.periode} className="hover:bg-[#fbfaf5]">
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.periode}</td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                      {rupiah(r.gajiPokok)}
                    </td>
                    <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">
                      {formatDateShort(r.tanggalBayar)}
                    </td>
                  </tr>
                ))}
                {slip.riwayatGajiPokok.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center font-mono text-sm text-muted">
                      Belum ada gaji pokok yang dibayarkan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableScroll>
        </Panel>
      )}

      <Panel>
        <PanelHead title="Riwayat Komisi Cair" />
        <TableScroll>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  No. Invoice
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Item
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Komisi
                </th>
                <th className="whitespace-nowrap border-b border-line px-5 py-4 text-left font-sans text-[0.8rem] font-medium text-muted">
                  Cair
                </th>
              </tr>
            </thead>
            <tbody>
              {slip.riwayatKomisi.map((r) => (
                <tr key={r.invoiceId} className="hover:bg-[#fbfaf5]">
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{r.nomor}</td>
                  <td className="border-b border-line px-5 py-4.5">{r.itemLabel}</td>
                  <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem] font-medium text-accent-700">
                    {rupiah(r.komisiBaris)}
                  </td>
                  <td className="border-b border-line px-5 py-4.5">
                    <Pill variant="paid">{formatDateShort(r.tanggalCair)}</Pill>
                  </td>
                </tr>
              ))}
              {slip.riwayatKomisi.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                    Belum ada komisi yang cair.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableScroll>
      </Panel>
    </>
  );
}
