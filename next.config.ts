import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product photos live on Vercel Blob (see app/api/upload/route.ts) —
    // needed so next/image can request a downsized version instead of the
    // full 1600px-max upload. Added for the Invoice "Tambah Produk"
    // sidebar's thumbnails (components/invoice/AddProductSidebar.tsx), per
    // the user's request 2026-08-28 to speed up that sidebar's load.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
