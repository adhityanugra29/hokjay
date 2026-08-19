import { dbConnect } from "@/lib/db";
import { JournalEntry } from "@/models/JournalEntry";
import { ACCOUNTS, type Account } from "@/lib/coa";

export interface AccountBalance extends Account {
  totalDebit: number;
  totalCredit: number;
  /** Signed so a positive number is always "more of the account's normal side". */
  saldo: number;
}

/** Every account's activity within [from, to] (inclusive), defaulting to all-time. */
export async function getTrialBalance(range?: { from?: Date; to?: Date }): Promise<AccountBalance[]> {
  await dbConnect();
  const match: Record<string, unknown> = {};
  if (range?.from || range?.to) {
    const tanggal: Record<string, Date> = {};
    if (range.from) tanggal.$gte = range.from;
    if (range.to) tanggal.$lte = range.to;
    match.tanggal = tanggal;
  }

  const rows: { _id: string; totalDebit: number; totalCredit: number }[] = await JournalEntry.aggregate([
    { $match: match },
    { $unwind: "$lines" },
    {
      $group: {
        _id: "$lines.akunKode",
        totalDebit: { $sum: "$lines.debit" },
        totalCredit: { $sum: "$lines.credit" },
      },
    },
  ]);
  const byCode = new Map(rows.map((r) => [r._id, r]));

  return ACCOUNTS.map((acc) => {
    const r = byCode.get(acc.code) ?? { totalDebit: 0, totalCredit: 0 };
    const saldo = acc.normal === "debit" ? r.totalDebit - r.totalCredit : r.totalCredit - r.totalDebit;
    return { ...acc, totalDebit: r.totalDebit, totalCredit: r.totalCredit, saldo };
  });
}


export interface LabaRugi {
  penjualanBruto: number;
  diskonPenjualan: number;
  pendapatanOngkosKirim: number;
  pendapatanBersih: number;
  hpp: number;
  labaKotor: number;
  beban: { code: string; name: string; total: number }[];
  totalBeban: number;
  labaBersih: number;
}

/** Income statement for a period. */
export async function getLabaRugi(range: { from?: Date; to?: Date }): Promise<LabaRugi> {
  const balances = await getTrialBalance(range);
  const byCode = new Map(balances.map((b) => [b.code, b]));

  const penjualanBruto = byCode.get("4100")?.saldo ?? 0;
  const pendapatanOngkosKirim = byCode.get("4200")?.saldo ?? 0;
  const diskonPenjualan = byCode.get("4900")?.saldo ?? 0;
  const pendapatanBersih = penjualanBruto + pendapatanOngkosKirim - diskonPenjualan;

  const hpp = (byCode.get("5100")?.saldo ?? 0) + (byCode.get("5200")?.saldo ?? 0);
  const labaKotor = pendapatanBersih - hpp;

  const bebanAccounts = balances.filter((b) => b.kelompok === "Beban" && b.saldo !== 0);
  const totalBeban = bebanAccounts.reduce((s, b) => s + b.saldo, 0);

  return {
    penjualanBruto,
    diskonPenjualan,
    pendapatanOngkosKirim,
    pendapatanBersih,
    hpp,
    labaKotor,
    beban: bebanAccounts.map((b) => ({ code: b.code, name: b.name, total: b.saldo })),
    totalBeban,
    labaBersih: labaKotor - totalBeban,
  };
}

export interface Neraca {
  aset: { code: string; name: string; total: number }[];
  totalAset: number;
  kewajiban: { code: string; name: string; total: number }[];
  totalKewajiban: number;
  ekuitas: { code: string; name: string; total: number }[];
  labaBerjalan: number;
  totalEkuitas: number;
}

/** Balance sheet as of a date — current-period earnings are folded into equity so it always balances. */
export async function getNeraca(asOf?: Date): Promise<Neraca> {
  const balances = await getTrialBalance({ to: asOf });

  const aset = balances.filter((b) => b.kelompok === "Aset" && b.saldo !== 0);
  const kewajiban = balances.filter((b) => b.kelompok === "Kewajiban" && b.saldo !== 0);
  const ekuitasAccounts = balances.filter((b) => b.kelompok === "Ekuitas" && b.saldo !== 0);

  const penjualan = (balances.find((b) => b.code === "4100")?.saldo ?? 0) + (balances.find((b) => b.code === "4200")?.saldo ?? 0);
  const diskon = balances.find((b) => b.code === "4900")?.saldo ?? 0;
  const hppBeban = balances
    .filter((b) => b.kelompok === "HPP" || b.kelompok === "Beban")
    .reduce((s, b) => s + b.saldo, 0);
  const labaBerjalan = penjualan - diskon - hppBeban;

  const totalAset = aset.reduce((s, a) => s + a.saldo, 0);
  const totalKewajiban = kewajiban.reduce((s, a) => s + a.saldo, 0);
  const totalEkuitas = ekuitasAccounts.reduce((s, a) => s + a.saldo, 0) + labaBerjalan;

  return {
    aset: aset.map((a) => ({ code: a.code, name: a.name, total: a.saldo })),
    totalAset,
    kewajiban: kewajiban.map((a) => ({ code: a.code, name: a.name, total: a.saldo })),
    totalKewajiban,
    ekuitas: ekuitasAccounts.map((a) => ({ code: a.code, name: a.name, total: a.saldo })),
    labaBerjalan,
    totalEkuitas,
  };
}
