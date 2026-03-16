import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      {
        pathname: "/avatar.png",
        search: "?v=20260315",
      },
    ],
  },
};

export default nextConfig;
