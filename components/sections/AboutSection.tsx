import Image from "next/image";
import SectionHeader from "@/components/ui/SectionHeader";
import styles from "./AboutSection.module.css";

export default function AboutSection() {
  return (
    <section id="sobreMi" className={styles.section} aria-labelledby="sobre-mi-title">
      <div className="shell">
        <SectionHeader id="sobre-mi-title" title="Sobre mí" />
        <div className={styles.grid}>
          <div className={styles.body}>
            <p className={styles.lead}>
              Estudio noveno semestre de Ingeniería de Sistemas en la Universidad de San
              Buenaventura, en Bogotá, y trabajo como Full Stack Developer en Coordenadas.co desde
              septiembre de 2025.
            </p>
            <p>
              Mi trabajo diario está entre el código y la operación de negocio: integro CRMs y
              APIs, monto automatizaciones con n8n, Make y GoHighLevel, y construyo las plataformas
              web que las usan.
            </p>
            <p>
              Fuera del trabajo construyo con modelos de lenguaje. Hice un generador de documentos
              académicos que corre con LLMs locales en Ollama, y ahora estoy armando un agente en
              LangGraph que redacta mi blog y no publica nada sin mi aprobación.
            </p>
          </div>

          <figure className={styles.frame}>
            <div className={styles.portrait}>
              <Image
                src="/avatar.png?v=20260315"
                alt="Retrato en pixel art de Miguel Bonilla con gafas, camisa blanca y traje azul"
                width={379}
                height={659}
                sizes="(max-width: 900px) 70vw, 380px"
                className={styles.img}
                priority
              />
            </div>
            <figcaption className={styles.caption}>
              <span>Miguel Ángel Bonilla Torres</span>
              <span className={styles.handle}>@_mangel14_</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
