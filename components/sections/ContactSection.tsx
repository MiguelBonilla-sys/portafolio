"use client";

import { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import styles from "./ContactSection.module.css";

type FormStatus = "idle" | "loading" | "success" | "error";
type Field = "name" | "email" | "message";
type FieldErrors = Partial<Record<Field, string>>;

const contactItems = [
  { label: "Email", href: "mailto:miguelangelboto14@gmail.com", value: "miguelangelboto14@gmail.com" },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/miguel-bonilla-sys", value: "in/miguel-bonilla-sys" },
  { label: "GitHub", href: "https://github.com/MiguelBonilla-sys", value: "MiguelBonilla-sys" },
  { label: "X", href: "https://x.com/_mangel14_", value: "@_mangel14_" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(data: Record<Field, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (!data.name.trim()) errors.name = "Escribe tu nombre.";
  if (!data.email.trim()) errors.email = "Escribe tu email para poder responderte.";
  else if (!EMAIL_RE.test(data.email.trim())) errors.email = "Ese email no parece válido. Revisa que tenga @ y dominio.";
  if (data.message.trim().length < 10) errors.message = "Cuéntame un poco más (mínimo 10 caracteres).";
  return errors;
}

export default function ContactSection() {
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const values = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
    };

    const found = validate(values);
    setErrors(found);
    const firstInvalid = (Object.keys(found) as Field[])[0];
    if (firstInvalid) {
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: process.env.NEXT_PUBLIC_WEB3FORMS_KEY ?? "",
          ...values,
          // Honeypot: Web3Forms descarta el envío si viene lleno
          botcheck: formData.get("botcheck"),
        }),
      });
      const json = await res.json();

      if (res.ok && json.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
        setErrorMsg(json.message ?? "No se pudo enviar. Intenta de nuevo o escríbeme por email.");
      }
    } catch {
      setStatus("error");
      setErrorMsg("No hubo conexión. Revisa tu red e intenta de nuevo, o escríbeme por email.");
    }
  };

  const isLoading = status === "loading";

  const fieldProps = (field: Field) => ({
    id: `contact-${field}`,
    name: field,
    disabled: isLoading,
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `contact-${field}-error` : undefined,
    onInput: () => errors[field] && setErrors((prev) => ({ ...prev, [field]: undefined })),
  });

  return (
    <section id="contacto" className={styles.section} aria-labelledby="contacto-title">
      <div className={`shell ${styles.grid}`}>
        <div>
          <SectionHeader id="contacto-title" title="Hablemos" />
          <p className={styles.intro}>
            Busco trabajo remoto como Full Stack o AI Engineer, y me interesan proyectos de
            automatización con IA. Escríbeme por el formulario o por cualquiera de estos canales.
          </p>
          <dl className={styles.channels}>
            {contactItems.map((item) => (
              <div key={item.label} className={styles.channel}>
                <dt>{item.label}</dt>
                <dd>
                  <a
                    href={item.href}
                    {...(item.href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  >
                    {item.value}
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <input type="checkbox" name="botcheck" className={styles.honeypot} tabIndex={-1} aria-hidden="true" />

          <div className={styles.group}>
            <label htmlFor="contact-name" className={styles.label}>
              Nombre
            </label>
            <input {...fieldProps("name")} type="text" className={styles.input} autoComplete="name" required />
            {errors.name && (
              <p id="contact-name-error" className={styles.fieldError}>
                {errors.name}
              </p>
            )}
          </div>

          <div className={styles.group}>
            <label htmlFor="contact-email" className={styles.label}>
              Email
            </label>
            <input {...fieldProps("email")} type="email" className={styles.input} autoComplete="email" required />
            {errors.email && (
              <p id="contact-email-error" className={styles.fieldError}>
                {errors.email}
              </p>
            )}
          </div>

          <div className={styles.group}>
            <label htmlFor="contact-message" className={styles.label}>
              Mensaje
            </label>
            <textarea {...fieldProps("message")} className={styles.textarea} rows={6} required />
            {errors.message && (
              <p id="contact-message-error" className={styles.fieldError}>
                {errors.message}
              </p>
            )}
          </div>

          <div aria-live="polite" aria-atomic="true">
            {status === "success" && <p className={styles.success}>Mensaje enviado. Te respondo pronto.</p>}
            {status === "error" && <p className={styles.error}>{errorMsg}</p>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? "Enviando…" : "Enviar mensaje"}
          </button>
        </form>
      </div>
    </section>
  );
}
