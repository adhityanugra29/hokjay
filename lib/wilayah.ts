// Indonesian provinces + kabupaten/kota — sourced from a public open dataset
// (github.com/mtegarsantosa/json-nama-daerah-indonesia), 2026-08-25. 34
// provinces (the pre-2022 Papua-split count — Papua Tengah, Papua
// Pegunungan, Papua Selatan, and Papua Barat Daya are not broken out as
// their own entries here, still folded into Papua/Papua Barat) — a
// reasonable practical default for a customer-address dropdown, not a
// legally authoritative administrative boundary list.
export interface ProvinceRegion {
  provinsi: string;
  kota: string[];
}

export const INDONESIA_REGIONS: ProvinceRegion[] = [
  {
    "provinsi": "Aceh",
    "kota": [
      "Kab. Aceh Barat",
      "Kab. Aceh Barat Daya",
      "Kab. Aceh Besar",
      "Kab. Aceh Jaya",
      "Kab. Aceh Selatan",
      "Kab. Aceh Singkil",
      "Kab. Aceh Tamiang",
      "Kab. Aceh Tengah",
      "Kab. Aceh Tenggara",
      "Kab. Aceh Timur",
      "Kab. Aceh Utara",
      "Kab. Bener Meriah",
      "Kab. Bireun",
      "Kab. Gayo Lues",
      "Kab. Nagan Raya",
      "Kab. Pidie",
      "Kab. Pidie Jaya",
      "Kab. Simeulue",
      "Kota Banda Aceh",
      "Kota Langsa",
      "Kota Lhokseumawe",
      "Kota Sabang",
      "Kota Subulussalam"
    ]
  },
  {
    "provinsi": "Bali",
    "kota": [
      "Kab. Badung",
      "Kab. Bangli",
      "Kab. Buleleng",
      "Kab. Gianyar",
      "Kab. Jembrana",
      "Kab. Karangasem",
      "Kab. Klungkung",
      "Kab. Tabanan",
      "Kota Denpasar"
    ]
  },
  {
    "provinsi": "Banten",
    "kota": [
      "Kab. Lebak",
      "Kab. Pandeglang",
      "Kab. Serang",
      "Kab. Tangerang",
      "Kota Cilegon",
      "Kota Serang",
      "Kota Tangerang",
      "Kota Tangerang Selatan"
    ]
  },
  {
    "provinsi": "Bengkulu",
    "kota": [
      "Kab. Bengkulu Selatan",
      "Kab. Bengkulu Tengah",
      "Kab. Bengkulu Utara",
      "Kab. Kaur",
      "Kab. Kepahiang",
      "Kab. Lebong",
      "Kab. Muko Muko",
      "Kab. Rejang Lebong",
      "Kab. Seluma",
      "Kota Bengkulu"
    ]
  },
  {
    "provinsi": "DI Yogyakarta",
    "kota": [
      "Kab. Bantul",
      "Kab. Gunung Kidul",
      "Kab. Kulon Progo",
      "Kab. Sleman",
      "Kota Yogyakarta"
    ]
  },
  {
    "provinsi": "DKI Jakarta",
    "kota": [
      "Kab. Kepulauan Seribu",
      "Kota Jakarta Barat",
      "Kota Jakarta Pusat",
      "Kota Jakarta Selatan",
      "Kota Jakarta Timur",
      "Kota Jakarta Utara"
    ]
  },
  {
    "provinsi": "Gorontalo",
    "kota": [
      "Kab. Boalemo",
      "Kab. Bone Bolango",
      "Kab. Gorontalo",
      "Kab. Gorontalo Utara",
      "Kab. Pohuwato",
      "Kota Gorontalo"
    ]
  },
  {
    "provinsi": "Jambi",
    "kota": [
      "Kab. Batanghari",
      "Kab. Bungo",
      "Kab. Kerinci",
      "Kab. Merangin",
      "Kab. Muaro Jambi",
      "Kab. Sarolangun",
      "Kab. Tanjung Jabung Barat",
      "Kab. Tanjung Jabung Timur",
      "Kab. Tebo",
      "Kota Jambi",
      "Kota Sungai Penuh"
    ]
  },
  {
    "provinsi": "Jawa Barat",
    "kota": [
      "Kab. Bandung",
      "Kab. Bandung Barat",
      "Kab. Bekasi",
      "Kab. Bogor",
      "Kab. Ciamis",
      "Kab. Cianjur",
      "Kab. Cirebon",
      "Kab. Garut",
      "Kab. Indramayu",
      "Kab. Karawang",
      "Kab. Kuningan",
      "Kab. Majalengka",
      "Kab. Pangandaran",
      "Kab. Purwakarta",
      "Kab. Subang",
      "Kab. Sukabumi",
      "Kab. Sumedang",
      "Kab. Tasikmalaya",
      "Kota Bandung",
      "Kota Banjar",
      "Kota Bekasi",
      "Kota Bogor",
      "Kota Cimahi",
      "Kota Cirebon",
      "Kota Depok",
      "Kota Sukabumi",
      "Kota Tasikmalaya"
    ]
  },
  {
    "provinsi": "Jawa Tengah",
    "kota": [
      "Kab. Banjarnegara",
      "Kab. Banyumas",
      "Kab. Batang",
      "Kab. Blora",
      "Kab. Boyolali",
      "Kab. Brebes",
      "Kab. Cilacap",
      "Kab. Demak",
      "Kab. Grobogan",
      "Kab. Jepara",
      "Kab. Karanganyar",
      "Kab. Kebumen",
      "Kab. Kendal",
      "Kab. Klaten",
      "Kab. Kudus",
      "Kab. Magelang",
      "Kab. Pati",
      "Kab. Pekalongan",
      "Kab. Pemalang",
      "Kab. Purbalingga",
      "Kab. Purworejo",
      "Kab. Rembang",
      "Kab. Semarang",
      "Kab. Sragen",
      "Kab. Sukoharjo",
      "Kab. Tegal",
      "Kab. Temanggung",
      "Kab. Wonogiri",
      "Kab. Wonosobo",
      "Kota Magelang",
      "Kota Pekalongan",
      "Kota Salatiga",
      "Kota Semarang",
      "Kota Surakarta",
      "Kota Tegal"
    ]
  },
  {
    "provinsi": "Jawa Timur",
    "kota": [
      "Kab. Bangkalan",
      "Kab. Banyuwangi",
      "Kab. Blitar",
      "Kab. Bojonegoro",
      "Kab. Bondowoso",
      "Kab. Gresik",
      "Kab. Jember",
      "Kab. Jombang",
      "Kab. Kediri",
      "Kab. Lamongan",
      "Kab. Lumajang",
      "Kab. Madiun",
      "Kab. Magetan",
      "Kab. Malang",
      "Kab. Mojokerto",
      "Kab. Nganjuk",
      "Kab. Ngawi",
      "Kab. Pacitan",
      "Kab. Pamekasan",
      "Kab. Pasuruan",
      "Kab. Ponorogo",
      "Kab. Probolinggo",
      "Kab. Sampang",
      "Kab. Sidoarjo",
      "Kab. Situbondo",
      "Kab. Sumenep",
      "Kab. Trenggalek",
      "Kab. Tuban",
      "Kab. Tulungagung",
      "Kota Batu",
      "Kota Blitar",
      "Kota Kediri",
      "Kota Madiun",
      "Kota Malang",
      "Kota Mojokerto",
      "Kota Pasuruan",
      "Kota Probolinggo",
      "Kota Surabaya"
    ]
  },
  {
    "provinsi": "Kalimantan Barat",
    "kota": [
      "Kab. Bengkayang",
      "Kab. Kapuas Hulu",
      "Kab. Kayong Utara",
      "Kab. Ketapang",
      "Kab. Kubu Raya",
      "Kab. Landak",
      "Kab. Melawi",
      "Kab. Mempawah",
      "Kab. Sambas",
      "Kab. Sanggau",
      "Kab. Sekadau",
      "Kab. Sintang",
      "Kota Pontianak",
      "Kota Singkawang"
    ]
  },
  {
    "provinsi": "Kalimantan Selatan",
    "kota": [
      "Kab. Balangan",
      "Kab. Banjar",
      "Kab. Barito Kuala",
      "Kab. Hulu Sungai Selatan",
      "Kab. Hulu Sungai Tengah",
      "Kab. Hulu Sungai Utara",
      "Kab. Kotabaru",
      "Kab. Tabalong",
      "Kab. Tanah Bambu",
      "Kab. Tanah Laut",
      "Kab. Tapin",
      "Kota Banjarbaru",
      "Kota Banjarmasin"
    ]
  },
  {
    "provinsi": "Kalimantan Tengah",
    "kota": [
      "Kab. Barito Selatan",
      "Kab. Barito Timur",
      "Kab. Barito Utara",
      "Kab. Gunung Mas",
      "Kab. Kapuas",
      "Kab. Katingan",
      "Kab. Kotawaringin Barat",
      "Kab. Kotawaringin Timur",
      "Kab. Lamandau",
      "Kab. Murung Raya",
      "Kab. Pulang Pisau",
      "Kab. Seruyan",
      "Kab. Sukamara",
      "Kota Palangkaraya"
    ]
  },
  {
    "provinsi": "Kalimantan Timur",
    "kota": [
      "Kab. Berau",
      "Kab. Kutai Barat",
      "Kab. Kutai Kertanegara",
      "Kab. Kutai Timur",
      "Kab. Mahakam Ulu",
      "Kab. Paser",
      "Kab. Penajam Paser Utara",
      "Kota Balikpapan",
      "Kota Bontang",
      "Kota Samarinda"
    ]
  },
  {
    "provinsi": "Kalimantan Utara",
    "kota": [
      "Kab. Bulungan",
      "Kab. Malinau",
      "Kab. Nunukan",
      "Kab. Tana Tidung",
      "Kota Tarakan"
    ]
  },
  {
    "provinsi": "Kepulauan Bangka Belitung",
    "kota": [
      "Kab. Bangka",
      "Kab. Bangka Barat",
      "Kab. Bangka Selatan",
      "Kab. Bangka Tengah",
      "Kab. Belitung",
      "Kab. Belitung Timur",
      "Kota Pangkal Pinang"
    ]
  },
  {
    "provinsi": "Kepulauan Riau",
    "kota": [
      "Kab. Bintan",
      "Kab. Karimun",
      "Kab. Kepulauan Anambas",
      "Kab. Lingga",
      "Kab. Natuna",
      "Kota Batam",
      "Kota Tanjung Pinang"
    ]
  },
  {
    "provinsi": "Lampung",
    "kota": [
      "Kab. Lampung Barat",
      "Kab. Lampung Selatan",
      "Kab. Lampung Tengah",
      "Kab. Lampung Timur",
      "Kab. Lampung Utara",
      "Kab. Mesuji",
      "Kab. Pesawaran",
      "Kab. Pesisir Barat",
      "Kab. Pringsewu",
      "Kab. Tanggamus",
      "Kab. Tulang Bawang",
      "Kab. Tulangbawang Barat",
      "Kab. Way Kanan",
      "Kota Bandar Lampung",
      "Kota Metro"
    ]
  },
  {
    "provinsi": "Maluku",
    "kota": [
      "Kab. Buru",
      "Kab. Buru Selatan",
      "Kab. Kepulauan Aru",
      "Kab. Maluku Barat Daya",
      "Kab. Maluku Tengah",
      "Kab. Maluku Tenggara",
      "Kab. Maluku Tenggara Barat",
      "Kab. Seram Bagian Barat",
      "Kab. Seram Bagian Timur",
      "Kota Ambon",
      "Kota Tual"
    ]
  },
  {
    "provinsi": "Maluku Utara",
    "kota": [
      "Kab. Halmahera Barat",
      "Kab. Halmahera Selatan",
      "Kab. Halmahera Tengah",
      "Kab. Halmahera Timur",
      "Kab. Halmahera Utara",
      "Kab. Kepulauan Sula",
      "Kab. Pulau Morotai",
      "Kab. Pulau Taliabu",
      "Kota Ternate",
      "Kota Tidore Kepulauan"
    ]
  },
  {
    "provinsi": "Nusa Tenggara Barat",
    "kota": [
      "Kab. Bima",
      "Kab. Dompu",
      "Kab. Lombok Barat",
      "Kab. Lombok Tengah",
      "Kab. Lombok Timur",
      "Kab. Lombok Utara",
      "Kab. Sumbawa",
      "Kab. Sumbawa Barat",
      "Kota Bima",
      "Kota Mataram"
    ]
  },
  {
    "provinsi": "Nusa Tenggara Timur",
    "kota": [
      "Kab. Alor",
      "Kab. Belu",
      "Kab. Ende",
      "Kab. Flores Timur",
      "Kab. Kupang",
      "Kab. Lembata",
      "Kab. Malaka",
      "Kab. Manggarai",
      "Kab. Manggarai Barat",
      "Kab. Manggarai Timur",
      "Kab. Nagekeo",
      "Kab. Ngada",
      "Kab. Rote Ndao",
      "Kab. Sabu Raijua",
      "Kab. Sikka",
      "Kab. Sumba Barat",
      "Kab. Sumba Barat Daya",
      "Kab. Sumba Tengah",
      "Kab. Sumba Timur",
      "Kab. Timor Tengah Selatan",
      "Kab. Timor Tengah Utara",
      "Kota Kupang"
    ]
  },
  {
    "provinsi": "Papua",
    "kota": [
      "Kab. Asmat",
      "Kab. Biak Numfor",
      "Kab. Boven Digoel",
      "Kab. Deiyai",
      "Kab. Dogiyai",
      "Kab. Intan Jaya",
      "Kab. Jayapura",
      "Kab. Jayawijaya",
      "Kab. Keerom",
      "Kab. Kepulauan Yapen",
      "Kab. Lanny Jaya",
      "Kab. Mamberamo Raya",
      "Kab. Mamberamo Tengah",
      "Kab. Mappi",
      "Kab. Merauke",
      "Kab. Mimika",
      "Kab. Nabire",
      "Kab. Nduga",
      "Kab. Paniai",
      "Kab. Pegunungan Bintang",
      "Kab. Puncak",
      "Kab. Puncak Jaya",
      "Kab. Sarmi",
      "Kab. Supiori",
      "Kab. Tolikara",
      "Kab. Waropen",
      "Kab. Yahukimo",
      "Kab. Yalimo",
      "Kota Jayapura"
    ]
  },
  {
    "provinsi": "Papua Barat",
    "kota": [
      "Kab. Fak Fak",
      "Kab. Kaimana",
      "Kab. Manokwari",
      "Kab. Manokwari Selatan",
      "Kab. Maybrat",
      "Kab. Pegunungan Arfak",
      "Kab. Raja Ampat",
      "Kab. Sorong",
      "Kab. Sorong Selatan",
      "Kab. Tambrauw",
      "Kab. Teluk Bintuni",
      "Kab. Teluk Wondama",
      "Kota Sorong"
    ]
  },
  {
    "provinsi": "Riau",
    "kota": [
      "Kab. Bengkalis",
      "Kab. Indragiri Hilir",
      "Kab. Indragiri Hulu",
      "Kab. Kampar",
      "Kab. Kepulauan Meranti",
      "Kab. Kuantan Singingi",
      "Kab. Pelalawan",
      "Kab. Rokan Hilir",
      "Kab. Rokan Hulu",
      "Kab. Siak",
      "Kota Dumai",
      "Kota Pekan Baru"
    ]
  },
  {
    "provinsi": "Sulawesi Barat",
    "kota": [
      "Kab. Majene",
      "Kab. Mamasa",
      "Kab. Mamuju",
      "Kab. Mamuju Tengah",
      "Kab. Mamuju Utara",
      "Kab. Polowali Mandar"
    ]
  },
  {
    "provinsi": "Sulawesi Selatan",
    "kota": [
      "Kab. Bantaeng",
      "Kab. Barru",
      "Kab. Bone",
      "Kab. Bulukumba",
      "Kab. Enrekang",
      "Kab. Gowa",
      "Kab. Jeneponto",
      "Kab. Kepulauan Selayar",
      "Kab. Luwu",
      "Kab. Luwu Timur",
      "Kab. Luwu Utara",
      "Kab. Maros",
      "Kab. Pangkajene Kepulauan",
      "Kab. Pinrang",
      "Kab. Sidenreng Rappang",
      "Kab. Sinjai",
      "Kab. Soppeng",
      "Kab. Takalar",
      "Kab. Tana Toraja",
      "Kab. Toraja Utara",
      "Kab. Wajo",
      "Kota Makasar",
      "Kota Palopo",
      "Kota Pare Pare"
    ]
  },
  {
    "provinsi": "Sulawesi Tengah",
    "kota": [
      "Kab. Banggai",
      "Kab. Banggai Kepulauan",
      "Kab. Banggai Laut",
      "Kab. Buol",
      "Kab. Donggala",
      "Kab. Morowali",
      "Kab. Morowali Utara",
      "Kab. Parigi Moutong",
      "Kab. Poso",
      "Kab. Sigi",
      "Kab. Tojo Una-Una",
      "Kab. Toli-Toli",
      "Kota Palu"
    ]
  },
  {
    "provinsi": "Sulawesi Tenggara",
    "kota": [
      "Kab. Bombana",
      "Kab. Buton",
      "Kab. Buton Selatan",
      "Kab. Buton Tengah",
      "Kab. Buton Utara",
      "Kab. Kolaka",
      "Kab. Kolaka Timur",
      "Kab. Kolaka Utara",
      "Kab. Konawe",
      "Kab. Konawe Kepulauan",
      "Kab. Konawe Selatan",
      "Kab. Konawe Utara",
      "Kab. Muna",
      "Kab. Muna Barat",
      "Kab. Wakatobi",
      "Kota Bau Bau",
      "Kota Kendari"
    ]
  },
  {
    "provinsi": "Sulawesi Utara",
    "kota": [
      "Kab. Bolaang Mangondow",
      "Kab. Bolaang Mangondow Selatan",
      "Kab. Bolaang Mangondow Timur",
      "Kab. Bolaang Mangondow Utara",
      "Kab. Kepulauan Sangihe",
      "Kab. Kepulauan Siau Tagulandang Biaro",
      "Kab. Kepulauan Talaud",
      "Kab. Minahasa",
      "Kab. Minahasa Selatan",
      "Kab. Minahasa Tenggara",
      "Kab. Minahasa Utara",
      "Kota Bitung",
      "Kota Kotamobagu",
      "Kota Manado",
      "Kota Tomohon"
    ]
  },
  {
    "provinsi": "Sumatera Barat",
    "kota": [
      "Kab. Agam",
      "Kab. Dharmasraya",
      "Kab. Kepulauan Mentawai",
      "Kab. Lima Puluh Kota",
      "Kab. Padang Pariaman",
      "Kab. Pasaman",
      "Kab. Pasaman Barat",
      "Kab. Pesisir Selatan",
      "Kab. Sijunjung",
      "Kab. Solok",
      "Kab. Solok Selatan",
      "Kab. Tanah Datar",
      "Kota Bukittinggi",
      "Kota Padang",
      "Kota Padang Panjang",
      "Kota Pariaman",
      "Kota Payakumbuh",
      "Kota Sawhlunto",
      "Kota Solok"
    ]
  },
  {
    "provinsi": "Sumatera Selatan",
    "kota": [
      "Kab. Banyuasin",
      "Kab. Empat Lawang",
      "Kab. Lahat",
      "Kab. Muara Enim",
      "Kab. Musi Banyuasin",
      "Kab. Musi Rawas",
      "Kab. Musi Rawas Utara",
      "Kab. Ogan Ilir",
      "Kab. Ogan Komering Ilir",
      "Kab. Ogan Komering Ulu",
      "Kab. Ogan Komering Ulu Selatan",
      "Kab. Ogan Komering Ulu Timur",
      "Kab. Penukal Abab Lematang Ilir",
      "Kota Lubuk Linggau",
      "Kota Pagar Alam",
      "Kota Palembang",
      "Kota Prabumulih"
    ]
  },
  {
    "provinsi": "Sumatera Utara",
    "kota": [
      "Kab. Asahan",
      "Kab. Batu Bara",
      "Kab. Dairi",
      "Kab. Deli Serdang",
      "Kab. Humbang Hasundutan",
      "Kab. Karo",
      "Kab. Labuhan Batu",
      "Kab. Labuhanbatu Selatan",
      "Kab. Labuhanbatu Utara",
      "Kab. Langkat",
      "Kab. Mandailing Natal",
      "Kab. Nias",
      "Kab. Nias Barat",
      "Kab. Nias Selatan",
      "Kab. Nias Utara",
      "Kab. Padang Lawas",
      "Kab. Padang Lawas Utara",
      "Kab. Pakpak Bharat",
      "Kab. Samosir",
      "Kab. Serdang Bedagai",
      "Kab. Simalungun",
      "Kab. Tapanuli Selatan",
      "Kab. Tapanuli Tengah",
      "Kab. Tapanuli Utara",
      "Kab. Toba Samosir",
      "Kota Binjai",
      "Kota Gunung Sitoli",
      "Kota Medan",
      "Kota Padang Sidempuan",
      "Kota Pematang Siantar",
      "Kota Sibolga",
      "Kota Tanjung Balai",
      "Kota Tebing Tinggi"
    ]
  }
];

