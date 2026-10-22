import SimpleNameManager from "./SimpleNameManager";

/**
 * Couriers are just delivery methods (who physically ships it) — Ongkos
 * Kirim is entered manually per invoice on the invoice form, not derived
 * from the courier chosen here.
 */
export default function CourierManager() {
  return (
    <SimpleNameManager
      endpoint="/api/couriers"
      title="Kelola Kurir"
      placeholder="Nama kurir baru..."
      columnLabel="Kurir"
      emptyText="Belum ada kurir. Contoh: Kurir Internal, JNE Trucking, Diambil Sendiri."
      errorText="Gagal menambah kurir"
    />
  );
}
