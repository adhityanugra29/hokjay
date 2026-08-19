import PageHeader from "@/components/layout/PageHeader";
import MenuTile from "@/components/ui/MenuTile";
import { formatDateFull } from "@/lib/format";

const TILES = [
  { href: "/katalog", icon: "🛒", title: "AYO JUALAN!", desc: "Buka katalog, pilih produk, buat invoice", color: "#0e9c62", featured: true },
  { href: "/invoice", icon: "🧾", title: "Invoice", desc: "Lihat & kelola semua invoice, termasuk draft", color: "#e8542e" },
  { href: "/produk", icon: "📦", title: "Inventory", desc: "Kelola inventory, kategori, riwayat stok", color: "#12b8a3" },
  { href: "/pelanggan", icon: "👥", title: "Pelanggan", desc: "Data customer, kontak WA, riwayat belanja", color: "#6952d6" },
  { href: "/insentif", icon: "🏆", title: "Insentif Sales", desc: "Ranking sales & rekap komisi per periode", color: "#e0392b" },
  { href: "/keuangan", icon: "💰", title: "Keuangan", desc: "Arus kas, nilai stok, riwayat transaksi", color: "#0e7c66" },
];

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="CV HORECA JAYA" subtitle={formatDateFull(new Date()).toUpperCase()} />
      <div className="p-6 md:p-9">
        <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3">
          {TILES.map((tile) => (
            <MenuTile key={tile.href} {...tile} />
          ))}
        </div>
      </div>
    </>
  );
}
