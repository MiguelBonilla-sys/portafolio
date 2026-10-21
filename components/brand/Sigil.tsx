import styles from "./Sigil.module.css";

// Geometría del símbolo (viewBox 120×120, centro 60,60). Ver DESIGN.md › Symbol.
const TRIANGLE = "M60 16L98.11 82L21.89 82Z";
const LETTER_M = "M44 82V58l16 16 16-16v24";
const TICKS = [
  "M105 60L113 60", "M98.97 82.5L105.9 86.5", "M82.5 98.97L86.5 105.9",
  "M60 105L60 113", "M37.5 98.97L33.5 105.9", "M21.03 82.5L14.1 86.5",
  "M15 60L7 60", "M21.03 37.5L14.1 33.5", "M37.5 21.03L33.5 14.1",
  "M60 15L60 7", "M82.5 21.03L86.5 14.1", "M98.97 37.5L105.9 33.5",
];

function Strokes({ animated }: { animated: boolean }) {
  const draw = animated ? styles.draw : undefined;
  return (
    <>
      <circle className={`${draw ?? ""} ${styles.outer}`} cx="60" cy="60" r="55" strokeWidth="5" pathLength={1} />
      <g className={styles.spin}>
        <circle className={`${draw ?? ""} ${styles.inner}`} cx="60" cy="60" r="44" strokeWidth="2.5" pathLength={1} />
        <g className={styles.ticks} strokeWidth="2.5">
          {TICKS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
      </g>
      <path className={`${draw ?? ""} ${styles.triangle}`} d={TRIANGLE} strokeWidth="4" pathLength={1} />
      <path className={`${draw ?? ""} ${styles.letter}`} d={LETTER_M} strokeWidth="7" pathLength={1} />
    </>
  );
}

interface SigilProps {
  /** "hero": símbolo completo que se dibuja al cargar. "mark": versión compacta para la barra. */
  variant?: "hero" | "mark";
  className?: string;
  title?: string;
}

export default function Sigil({ variant = "hero", className, title }: SigilProps) {
  const labelled = Boolean(title);

  if (variant === "mark") {
    return (
      <svg
        className={`${styles.mark} ${className ?? ""}`}
        viewBox="0 0 120 120"
        role={labelled ? "img" : undefined}
        aria-hidden={labelled ? undefined : true}
        aria-label={title}
      >
        <circle className={styles.markRing} cx="60" cy="62" r="44" strokeWidth="10" />
        <path d="M38 84V46l22 22 22-22v38" strokeWidth="12" />
        <rect className={styles.stone} x="52" y="10" width="16" height="16" transform="rotate(45 60 18)" />
      </svg>
    );
  }

  return (
    <svg
      className={`${styles.sigil} ${className ?? ""}`}
      viewBox="-4 -4 130 130"
      role={labelled ? "img" : undefined}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
    >
      <g className={styles.shadow}>
        <Strokes animated={false} />
      </g>
      <g className={styles.main}>
        <Strokes animated />
      </g>
      <rect className={`${styles.stone} ${styles.stoneHero}`} x="56" y="12" width="8" height="8" transform="rotate(45 60 16)" />
    </svg>
  );
}
