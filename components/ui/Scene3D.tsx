"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ─────────────────────────────────────────────────────────
   Network Graph — nodos flotantes conectados por líneas
   Sistema distribuido / topología de red
───────────────────────────────────────────────────────── */

const NODE_COUNT = 26;
const W = 20; // ancho del espacio de nodos
const H = 10; // alto
const D = 5;  // profundidad
const CONNECT_DIST = 5.5; // distancia máxima para conectar nodos
const SPEED = 0.006;

const NODE_COLORS = ["#00d4ff", "#00d4ff", "#8b5cf6", "#ffffff", "#00d4ff", "#a78bfa"];

type NodeData = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  size: number;
  colorIdx: number;
};

function NetworkGraph({ paused }: { paused: boolean }) {
  // Posiciones y velocidades de los nodos (estables entre renders)
  const nodes = useRef<NodeData[]>(
    Array.from({ length: NODE_COUNT }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * W,
        (Math.random() - 0.5) * H,
        (Math.random() - 0.5) * D
      ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * SPEED,
        (Math.random() - 0.5) * SPEED,
        (Math.random() - 0.5) * SPEED * 0.4
      ),
      size: 0.06 + Math.random() * 0.1,
      colorIdx: Math.floor(Math.random() * NODE_COLORS.length),
    }))
  );

  // Refs a los meshes de los nodos
  const meshRefs = useRef<(THREE.Mesh | null)[]>(Array(NODE_COUNT).fill(null));

  // Geometría de líneas compartida (actualizada en useFrame)
  const linesGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const maxSegments = NODE_COUNT * NODE_COUNT;
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(maxSegments * 6), 3));
    return g;
  }, []);

  useFrame((state) => {
    // Skip animation loop when user prefers reduced motion
    if (paused) return;

    const t = state.clock.elapsedTime;
    const ns = nodes.current;

    // Mover nodos
    ns.forEach((n, i) => {
      n.pos.addScaledVector(n.vel, 1);
      if (Math.abs(n.pos.x) > W / 2) n.vel.x *= -1;
      if (Math.abs(n.pos.y) > H / 2) n.vel.y *= -1;
      if (Math.abs(n.pos.z) > D / 2) n.vel.z *= -1;

      const mesh = meshRefs.current[i];
      if (mesh) {
        mesh.position.copy(n.pos);
        // Pulso de escala
        const pulse = 1 + Math.sin(t * 1.2 + i * 0.7) * 0.18;
        mesh.scale.setScalar(pulse);
      }
    });

    // Reconstruir líneas de conexión
    const attr = linesGeo.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    let idx = 0;

    for (let i = 0; i < ns.length; i++) {
      for (let j = i + 1; j < ns.length; j++) {
        const d = ns[i].pos.distanceTo(ns[j].pos);
        if (d < CONNECT_DIST && idx + 6 <= arr.length) {
          arr[idx++] = ns[i].pos.x;
          arr[idx++] = ns[i].pos.y;
          arr[idx++] = ns[i].pos.z;
          arr[idx++] = ns[j].pos.x;
          arr[idx++] = ns[j].pos.y;
          arr[idx++] = ns[j].pos.z;
        }
      }
    }
    // Rellenar el resto con ceros (sin dibujar)
    while (idx < arr.length) arr[idx++] = 0;
    attr.needsUpdate = true;
    linesGeo.setDrawRange(0, idx / 3);
  });

  return (
    <>
      {/* Nodos */}
      {nodes.current.map((n, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el; }}
          position={n.pos.clone()}
        >
          <sphereGeometry args={[n.size, 10, 10]} />
          <meshStandardMaterial
            color={NODE_COLORS[n.colorIdx]}
            emissive={NODE_COLORS[n.colorIdx]}
            emissiveIntensity={1.6}
            roughness={0.1}
            metalness={0.2}
          />
        </mesh>
      ))}

      {/* Líneas de conexión */}
      <lineSegments geometry={linesGeo}>
        <lineBasicMaterial color="#00d4ff" transparent opacity={0.18} />
      </lineSegments>
    </>
  );
}

/* ── Wrapper con parallax + offset a la derecha ── */
function Scene({ paused }: { paused: boolean }) {
  const groupRef = useRef<THREE.Group>(null!);
  const { pointer } = useThree();

  // Rotación objetivo suavizada (lerp)
  const target = useRef({ rx: 0, ry: 0 });

  useFrame(() => {
    if (paused) return;
    // pointer.x / pointer.y van de -1 a 1
    target.current.ry += (pointer.x * 0.35 - target.current.ry) * 0.04;
    target.current.rx += (-pointer.y * 0.2 - target.current.rx) * 0.04;

    groupRef.current.rotation.y = target.current.ry;
    groupRef.current.rotation.x = target.current.rx;
  });

  return (
    // position-x positivo = desplaza a la derecha en el mundo 3D
    <group ref={groupRef} position={[3.5, 0, 0]}>
      <ambientLight intensity={0.05} />
      <pointLight position={[4, 3, 5]} color="#00d4ff" intensity={18} distance={20} decay={2} />
      <pointLight position={[-6, -2, 3]} color="#8b5cf6" intensity={14} distance={18} decay={2} />
      <NetworkGraph paused={paused} />
    </group>
  );
}

export default function Scene3D() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPaused(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPaused(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 0, 11], fov: 65 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
      frameloop={paused ? "demand" : "always"}
    >
      <Scene paused={paused} />
    </Canvas>
  );
}
