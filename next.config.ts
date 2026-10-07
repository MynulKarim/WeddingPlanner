import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Optimized gallery delivery from Supabase Storage (Phase 4).
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co" }],
  },
};

export default nextConfig;
