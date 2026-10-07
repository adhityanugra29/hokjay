import Link from "next/link";
import { Panel, PanelHead, TableScroll } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/Button";
import { dbConnect } from "@/lib/db";
import { Jasa } from "@/models/Jasa";
import DeleteJasaButton from "@/components/produk/DeleteJasaButton";
import { getSession } from "@/lib/auth/session";
import { isProductDeleteAllowed } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

export default async function ProdukJasaPage() {
  await dbConnect();
  const [jasa, session] = await Promise.all([Jasa.find().sort({ nama: 1 }).lean(), getSession()]);
  // Owner-only, same as deleting a product — see DELETE /api/jasa/[id].
  const canDelete = isProductDeleteAllowed(session?.role);

  return (
    <Panel>
      <PanelHead title="Jasa">
        <LinkButton href="/produk/jasa/baru">+ Tambah Jasa</LinkButton>
      </PanelHead>
      <TableScroll>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              {["Nama Jasa", "Kode", "Status", ""].map((h) => (
                <th
                  key={h}
                  className="border-b border-line px-5 py-3 text-left font-mono text-[0.7rem] uppercase tracking-wide text-muted"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jasa.map((j) => (
              <tr key={String(j._id)} className="transition hover:bg-surface">
                <td className="border-b border-line px-5 py-4.5">
                  <div className="font-medium">{j.nama}</div>
                </td>
                <td className="border-b border-line px-5 py-4.5 font-mono text-[0.8rem]">{j.kode}</td>
                <td className="border-b border-line px-5 py-4.5">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold ${
                      j.aktif ? "border-accent-700 text-accent-700" : "border-line text-muted"
                    }`}
                  >
                    {j.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="border-b border-line px-5 py-4.5 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link href={`/produk/jasa/${j._id}/edit`} className="text-[0.8rem] font-bold underline">
                      Ubah
                    </Link>
                    {canDelete && <DeleteJasaButton jasaId={String(j._id)} jasaNama={j.nama} />}
                  </div>
                </td>
              </tr>
            ))}
            {jasa.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center font-mono text-sm text-muted">
                  Belum ada jasa.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </TableScroll>
    </Panel>
  );
}
