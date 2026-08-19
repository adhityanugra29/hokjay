import { redirect } from "next/navigation";

// Jurnal Umum and Buku Besar are PDF-only exports now (see ExportButtons in
// the layout) rather than pages — /akuntansi lands on Neraca Saldo instead.
export default function AkuntansiIndexPage() {
  redirect("/akuntansi/neraca-saldo");
}
