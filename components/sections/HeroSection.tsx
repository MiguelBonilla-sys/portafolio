import TerminalCard from "@/components/ui/TerminalCard";
import styles from "./HeroSection.module.css";

// aria-hidden="true" en todos los SVG decorativos:
// el texto visible ("GitHub", "LinkedIn"…) ya describe el enlace al screen reader
const GithubIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const EmailIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
  </svg>
);

const XIcon = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.258 5.63 5.906-5.63Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function HeroSection() {
  return (
    <section id="home" className={styles.hero}>
      <div className={styles.gridBg} />
      <div className={styles.glow} />

      <div className={styles.content}>
        <div className={`${styles.eyebrow} anim anim-d1`}>
          Full Stack Developer
        </div>
        <h1 className={`${styles.name} anim anim-d2`}>
          Miguel<br />Bonilla
        </h1>
        <p className={`${styles.subtitle} anim anim-d3`}>
          WordPress · Next.js · Automation &amp; CRM
        </p>
        <p className={`${styles.desc} anim anim-d4`}>
          Ingeniero de Sistemas apasionado por construir plataformas web
          escalables, ecosistemas de automatización y sistemas CRM. Bogotá,
          Colombia.
        </p>
        <div className={`${styles.ctas} anim anim-d5`}>
          <a href="#proyectos" className={styles.btnPrimary}>
            Ver proyectos
          </a>
          <a href="#contacto" className={styles.btnOutline}>
            Contacto
          </a>
        </div>
        <div className={`${styles.socials} anim anim-d5`}>
          <a href="https://github.com/MiguelBonilla-sys" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <GithubIcon /> GitHub
          </a>
          <a href="https://www.linkedin.com/in/miguel-bonilla-sys" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <LinkedInIcon /> LinkedIn
          </a>
          <a href="mailto:miguelangelboto14@gmail.com" className={styles.socialLink}>
            <EmailIcon /> Email
          </a>
          <a href="https://x.com/_mangel14_" target="_blank" rel="noopener noreferrer" className={styles.socialLink}>
            <XIcon /> Twitter/X
          </a>
        </div>
      </div>

      <div className={`${styles.terminalWrapper} anim anim-d3`}>
        <TerminalCard />
      </div>
    </section>
  );
}
