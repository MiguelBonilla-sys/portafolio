"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { COPY, STEP_COUNT, updateDaySteps } from "@/lib/explainers/update-day";
import WidgetFrame from "./WidgetFrame";
import diagram from "./Diagram.module.css";
import styles from "./UpdateDay.module.css";

const APP_X = [50, 250, 450] as const;

export default function UpdateDay({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [independent, setIndependent] = useState(false);
  const [step, setStep] = useState(0);
  const cur = updateDaySteps(locale, independent)[step];
  const down = cur.apps === "down";

  return (
    <WidgetFrame
      labels={{ legend: t.legend, stepOf: t.stepOf(step + 1, STEP_COUNT), back: t.back, next: t.next, restart: t.restart, note: t.note }}
      step={step}
      total={STEP_COUNT}
      onStep={(n) => setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)))}
      onReset={() => setStep(0)}
      toggle={{ label: t.switchLabel, on: independent, onText: t.on, offText: t.off, onToggle: () => setIndependent((v) => !v) }}
      caption={cur.caption}
    >
      <svg className={diagram.svg} viewBox="0 0 640 252" role="img" aria-label={t.legend}>
        <title>{t.cover}</title>
        {/* El panel: punteado mientras se actualiza */}
        <g className={`${diagram.node} ${cur.panel === "updating" ? styles.updating : diagram.intact}`}>
          <rect x="240" y="10" width="160" height="52" />
          <text x="320" y="45">{t.panel}</text>
        </g>
        {cur.panel === "updating" && (
          <g className={styles.chip}>
            <rect x="412" y="22" width="112" height="28" />
            <text x="468" y="42" className={diagram.small}>{t.updating}</text>
          </g>
        )}

        {/* Las apps y los visitantes que llegan a cada una */}
        {APP_X.map((x, i) => (
          <g key={x}>
            <line x1={x + 70} y1="196" x2={x + 70} y2="150" className={`${styles.stream} ${cur.visitors === "errors" ? styles.streamBad : ""}`} />
            <g className={`${diagram.node} ${down ? diagram.deleted : diagram.intact}`}>
              <rect x={x} y="100" width="140" height="50" />
              <text x={x + 70} y="133">{t.apps[i]}</text>
            </g>
            {cur.visitors === "errors" && <path d={`M${x + 58} 166L${x + 82} 184M${x + 82} 166L${x + 58} 184`} className={diagram.cross} />}
          </g>
        ))}
        {cur.downtime && (
          <g className={styles.downtime}>
            <rect x="50" y="200" width="540" height="22" />
            <text x="320" y="217" className={diagram.small}>{t.downtime}</text>
          </g>
        )}
        <text x="320" y="244" className={diagram.small}>{t.visitors}</text>
      </svg>
    </WidgetFrame>
  );
}
