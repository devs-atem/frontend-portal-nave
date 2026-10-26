/**
 * Barco Navemazônia (empurrador fluvial com cabine, casco, âncora e escotilhas).
 * Baseado no protótipo navemazonia-loading.html. Puramente decorativo —
 * isolado do LoadingApp para manter o componente principal legível.
 */
const VesselArt = () => {
  return (
    <svg viewBox="0 0 340 185" aria-hidden="true">
      {/* Mastro */}
      <rect x="168" y="0" width="7" height="48" rx="2" fill="#f5b316" />
      <rect x="152" y="12" width="40" height="6" rx="2" fill="#f5b316" />
      <rect x="156" y="25" width="36" height="6" rx="2" fill="#f5b316" />

      {/* Teto da cabine */}
      <rect x="132" y="46" width="108" height="9" rx="2" fill="#2b4275" />
      {/* Cabine de comando */}
      <rect x="145" y="55" width="86" height="58" fill="#d8dce3" />
      <rect x="154" y="64" width="17" height="24" fill="#1e7ae6" />
      <rect x="178" y="64" width="17" height="24" fill="#1d3361" />
      <rect x="202" y="64" width="17" height="24" fill="#1d3361" />
      <path
        d="M186 113 V100 a10 10 0 0 1 20 0 V113"
        fill="none"
        stroke="#1d3361"
        strokeWidth="4"
      />

      {/* Casa da proa */}
      <rect x="76" y="76" width="74" height="8" rx="2" fill="#f5b316" />
      <rect x="82" y="84" width="64" height="30" fill="#d8dce3" />
      <rect x="92" y="92" width="44" height="12" fill="#1e7ae6" />

      {/* Convés de popa */}
      <rect x="229" y="92" width="110" height="9" rx="2" fill="#f5b316" />
      <rect x="231" y="101" width="102" height="16" fill="#d8dce3" />
      <rect x="240" y="104" width="22" height="10" fill="#1d3361" />
      <rect x="270" y="104" width="10" height="10" fill="#1d3361" />
      <rect x="290" y="104" width="22" height="10" fill="#1d3361" />

      {/* Casco */}
      <path
        d="M6 78 Q36 96 120 110 L336 114 L326 164 Q200 180 58 170 Q34 128 6 78 Z"
        fill="#1d3361"
      />
      <path
        d="M6 78 Q34 132 58 170"
        fill="none"
        stroke="#f5b316"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M8 80 Q60 112 140 117 L336 117"
        fill="none"
        stroke="#f5b316"
        strokeWidth="7"
        strokeLinecap="round"
      />

      {/* Âncora */}
      <g fill="none" stroke="#f5b316" strokeWidth="4" strokeLinecap="round">
        <circle cx="66" cy="132" r="8" />
        <line x1="66" y1="140" x2="66" y2="164" />
        <line x1="57" y1="148" x2="75" y2="148" />
        <path d="M54 156 Q58 166 66 166 Q74 166 78 156" />
      </g>

      {/* Escotilhas */}
      <g fill="none" stroke="#f5b316" strokeWidth="4">
        <circle cx="255" cy="143" r="8" />
        <circle cx="279" cy="143" r="8" />
        <circle cx="303" cy="143" r="8" />
      </g>
    </svg>
  );
};

export default VesselArt;
