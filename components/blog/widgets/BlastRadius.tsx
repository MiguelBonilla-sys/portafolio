"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { COPY, STEP_COUNT, blastRadiusSteps } from "@/lib/explainers/blast-radius";
import WidgetFrame from "./WidgetFrame";
import diagram from "./Diagram.module.css";
import styles from "./BlastRadius.module.css";

const APP_X = [50, 250, 450] as const; // esquina izquierda de cada app (ancho 140)

export default function BlastRadius({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [limited, setLimited] = useState(false);
  const [step, setStep] = useState(0);
  const steps = blastRadiusSteps(locale, limited);
  const cur = steps[step];
  const all = cur.reach === "all";
  const hasPower = cur.power !== "none";

  return (
    <WidgetFrame
      labels={{ legend: t.legend, stepOf: t.stepOf(step + 1, STEP_COUNT), back: t.back, next: t.next, restart: t.restart, note: t.note }}
      step={step}
      total={STEP_COUNT}
      onStep={(n) => setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)))}
      onReset={() => setStep(0)}
      toggle={{ label: t.switchLabel, on: limited, onText: t.on, offText: t.off, onToggle: () => setLimited((v) => !v) }}
      caption={cur.caption}
    >
      <svg className={diagram.svg} viewBox="0 0 640 240" role="img" aria-label={t.legend}>
        <title>{t.cover}</title>
        {/* El servidor: se vuelve rojo cuando la intrusión llega a todo */}
        <g className={`${diagram.node} ${all ? diagram.deleted : diagram.intact} ${styles.server}`}>
          <rect x="20" y="104" width="600" height="132" />
          <text x="62" y="128" className={diagram.small}>{t.server}</text>
        </g>

        {/* Caminos del panel a cada app */}
        {APP_X.map((x) => (
          <line
            key={x}
            x1="320"
            y1="62"
            x2={x + 70}
            y2="150"
            className={`${styles.link} ${!hasPower ? styles.hidden : cur.power === "root" ? styles.rootLink : styles.limitedLink}`}
          />
        ))}

        {/* Las tres apps */}
        {APP_X.map((x, i) => (
          <g key={x} className={`${diagram.node} ${all ? diagram.deleted : diagram.intact}`}>
            <rect x={x} y="150" width="140" height="60" />
            <text x={x + 70} y="187">{t.apps[i]}</text>
            {limited && (
              <g className={styles.userChip}>
                <rect x={x + 20} y="206" width="100" height="22" />
                <text x={x + 70} y="222" className={diagram.small}>{t.users[i]}</text>
              </g>
            )}
            {all && <path d={`M${x + 8} 158L${x + 132} 202M${x + 132} 158L${x + 8} 202`} className={diagram.cross} />}
          </g>
        ))}

        {/* El panel */}
        <g className={`${diagram.node} ${cur.panel === "breached" ? diagram.deleted : diagram.intact}`}>
          <rect x="240" y="10" width="160" height="52" />
          <text x="320" y="45">{t.panel}</text>
        </g>
        {hasPower && (
          <g className={cur.power === "root" ? styles.rootChip : styles.limitedChip}>
            <rect x="412" y="22" width="86" height="28" />
            <text x="455" y="42" className={diagram.small}>{cur.power === "root" ? t.root : t.limited}</text>
          </g>
        )}
      </svg>
    </WidgetFrame>
  );
}
