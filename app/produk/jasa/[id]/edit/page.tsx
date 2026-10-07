import { notFound } from "next/navigation";
import PageHeader from "@/components/layout/PageHeader";
import JasaForm from "@/components/produk/JasaForm";
import { dbConnect } from "@/lib/db";
import { Jasa } from "@/models/Jasa";

export const dynamic = "force-dynamic";

export default async function JasaEditPage({ params }: PageProps<"/produk/jasa/[id]/edit">) {
  const { id } = await params;
  await dbConnect();
  const jasa = await Jasa.findById(id).lean().catch(() => null);
  if (!jasa) notFound();

  return (
    <>
      <PageHeader title="Ubah Jasa" subtitle={jasa.kode} />
      <div className="p-6 md:p-9">
        <JasaForm
          mode="edit"
          jasaId={String(jasa._id)}
          initial={{
            nama: jasa.nama,
            kode: jasa.kode,
            aktif: jasa.aktif ?? true,
          }}
        />
      </div>
    </>
  );
}
