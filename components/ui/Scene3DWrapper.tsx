"use client";

import dynamic from "next/dynamic";

const Scene3D = dynamic(() => import("@/components/ui/Scene3D"), {
  ssr: false,
  loading: () => null,
});

export default function Scene3DWrapper() {
  return <Scene3D />;
}
