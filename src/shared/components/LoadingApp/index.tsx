/**
 * Loader exibido enquanto o AuthProvider ainda não bootou.
 * Mantém mínimo pra não depender de nada do design system
 * (que ainda não tem contexto garantido nessa fase).
 */
const LoadingApp = () => {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "16px",
        background: "#fafafa",
        color: "#58595B",
        fontFamily:
          'Montserrat, "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "4px solid #e5e7eb",
          borderTopColor: "#58595B",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 14 }}>Carregando…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default LoadingApp;
