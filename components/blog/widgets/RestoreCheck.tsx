"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { COPY, STEP_COUNT, restoreCheckSteps, type CardState } from "@/lib/explainers/restore-check";
import WidgetFrame from "./WidgetFrame";
import diagram from "./Diagram.module.css";
import styles from "./RestoreCheck.module.css";

const CARD_X = (i: number) => 30 + i * 118; // tarjetas de 100 de ancho

const CLASS: Record<CardState, string> = {
  ok: styles.ok,
  silent: styles.silent,
  failed: styles.failed,
  flagged: styles.flagged,
  tested: styles.tested,
};

export default function RestoreCheck({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [tested, setTested] = useState(false);
  const [step, setStep] = useState(0);
  const cur = restoreCheckSteps(locale, tested)[step];

  return (
    <WidgetFrame
      labels={{ legend: t.legend, stepOf: t.stepOf(step + 1, STEP_COUNT), back: t.back, next: t.next, restart: t.restart, note: t.note }}
      step={step}
      total={STEP_COUNT}
      onStep={(n) => setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)))}
      onReset={() => setStep(0)}
      toggle={{ label: t.switchLabel, on: tested, onText: t.on, offText: t.off, onToggle: () => setTested((v) => !v) }}
      caption={cur.caption}
    >
      <svg className={diagram.svg} viewBox="0 0 640 230" role="img" aria-label={t.legend}>
        <title>{t.cover}</title>
        {cur.cards.map((state, i) => (
          <g key={i} className={`${styles.card} ${CLASS[state]}`}>
            <rect x={CARD_X(i)} y="64" width="100" height="92" />
            <text x={CARD_X(i) + 50} y="92" className={diagram.small}>{t.day(i + 1)}</text>
            {state === "failed" || state === "flagged" ? (
              <path d={`M${CARD_X(i) + 32} 108L${CARD_X(i) + 68} 140M${CARD_X(i) + 68} 108L${CARD_X(i) + 32} 140`} className={styles.mark} />
            ) : (
              <path d={`M${CARD_X(i) + 30} 126L${CARD_X(i) + 46} 142L${CARD_X(i) + 72} 108`} className={styles.mark} />
            )}
            {state === "tested" && (
              <text x={CARD_X(i) + 50} y="176" className={`${diagram.small} ${styles.tag}`}>{t.tested}</text>
            )}
          </g>
        ))}

        {cur.restoreFrom !== null && (
          <g className={styles.arrow} style={{ transform: `translateX(${CARD_X(cur.restoreFrom - 1) + 50}px)` }}>
            <path d="M0 40L-12 14M0 40L12 14M0 40V8" />
            <text x="0" y="60" className={diagram.small}>{t.restore}</text>
          </g>
        )}

        {cur.lostDays > 0 && (
          <g className={styles.lost}>
            <path d={`M${CARD_X(5 - cur.lostDays)} 192H${CARD_X(4) + 100}`} />
            <text x={(CARD_X(5 - cur.lostDays) + CARD_X(4) + 100) / 2} y="218" className={diagram.small}>{t.lost}</text>
          </g>
        )}
      </svg>
    </WidgetFrame>
  );
}
