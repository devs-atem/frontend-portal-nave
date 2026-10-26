import logoIcon from "@assets/brand/logo-icon.png";
import "./LoadingApp.css";

/**
 * Loader exibido enquanto o AuthProvider ainda não bootou.
 *
 * Identidade Navemazônia (Portal da Nave): fundo azul marinho radial, marca com
 * fade-in, mensagem de carregamento + barra de progresso indeterminada e a onda
 * institucional no rodapé. Baseado no protótipo navemazonia-loading.html.
 *
 * As animações são puramente CSS (leves, baseadas em transform/opacity) e
 * respeitam `prefers-reduced-motion`. Mantém-se independente do design system,
 * que ainda não tem contexto garantido nessa fase.
 */
const LoadingApp = () => {
  return (
    <main
      className="nm-load"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Carregamento do Portal da Nave"
    >
      {/* Marca */}
      <div className="nm-load__brand" aria-label="Navemazônia">
        <img className="nm-load__logo" src={logoIcon} alt="" aria-hidden="true" />
        <h1 className="nm-load__title">NAVEMAZÔNIA</h1>
      </div>
      <p className="nm-load__tagline">PORTAL DA NAVE</p>

      {/* Mensagem + barra de progresso */}
      <p className="nm-load__status">
        Carregando<span className="nm-load__dots" aria-hidden="true" />
      </p>
      <div
        className="nm-load__progress"
        role="progressbar"
        aria-label="Carregamento em andamento"
      >
        <div className="nm-load__progress-bar" />
      </div>

      {/* Onda do rodapé */}
      <div className="nm-load__footer-wave" aria-hidden="true">
        <svg viewBox="0 0 1600 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="nmFwFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#0d2a6e" stopOpacity=".9" />
              <stop offset="1" stopColor="#041640" stopOpacity="1" />
            </linearGradient>
          </defs>
          <path
            className="nm-load__fw-fill"
            d="M0 90 C400 10 1200 170 1600 90 C2000 10 2800 170 3200 90 L3200 200 L0 200 Z"
            fill="url(#nmFwFill)"
          />
          <path
            className="nm-load__fw-blue"
            d="M0 70 C400 0 1200 150 1600 70 C2000 0 2800 150 3200 70"
            fill="none"
            stroke="#1e5fd0"
            strokeWidth="2"
            opacity=".7"
          />
          <path
            className="nm-load__fw-gold"
            d="M0 88 C400 12 1200 168 1600 88 C2000 12 2800 168 3200 88"
            fill="none"
            stroke="#f5a614"
            strokeWidth="2.5"
          />
        </svg>
      </div>
    </main>
  );
};

export default LoadingApp;
