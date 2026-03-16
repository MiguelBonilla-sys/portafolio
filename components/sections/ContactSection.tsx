"use client";

import { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import styles from "./ContactSection.module.css";

type FormStatus = "idle" | "loading" | "success" | "error";

const contactItems = [
  { label: "Email",     href: "mailto:miguelangelboto14@gmail.com", value: "miguelangelboto14@gmail.com" },
  { label: "LinkedIn",  href: "https://www.linkedin.com/in/miguel-bonilla-sys", value: "in/miguel-bonilla-sys" },
  { label: "GitHub",    href: "https://github.com/MiguelBonilla-sys", value: "MiguelBonilla-sys" },
  { label: "Twitter/X", href: "https://x.com/_mangel14_", value: "@_mangel14_" },
];

export default function ContactSection() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);

    // Skill #2: FormData solo funciona si los inputs tienen atributo `name`
    const data = {
      access_key: process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "",
      name:    formData.get("name")    as string,
      email:   formData.get("email")   as string,
      message: formData.get("message") as string,
      // Campo honeypot — Web3Forms ignora el envio si este campo esta lleno
      botcheck: formData.get("botcheck"),
    };

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        setStatus("success");
        (e.target as HTMLFormElement).reset();
      } else {
        setStatus("error");
        setErrorMsg(json.message ?? "No se pudo enviar. Intenta de nuevo.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("Error de red. Verifica tu conexión e intenta de nuevo.");
    }
  };

  const isLoading = status === "loading";

  return (
    <section id="contacto" className={styles.section}>
      <div className={styles.info}>
        <SectionHeader label="// 05. contacto" title="Hablemos." />
        <p className={styles.infoText}>
          ¿Tienes un proyecto en mente, quieres colaborar o simplemente
          conectar? Escríbeme y te respondo lo antes posible.
        </p>
        {contactItems.map((item) => (
          <div key={item.label} className={styles.contactItem}>
            <span className={styles.contactLabel}>{item.label}</span>
            <a
              href={item.href}
              target={item.href.startsWith("mailto") ? undefined : "_blank"}
              rel="noopener noreferrer"
              className={styles.contactValue}
            >
              {item.value}
            </a>
          </div>
        ))}
      </div>

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {/* Honeypot anti-spam — oculto visualmente, Web3Forms lo detecta */}
        <input
          type="checkbox"
          name="botcheck"
          className={styles.honeypot}
          tabIndex={-1}
          aria-hidden="true"
        />

        <div className={styles.formGroup}>
          {/* Skill #2: htmlFor enlazado al id del input — trio inseparable */}
          <label htmlFor="contact-name" className={styles.formLabel}>
            Nombre
          </label>
          <input
            id="contact-name"
            name="name"
            type="text"
            className={styles.formInput}
            placeholder="Tu nombre"
            required
            disabled={isLoading}
            autoComplete="name"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contact-email" className={styles.formLabel}>
            Email
          </label>
          <input
            id="contact-email"
            name="email"
            type="email"
            className={styles.formInput}
            placeholder="tu@email.com"
            required
            disabled={isLoading}
            autoComplete="email"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="contact-message" className={styles.formLabel}>
            Mensaje
          </label>
          <textarea
            id="contact-message"
            name="message"
            className={styles.formTextarea}
            placeholder="Cuéntame sobre tu proyecto..."
            required
            disabled={isLoading}
          />
        </div>

        {/* aria-live: el lector de pantalla anuncia el cambio de estado sin recargar */}
        <div aria-live="polite" aria-atomic="true" className={styles.statusWrapper}>
          {status === "success" && (
            <p className={styles.statusSuccess}>
              ✓ Mensaje enviado. Te respondo pronto.
            </p>
          )}
          {status === "error" && (
            <p className={styles.statusError}>
              ✗ {errorMsg}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`${styles.formSubmit} ${isLoading ? styles.loading : ""}`}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? "Enviando..." : "Enviar mensaje"}
        </button>
      </form>
    </section>
  );
}
