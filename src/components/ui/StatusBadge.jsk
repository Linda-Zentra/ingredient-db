import { STATUS_CONFIG } from "../../constants";

export default function StatusBadge({ type, value }) {
  const cfg = STATUS_CONFIG[type]?.[value] || { label: value || "—", color: "#94a3b8" };
  return (
    <span style={{
      padding: "2px 8px",
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 500,
      background: cfg.color + "18",
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
    }}>
      {cfg.label}
    </span>
  );
}