/**
 * Guesses Provinsi/Kota by scanning a free-text alamat for a kota/kabupaten
 * name from INDONESIA_REGIONS — per the user's request 2026-08-25 (sales
 * pastes a full WhatsApp address, auto-fills the required Provinsi/Kota
 * fields instead of making them retype it). Longest-name-wins so e.g.
 * "Kota Jakarta Selatan" matches before a shorter unrelated substring
 * would; when only the bare name appears (no "Kota"/"Kab." prefix in the
 * address, e.g. "...Bekasi Selatan...") and both a Kota and a Kab. share
 * that name, "Kota X" is preferred over "Kab. X" as the more common
 * everyday reading. Not typo-tolerant (exact substring only, case/space
 * insensitive) — good enough for a real address someone actually typed,
 * not a spell-checker.
 */
export function guessRegionFromAddress(alamat: string): { provinsi: string; kota: string } | null {
  const haystack = alamat.toLowerCase().replace(/\s+/g, " ");

  const candidates: { provinsi: string; kota: string; bareName: string }[] = [];
  for (const region of INDONESIA_REGIONS) {
    for (const kota of region.kota) {
      const bareName = kota.replace(/^kab\.?\s+/i, "").replace(/^kota\s+/i, "").trim();
      candidates.push({ provinsi: region.provinsi, kota, bareName });
    }
  }

  // Longest full name first (checked against the full "Kota X"/"Kab. X"
  // string), then longest bare name — so a specific, prefixed mention wins
  // over an ambiguous bare one, and a longer/more specific bare name (e.g.
  // "Jakarta Selatan") wins over a shorter one ("Jakarta") that would also
  // match.
  const byFullName = [...candidates].sort((a, b) => b.kota.length - a.kota.length);
  for (const c of byFullName) {
    if (haystack.includes(c.kota.toLowerCase())) return { provinsi: c.provinsi, kota: c.kota };
  }

  const byBareName = [...candidates].sort((a, b) => b.bareName.length - a.bareName.length);
  for (const c of byBareName) {
    if (haystack.includes(c.bareName.toLowerCase())) {
      // Ambiguous bare match (e.g. "Bekasi" alone) — prefer "Kota X" over
      // "Kab. X" among everything sharing this exact bare name.
      const tied = candidates.filter((x) => x.bareName === c.bareName && haystack.includes(x.bareName.toLowerCase()));
      const preferred = tied.find((x) => /^kota\s/i.test(x.kota)) ?? tied[0];
      return { provinsi: preferred.provinsi, kota: preferred.kota };
    }
  }

  return null;
}
