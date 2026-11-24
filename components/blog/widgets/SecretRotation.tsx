"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { COPY, STEP_COUNT, secretRotationSteps } from "@/lib/explainers/secret-rotation";
import WidgetFrame from "./WidgetFrame";
import diagram from "./Diagram.module.css";
import styles from "./SecretRotation.module.css";

const X = [60, 150, 250, 420, 580] as const; // marcador en cada paso
const LEAK_X = 150;
const ROTATE_X = 250;

export default function SecretRotation({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [rotate, setRotate] = useState(false);
  const [step, setStep] = useState(0);
  const cur = secretRotationSteps(locale, rotate)[step];
  const x = X[cur.time];
  const keyEnd = cur.rotated ? ROTATE_X : x;
  const leakEnd = cur.rotated ? ROTATE_X : x;

  return (
    <WidgetFrame
      labels={{ legend: t.legend, stepOf: t.stepOf(step + 1, STEP_COUNT), back: t.back, next: t.next, restart: t.restart, note: t.note }}
      step={step}
      total={STEP_COUNT}
      onStep={(n) => setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)))}
      onReset={() => setStep(0)}
      toggle={{ label: t.switchLabel, on: rotate, onText: t.on, offText: t.off, onToggle: () => setRotate((v) => !v) }}
      caption={cur.caption}
    >
      <svg className={diagram.svg} viewBox="0 0 640 230" role="img" aria-label={t.legend}>
        <title>{t.cover}</title>
        <text x="40" y="50" className={`${diagram.small} ${styles.left}`}>{t.keyLane}</text>
        <rect x="40" y="58" width={Math.max(0, keyEnd - 40)} height="24" className={styles.keyBar} />
        {cur.rotated && <rect x={ROTATE_X} y="58" width={Math.max(0, x - ROTATE_X)} height="24" className={styles.newBar} />}
        {cur.rotated && <text x={ROTATE_X + 8} y="76" className={`${diagram.small} ${styles.left} ${styles.onBar}`}>{t.newKey}</text>}

        <text x="40" y="118" className={`${diagram.small} ${styles.left}`}>{t.leakLane}</text>
        {cur.leaked && <rect x={LEAK_X} y="126" width={Math.max(0, leakEnd - LEAK_X)} height="24" className={styles.leakBar} />}
        {cur.leakedCopy === "valid" && (
          <g className={styles.validChip}>
            <rect x={x - 112} y="154" width="96" height="26" />
            <text x={x - 64} y="173" className={diagram.small}>{t.valid}</text>
          </g>
        )}
        {cur.leakedCopy === "refused" && (
          <g className={styles.refusedChip}>
            <rect x={ROTATE_X + 8} y="154" width="104" height="26" />
            <text x={ROTATE_X + 60} y="173" className={diagram.small}>{t.refused}</text>
          </g>
        )}

        <line x1="40" y1="200" x2="600" y2="200" className={diagram.rail} />
        {X.map((tick, i) => (
          <text key={i} x={i === 0 ? 40 : tick} y="222" className={`${diagram.small} ${styles.axis}`}>
            {t.axis[i]}
          </text>
        ))}
        <g className={styles.marker} style={{ transform: `translateX(${x}px)` }}>
          <line x1="0" y1="40" x2="0" y2="200" />
          <circle cx="0" cy="200" r="7" />
        </g>
      </svg>
    </WidgetFrame>
  );
}
