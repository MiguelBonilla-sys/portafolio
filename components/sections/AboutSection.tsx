import Image from "next/image";
import StatCard from "@/components/ui/StatCard";
import SectionHeader from "@/components/ui/SectionHeader";
import AnimatedEntry from "@/components/ui/AnimatedEntry";
import { StaggerContainer, StaggerItem } from "@/components/ui/StaggerContainer";
import styles from "./AboutSection.module.css";

const stats = [
  { number: "35+", label: "Repositorios públicos" },
  { number: "9°",  label: "Semestre Ing. Sistemas" },
  { number: "5+",  label: "Stacks dominados" },
  { number: "100%", label: "Proyectos entregados" },
];

export default function AboutSection() {
  const avatarSrc = "/avatar.png?v=20260315";

  return (
    <section id="sobreMi" className={styles.section}>
      <div className={styles.text}>
        <AnimatedEntry>
          <SectionHeader label="// 01. sobre mí" title={<>Construyo sistemas<br />que escalan.</>} />
        </AnimatedEntry>
        <AnimatedEntry delay={0.1}>
          <div className={styles.body}>
            <p>
              Soy estudiante de noveno semestre de Ingeniería de Sistemas en la
              Universidad de San Buenaventura, Bogotá, y actualmente trabajo como
              Full Stack Developer en Coordenadas.co.
            </p>
            <p>
              Me especializo en combinar desarrollo frontend, lógica backend y
              flujos de automatización para construir ecosistemas digitales
              eficientes. Trabajo con WordPress, PHP, Next.js, Supabase,
              PostgreSQL y herramientas de automatización como n8n, Make y
              GoHighLevel.
            </p>
            <p>
              Me apasiona conectar sistemas mediante APIs, integrar CRMs y
              diseñar arquitecturas limpias y escalables orientadas al
              rendimiento.
            </p>
          </div>
        </AnimatedEntry>
        <StaggerContainer className={styles.stats} initialDelay={0.2}>
          {stats.map((s) => (
            <StaggerItem key={s.label}>
              <StatCard number={s.number} label={s.label} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>

      <AnimatedEntry delay={0.15} yOffset={40}>
        <div className={styles.imgPlaceholder}>
          <Image
            src={avatarSrc}
            alt="Miguel Bonilla"
            width={520}
            height={580}
            className={styles.avatarImg}
            priority
          />
        </div>
      </AnimatedEntry>
    </section>
  );
}
