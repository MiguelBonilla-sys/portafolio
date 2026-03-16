"use client";

import { useWindowScroll } from "@mantine/hooks";
import styles from "./Navbar.module.css";

const navLinks = [
  { href: "#home",      label: "Home" },
  { href: "#sobreMi",   label: "Sobre mí" },
  { href: "#habilidades", label: "Stack" },
  { href: "#formacion", label: "Experiencia" },
  { href: "#proyectos", label: "Proyectos" },
  { href: "#contacto",  label: "Contacto" },
];

export default function Navbar() {
  const [scroll] = useWindowScroll();
  const scrolled = scroll.y > 20;

  return (
    <nav className={`${styles.nav} ${scrolled ? styles.scrolled : ""}`}>
      <div className={styles.logo}>
        <span className={styles.logoDim}>~/</span>mbonilla
      </div>
      <ul className={styles.links}>
        {navLinks.map((link) => (
          <li key={link.href}>
            <a href={link.href} className={styles.link}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
