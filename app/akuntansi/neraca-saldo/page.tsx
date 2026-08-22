import ReportDocument from "@/components/akuntansi/ReportDocument";
import SortableHeader from "@/components/ui/SortableHeader";
import { getTrialBalance } from "@/lib/akuntansi";
import { rupiah } from "@/lib/format";
import { parseSort, sortRows } from "@/lib/sort";
import { currentJakartaMonthYear, jakartaMonthEnd } from "@/lib/timezone";
import { MONTH_NAMES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const SORT_FIELDS = ["code", "name", "kelompok", "saldo"] as const;

export default async function NeracaSaldoPage({ searchParams }: PageProps<"/akuntansi/neraca-saldo">) {
  const sp = await searchParams;
  const hasSort = typeof sp.sort === "string" && (SORT_FIELDS as readonly string[]).includes(sp.sort);
  const { field, dir } = parseSort(sp, SORT_FIELDS, "code");

  const nowJakarta = currentJakartaMonthYear();
  const month = Number(sp.bulan) || nowJakarta.month;
  const year = Number(sp.tahun) || nowJakarta.year;
  const asOf = jakartaMonthEnd(year, month);

  const balancesRaw = await getTrialBalance({ to: asOf });
  const totalDebit = balancesRaw.reduce((s, b) => s + (b.normal === "debit" ? b.saldo : 0), 0);
  const totalCredit = balancesRaw.reduce((s, b) => s + (b.normal === "credit" ? b.saldo : 0), 0);
  const balanced = Math.abs(totalDebit - totalCredit) < 1;

  const filtered = balancesRaw.filter((b) => b.saldo !== 0);
  const balances = hasSort ? sortRows(filtered, field, dir) : filtered;

  return (
    <ReportDocument title="Neraca Saldo (Trial Balance)" periodLabel={`Sampai akhir ${MONTH_NAMES[month - 1]} ${year}`}>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <SortableHeader label="Kode" sortKey="code" currentSort={field} currentDir={dir} basePath="/akuntansi/neraca-saldo" searchParams={sp} />
              <SortableHeader label="Akun" sortKey="name" currentSort={field} currentDir={dir} basePath="/akuntansi/neraca-saldo" searchParams={sp} />
              <SortableHeader label="Kelompok" sortKey="kelompok" currentSort={field} currentDir={dir} basePath="/akuntansi/neraca-saldo" searchParams={sp} />
              <th className="whitespace-nowrap border-b border-line py-3 text-left font-sans text-[0.78rem] font-medium text-muted">
                Debit
              </th>
              <th className="whitespace-nowrap border-b border-line py-3 text-left font-sans text-[0.78rem] font-medium text-muted">
                Kredit
              </th>
            </tr>
          </thead>
          <tbody>
            {balances.map((b) => (
              <tr key={b.code}>
                <td className="border-b border-line px-5 py-2.5 font-mono text-[0.78rem]">{b.code}</td>
                <td className="border-b border-line px-5 py-2.5 font-medium">{b.name}</td>
                <td className="border-b border-line px-5 py-2.5 font-mono text-[0.72rem] text-muted">{b.kelompok}</td>
                <td className="border-b border-line px-5 py-2.5 text-right font-mono text-[0.78rem]">
                  {b.normal === "debit" ? rupiah(b.saldo) : ""}
                </td>
                <td className="border-b border-line px-5 py-2.5 text-right font-mono text-[0.78rem]">
                  {b.normal === "credit" ? rupiah(b.saldo) : ""}
                </td>
              </tr>
            ))}
            {balances.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada transaksi.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={3} className="border-t-2 border-ink px-5 py-3.5 font-serif font-semibold">
                Total
              </td>
              <td className="border-t-2 border-ink px-5 py-3.5 text-right font-mono text-[0.85rem] font-semibold">
                {rupiah(totalDebit)}
              </td>
              <td className="border-t-2 border-ink px-5 py-3.5 text-right font-mono text-[0.85rem] font-semibold">
                {rupiah(totalCredit)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className={`mt-3 font-mono text-[0.75rem] ${balanced ? "text-moss-deep" : "text-danger"}`}>
        {balanced ? "✓ Balance — debit = kredit" : "⚠ Tidak balance, ada yang perlu dicek"}
      </div>
    </ReportDocument>
  );
}
