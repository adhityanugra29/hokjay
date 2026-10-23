import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Client cache for dynamic pages: revisiting a page within 30 s shows it instantly instead of waiting on the server and database again (default 0 = every
    // navigation re-fetches). Every write that matters calls router.refresh(), which invalidates the whole client cache (Next 16.3.1: it bumps the segment-cache
    // version), so a save is never hidden behind a stale page; only OTHER users' changes can lag up to 30 s. Loading-boundary shells keep the default (5 min).
    staleTimes: { dynamic: 30 },
  },
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
