// Paisaje ilustrado del cierre de la landing: lomas en capas, una franja de flores (línea punteada
// naranja), nubes que cruzan despacio y brotes que se mecen. Solo decoración (aria-hidden).
const BROTE = "M0 0c0-20 6-30 0-42-10 8-12 22 0 42Zm0 0c0-14 10-22 18-24 0 12-8 20-18 24Z";

export function PaisajeIlustrado() {
  return (
    <svg
      viewBox="0 0 1440 330"
      preserveAspectRatio="xMidYMax slice"
      className="-mt-2 block h-auto min-h-40 w-full"
      aria-hidden="true"
    >
      <g fill="#fff" style={{ animation: "nube 40s linear infinite" }}>
        <ellipse cx="120" cy="60" rx="70" ry="22" />
        <ellipse cx="160" cy="45" rx="45" ry="26" />
      </g>
      <g fill="#fff" style={{ animation: "nube 60s linear -20s infinite" }}>
        <ellipse cx="100" cy="100" rx="55" ry="18" />
        <ellipse cx="130" cy="88" rx="34" ry="20" />
      </g>
      <path d="M0 210 Q260 120 520 190 T1040 170 T1440 180 V330 H0Z" fill="#b9cf95" />
      <path d="M0 250 Q300 170 640 240 T1440 220 V330 H0Z" fill="#86a356" />
      <path
        d="M0 250 Q300 170 640 240 T1440 220"
        fill="none"
        stroke="var(--color-naranja)"
        strokeWidth="10"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />
      <path d="M0 290 Q380 230 760 285 T1440 270 V330 H0Z" fill="var(--color-hoja)" />
      <g fill="var(--color-turquesa)">
        {[300, 700, 1120].map((x, i) => (
          <g key={x} transform={`translate(${x} 300)`}>
            <path
              d={BROTE}
              style={{
                transformBox: "fill-box",
                transformOrigin: "bottom center",
                animation: `crece 3.5s var(--ease-salida) ${-i}s infinite alternate`,
              }}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}
