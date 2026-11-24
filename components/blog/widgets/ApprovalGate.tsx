"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/routing";
import { COPY, STEP_COUNT, approvalGateSteps, type Decision } from "@/lib/explainers/approval-gate";
import WidgetFrame, { frameStyles } from "./WidgetFrame";
import diagram from "./Diagram.module.css";
import styles from "./ApprovalGate.module.css";

// Posición horizontal del comando en el dibujo (viewBox de 640 de ancho)
const PACKET_X = { hidden: 100, agent: 190, gate: 318, production: 470, "agent-back": 190 } as const;

export default function ApprovalGate({ locale }: { locale: Locale }) {
  const t = COPY[locale];
  const [gate, setGate] = useState(false);
  const [step, setStep] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);

  const steps = approvalGateSteps(locale, gate, decision);
  const current = steps[step];
  // Con la compuerta activa, el paso 4 espera la decisión de la persona
  const waiting = gate && step === 3 && decision === null;

  const go = (n: number) => {
    // Volver antes del resultado deja la decisión otra vez en manos de la persona
    if (n < STEP_COUNT - 1) setDecision(null);
    setStep(Math.max(0, Math.min(STEP_COUNT - 1, n)));
  };
  const decide = (d: Exclude<Decision, null>) => {
    setDecision(d);
    setStep(4);
  };

  const deleted = current.data === "deleted";
  return (
    <WidgetFrame
      labels={{ legend: t.legend, stepOf: t.stepOf(step + 1, STEP_COUNT), back: t.back, next: t.next, restart: t.restart, note: t.note }}
      step={step}
      total={STEP_COUNT}
      onStep={go}
      onReset={() => {
        setStep(0);
        setDecision(null);
      }}
      toggle={{
        label: t.switchLabel,
        on: gate,
        onText: t.on,
        offText: t.off,
        onToggle: () => {
          setGate((g) => !g);
          setDecision(null);
          setStep((s) => Math.min(s, 3));
        },
      }}
      caption={current.caption}
      decision={
        waiting ? (
          <div className={frameStyles.decide}>
            <span>{t.waiting}</span>
            <button type="button" className="btn btn-primary" onClick={() => decide("approved")}>
              {t.approve}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => decide("denied")}>
              {t.deny}
            </button>
          </div>
        ) : undefined
      }
    >
      <svg className={diagram.svg} viewBox="0 0 640 230" role="img" aria-label={t.legend}>
        <title>{t.cover}</title>
        <line x1="180" y1="118" x2="460" y2="118" className={diagram.rail} />
        <g className={`${diagram.node} ${current.token ? styles.hot : ""}`}>
          <rect x="20" y="60" width="160" height="80" />
          <text x="100" y="90">{t.agent}</text>
          {current.token && (
            <g className={styles.tokenChip}>
              <rect x="60" y="148" width="80" height="26" />
              <text x="100" y="166">{t.token}</text>
            </g>
          )}
        </g>
        <g className={`${diagram.node} ${gate ? styles.gateOn : styles.gateOff}`}>
          <rect x="240" y="60" width="160" height="80" />
          <text x="320" y="90">{t.gate}</text>
        </g>
        <g className={`${diagram.node} ${deleted ? diagram.deleted : diagram.intact}`}>
          <rect x="460" y="60" width="160" height="80" />
          <text x="540" y="90">{t.production}</text>
          <rect x="480" y="156" width="120" height="30" />
          <text x="540" y="177" className={diagram.small}>{t.backup}</text>
          {deleted && <path d="M470 70L610 130M610 70L470 130" className={diagram.cross} />}
        </g>
        <g className={styles.packet} style={{ transform: `translateX(${PACKET_X[current.packet]}px)`, opacity: current.packet === "hidden" ? 0 : 1 }}>
          <circle cx="0" cy="118" r="11" />
        </g>
      </svg>
    </WidgetFrame>
  );
}
