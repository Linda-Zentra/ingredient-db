import styles from "./Field.module.css";

export default function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label className={styles.label}>{label}</label>
      {children}
    </div>
  );
}

// 统一的 input 样式，各表单 import 后直接用
export const inputStyle = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 13,
  border: "1px solid #e2e8f0",
  borderRadius: 6,
  boxSizing: "border-box",
  fontFamily: "inherit",
  outline: "none",
};
