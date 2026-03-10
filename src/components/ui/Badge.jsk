import styles from "./Badge.module.css";

export default function Badge({ text, color, sub }) {
  return (
    <span
      className={styles.badge}
      style={{
        background: color + "18",
        color,
        border: `1px solid ${color}40`,
        padding: sub ? "3px 10px 2px" : "2px 8px",
      }}
    >
      <span>{text}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </span>
  );
}
