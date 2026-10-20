import type { NextConfig } from "next";
const config: NextConfig = {
  webpack(config) {
    // Hindari cache disk besar pada lingkungan pengembangan lokal terbatas.
    config.cache = false;
    return config;
  },
  // Tautan lama /profil kini menjadi beranda.
  async redirects() {
    return [{ source: "/profil", destination: "/", permanent: true }];
  },
};
export default config;
