/**
 * Caminhão-tanque Navemazônia em SVG, na paleta da marca:
 * azul marinho (#1d3361), laranja (#f5b316) e branco.
 * Puramente decorativo — isolado do LoadingApp para manter o componente
 * principal legível. As rodas giram e a carroceria treme levemente via CSS.
 */
const TruckArt = () => {
  return (
    <svg
      className="nm-load__truck-svg"
      viewBox="0 0 260 120"
      aria-hidden="true"
      focusable="false"
    >
      {/* Tanque de carga */}
      <rect
        x="18"
        y="34"
        width="132"
        height="46"
        rx="23"
        fill="#fff"
        stroke="#f5b316"
        strokeWidth="3"
      />
      {/* Faixas do tanque */}
      <line x1="60" y1="34" x2="60" y2="80" stroke="#f5b316" strokeWidth="2.5" />
      <line
        x1="104"
        y1="34"
        x2="104"
        y2="80"
        stroke="#f5b316"
        strokeWidth="2.5"
      />
      {/* Escotilha superior */}
      <rect x="74" y="26" width="20" height="10" rx="3" fill="#1d3361" />

      {/* Cabine */}
      <path
        d="M158 44 H196 Q206 44 212 52 L226 70 Q230 74 230 80 V80 H158 Z"
        fill="#1d3361"
      />
      {/* Para-brisa */}
      <path d="M196 50 L208 64 H182 V50 Z" fill="#3b8cff" />
      {/* Faixa laranja da cabine */}
      <rect x="158" y="76" width="72" height="5" fill="#f5b316" />

      {/* Chassi */}
      <rect x="18" y="80" width="212" height="8" rx="2" fill="#0f2650" />

      {/* Rodas */}
      <g className="nm-load__wheel">
        <circle cx="66" cy="94" r="15" fill="#132a52" stroke="#f5b316" strokeWidth="3" />
        <circle cx="66" cy="94" r="4" fill="#f5b316" />
      </g>
      <g className="nm-load__wheel">
        <circle cx="104" cy="94" r="15" fill="#132a52" stroke="#f5b316" strokeWidth="3" />
        <circle cx="104" cy="94" r="4" fill="#f5b316" />
      </g>
      <g className="nm-load__wheel">
        <circle cx="198" cy="94" r="15" fill="#132a52" stroke="#f5b316" strokeWidth="3" />
        <circle cx="198" cy="94" r="4" fill="#f5b316" />
      </g>
    </svg>
  );
};

export default TruckArt;
