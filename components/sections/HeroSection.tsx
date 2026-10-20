import Sigil from "@/components/brand/Sigil";
import { GithubIcon, LinkedInIcon, MailIcon, XIcon } from "@/components/ui/icons";
import styles from "./HeroSection.module.css";

const socials = [
  { href: "https://github.com/MiguelBonilla-sys", label: "GitHub", Icon: GithubIcon },
  { href: "https://www.linkedin.com/in/miguel-bonilla-sys", label: "LinkedIn", Icon: LinkedInIcon },
  { href: "mailto:miguelangelboto14@gmail.com", label: "Email", Icon: MailIcon },
  { href: "https://x.com/_mangel14_", label: "X", Icon: XIcon },
];

const facts = [
  { term: "Base", value: "Bogotá, Colombia · UTC−5" },
  { term: "Ahora", value: "Full Stack Developer · Coordenadas.co" },
  { term: "Busco", value: "Trabajo remoto" },
];

export default function HeroSection() {
  return (
    <section id="home" className={styles.hero} aria-labelledby="hero-title">
      <div className={`shell ${styles.grid}`}>
        <div className={styles.copy}>
          <h1 id="hero-title" className={styles.name}>
            Miguel
            <br />
            Bonilla
          </h1>
          <p className={styles.role}>Full Stack AI Engineer</p>
          <p className={styles.lede}>
            Convierto procesos de negocio en software que funciona: APIs seguras, automatizaciones
            con n8n y CRM, y sistemas que usan modelos de lenguaje.
          </p>
          <div className={styles.ctas}>
            <a href="#contacto" className="btn btn-primary">
              Escríbeme
            </a>
            <a href="#proyectos" className="btn btn-ghost">
              Ver proyectos
            </a>
          </div>
          <ul className={styles.socials}>
            {socials.map(({ href, label, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  className={styles.social}
                  {...(href.startsWith("mailto") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  <Icon />
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.panel}>
          <div className={styles.sigil}>
            <Sigil title="Símbolo de Miguel Bonilla: círculo de transmutación con una M de circuito" />
          </div>
          <dl className={styles.facts}>
            {facts.map((f) => (
              <div key={f.term} className={styles.fact}>
                <dt>{f.term}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
