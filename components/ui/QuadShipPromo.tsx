"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { CloseIcon, ExternalIcon } from "@/components/ui/icons";
import type messagesEs from "@/messages/es.json";
import styles from "./QuadShipPromo.module.css";

type PromoMessages = (typeof messagesEs)["promo"];

const KEY = "quadship-promo-dismissed";
const DELAY_MS = 5000;
// Campaña de diciembre: desde el 1-ene-2027 (Bogotá) el aviso deja de salir
const UNTIL = Date.parse("2027-01-01T00:00:00-05:00");

// Aviso del proyecto QuadShip: aparece una vez en la portada y no vuelve si se cierra.
export default function QuadShipPromo({ messages }: { messages: PromoMessages }) {
  const [open, setOpen] = useState(false);
  const isHome = usePathname() === "/";

  useEffect(() => {
    if (!isHome || Date.now() >= UNTIL) return;
    try {
      if (localStorage.getItem(KEY)) return;
    } catch {}
    const id = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(id);
  }, [isHome]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
  }

  if (!open || !isHome) return null;

  return (
    <aside className={styles.promo} role="dialog" aria-label={messages.label}>
      <button type="button" className={styles.close} onClick={dismiss} aria-label={messages.close}>
        <CloseIcon size={18} />
      </button>
      <div className={styles.head}>
        <span className={styles.mark}>
          {/* Marca de quadship.app */}
          <svg aria-hidden="true" width="32" height="32" viewBox="0 0 32 32">
            <g transform="rotate(45 16 16)">
              <rect x="5.5" y="5.5" width="9.5" height="9.5" rx="1.2" fill="#E6ECF2" />
              <rect x="17" y="5.5" width="9.5" height="9.5" rx="1.2" fill="#E6ECF2" />
              <rect x="5.5" y="17" width="9.5" height="9.5" rx="1.2" fill="#E6ECF2" />
              <rect x="17" y="17" width="9.5" height="9.5" rx="1.2" fill="#E8714F" />
            </g>
          </svg>
        </span>
        <div>
          <p className={`data ${styles.eyebrow}`}>{messages.eyebrow}</p>
          <p className={styles.title}>QuadShip</p>
        </div>
      </div>
      <p className={styles.body}>{messages.body}</p>
      <a
        href="https://quadship.app/"
        target="_blank"
        rel="noopener noreferrer"
        className={`btn btn-primary ${styles.cta}`}
        onClick={dismiss}
      >
        {messages.cta}
        <ExternalIcon />
      </a>
    </aside>
  );
}
