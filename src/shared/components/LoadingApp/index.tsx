import logoIcon from "@assets/brand/logo-icon.png";

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
        gap: "28px",
        background: "#0D265E",
        color: "#C9D3E8",
        fontFamily:
          'Montserrat, "Segoe UI", -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <img
          src={logoIcon}
          alt="Navemazônia"
          style={{
            width: 56,
            height: 56,
            objectFit: "contain",
            animation: "nmpulse 1.4s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontFamily: "Montserrat, sans-serif",
            fontWeight: 500,
            letterSpacing: "0.18em",
            fontSize: 24,
            color: "#FFFFFF",
          }}
        >
          NAVEMAZÔNIA
        </span>
      </div>
      <div
        style={{
          width: 40,
          height: 40,
          border: "3px solid rgba(255,255,255,0.25)",
          borderTopColor: "#F39200",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }}
      />
      <span style={{ fontSize: 14 }}>Carregando…</span>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes nmpulse { 0%,100% { opacity: .6 } 50% { opacity: 1 } }
      `}</style>
    </div>
  );
};

export default LoadingApp;
