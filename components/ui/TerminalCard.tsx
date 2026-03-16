import styles from "./TerminalCard.module.css";

export default function TerminalCard() {
  return (
    <div className={styles.terminal}>
      <div className={styles.header}>
        <div className={`${styles.dot} ${styles.dotR}`} />
        <div className={`${styles.dot} ${styles.dotY}`} />
        <div className={`${styles.dot} ${styles.dotG}`} />
        <div className={styles.title}>miguel@dev: ~</div>
      </div>
      <div className={styles.body}>
        <div>
          <span className={styles.prompt}>❯</span>{" "}
          <span className={styles.cmd}>cat developer.json</span>
        </div>
        <div>&nbsp;</div>
        <div><span className={styles.comment}>{"{"}</span></div>
        <div>&nbsp;&nbsp;<span className={styles.key}>&quot;name&quot;</span><span className={styles.comment}>:</span> <span className={styles.string}>&quot;Miguel Angel Bonilla Torres&quot;</span><span className={styles.comment}>,</span></div>
        <div>&nbsp;&nbsp;<span className={styles.key}>&quot;role&quot;</span><span className={styles.comment}>:</span> <span className={styles.string}>&quot;Full Stack Developer&quot;</span><span className={styles.comment}>,</span></div>
        <div>&nbsp;&nbsp;<span className={styles.key}>&quot;location&quot;</span><span className={styles.comment}>:</span> <span className={styles.string}>&quot;Bogotá, Colombia&quot;</span><span className={styles.comment}>,</span></div>
        <div>&nbsp;&nbsp;<span className={styles.key}>&quot;employer&quot;</span><span className={styles.comment}>:</span> <span className={styles.string}>&quot;Coordenadas.co&quot;</span><span className={styles.comment}>,</span></div>
        <div>&nbsp;&nbsp;<span className={styles.key}>&quot;focus&quot;</span><span className={styles.comment}>: [</span></div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.string}>&quot;Web Platforms&quot;</span><span className={styles.comment}>,</span></div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.string}>&quot;Automation&quot;</span><span className={styles.comment}>,</span></div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className={styles.string}>&quot;CRM Integrations&quot;</span></div>
        <div>&nbsp;&nbsp;<span className={styles.comment}>],</span></div>
        <div>&nbsp;&nbsp;<span className={styles.key}>&quot;status&quot;</span><span className={styles.comment}>:</span> <span className={styles.string}>&quot;open_to_collaborate&quot;</span></div>
        <div><span className={styles.comment}>{"}"}</span></div>
        <div>&nbsp;</div>
        <div>
          <span className={styles.prompt}>❯</span>{" "}
          <span className={styles.cursor} />
        </div>
      </div>
    </div>
  );
}
