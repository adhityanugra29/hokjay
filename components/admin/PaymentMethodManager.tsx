import SimpleNameManager from "./SimpleNameManager";

export default function PaymentMethodManager() {
  return (
    <SimpleNameManager
      endpoint="/api/payment-methods"
      title="Kelola Metode Pembayaran"
      placeholder="Nama metode baru..."
      columnLabel="Nama Metode"
      emptyText="Belum ada metode pembayaran."
      errorText="Gagal menambah metode pembayaran"
      noUppercase
    />
  );
}
