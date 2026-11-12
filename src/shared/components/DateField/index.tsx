import { CalendarRange } from "@devs-atem/design-system";

import "./DateField.css";

interface DateFieldProps {
  /** Data no formato ISO curto `yyyy-mm-dd` (vazio = sem data). */
  value: string;
  /** Recebe `yyyy-mm-dd` ou `""` ao limpar. */
  onChange: (value: string) => void;
  disabled?: boolean;
  /** Destaca o campo como inválido (borda vermelha). */
  error?: boolean;
  /** Rótulo acessível (o rótulo visual fica com o formulário). */
  ariaLabel?: string;
  /** Data mínima/máxima selecionável (`yyyy-mm-dd`). */
  min?: string;
  max?: string;
  /** Alinhamento do painel; use "end" para campos na borda direita. */
  align?: "start" | "end";
}

/** `yyyy-mm-dd` → `DD/MM/YYYY` (formato do CalendarRange). */
const isoToBr = (iso: string): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
};

/** `DD/MM/YYYY` → `yyyy-mm-dd`. */
const brToIso = (br: string | null): string => {
  const m = br ? /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br) : null;
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};

const isoToDate = (iso?: string) => {
  const m = iso ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  return m ? { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) } : undefined;
};

/**
 * Campo de data única no padrão visual do design system (`CalendarRange` em
 * modo `single`), substituindo o `<input type="date">` nativo do navegador.
 * Mantém a API simples de string `yyyy-mm-dd` usada pelos formulários.
 */
export const DateField = ({
  value,
  onChange,
  disabled,
  error,
  ariaLabel,
  min,
  max,
  align = "start",
}: DateFieldProps) => (
  <div
    className={[
      "nm-date-field",
      error ? "nm-date-field--error" : "",
      disabled ? "nm-date-field--disabled" : "",
    ]
      .filter(Boolean)
      .join(" ")}
    aria-label={ariaLabel}
    aria-invalid={error || undefined}
    aria-disabled={disabled || undefined}
  >
    <CalendarRange
      mode="single"
      hideLabel
      fullWidth
      size="sm"
      align={align}
      showQuickSelect={false}
      hiddenConfirmButton
      value={[isoToBr(value), null]}
      minDate={isoToDate(min)}
      maxDate={isoToDate(max)}
      onChange={({ startDate }) => onChange(brToIso(startDate))}
    />
  </div>
);

export default DateField;
