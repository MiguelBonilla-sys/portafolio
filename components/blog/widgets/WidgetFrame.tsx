"use client";

import type { KeyboardEvent, ReactNode } from "react";
import styles from "./Widget.module.css";

export type FrameLabels = { legend: string; stepOf: string; back: string; next: string; restart: string; note: string };

/**
 * Marco común de los explicadores: contador de pasos, interruptor, dibujo, leyenda, controles y nota.
 * Cada explicador pone su dibujo y sus pasos; el marco pone la interacción y la accesibilidad.
 */
export default function WidgetFrame({
  labels,
  step,
  total,
  onStep,
  onReset,
  toggle,
  caption,
  decision,
  children,
}: {
  labels: FrameLabels;
  step: number;
  total: number;
  onStep: (n: number) => void;
  onReset: () => void;
  toggle: { label: string; on: boolean; onText: string; offText: string; onToggle: () => void };
  caption: string;
  /** Si hay algo que decidir en este paso, reemplaza los controles y bloquea avanzar */
  decision?: ReactNode;
  children: ReactNode;
}) {
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target instanceof HTMLElement && e.target.closest("button")) return; // los botones tienen su propio teclado
    if (e.key === "ArrowRight" && !decision) onStep(step + 1);
    if (e.key === "ArrowLeft") onStep(step - 1);
  };
  return (
    <figure className={styles.widget}>
      <div className={styles.frame} role="group" aria-label={labels.legend} tabIndex={0} onKeyDown={onKey}>
        <div className={styles.top}>
          <span className={`data ${styles.stepLabel}`}>{labels.stepOf}</span>
          <button type="button" role="switch" aria-checked={toggle.on} className={styles.switch} onClick={toggle.onToggle}>
            <span>{toggle.label}</span>
            <strong>{toggle.on ? toggle.onText : toggle.offText}</strong>
          </button>
        </div>
        {children}
        <p className={styles.caption} aria-live="polite">
          {caption}
        </p>
        {decision ?? (
          <div className={styles.controls}>
            <button type="button" className="btn btn-ghost" onClick={() => onStep(step - 1)} disabled={step === 0}>
              {labels.back}
            </button>
            {step < total - 1 ? (
              <button type="button" className="btn btn-primary" onClick={() => onStep(step + 1)}>
                {labels.next}
              </button>
            ) : (
              <button type="button" className="btn btn-primary" onClick={onReset}>
                {labels.restart}
              </button>
            )}
          </div>
        )}
      </div>
      <figcaption className={styles.note}>{labels.note}</figcaption>
    </figure>
  );
}

export { styles as frameStyles };
