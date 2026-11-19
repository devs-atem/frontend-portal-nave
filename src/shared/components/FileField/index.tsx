import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { Icon } from "@devs-atem/design-system";

import "./FileField.css";

interface FileFieldProps {
  /** Arquivo selecionado (`null` = nenhum). */
  value: File | null;
  /** Recebe o arquivo escolhido (clique ou arraste) ou `null` ao remover. */
  onChange: (file: File | null) => void;
  disabled?: boolean;
  /** Destaca o campo como inválido (borda vermelha). */
  error?: boolean;
  /** Tipos aceitos pelo seletor nativo (ex.: `".pdf,.docx"`). */
  accept?: string;
  /** Rótulo acessível (o rótulo visual fica com o formulário). */
  ariaLabel?: string;
  /** Linha de apoio abaixo da chamada (ex.: tipos aceitos e tamanho máximo). */
  hint?: string;
}

const formatSize = (bytes: number): string =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Ilustração decorativa (arquivo com linhas), sem semântica. */
const Illustration = () => (
  <svg className="nm-file-field__art" viewBox="0 0 120 130" aria-hidden="true" focusable="false">
    <path
      d="M30 14h42l24 24v66a8 8 0 0 1-8 8H30a8 8 0 0 1-8-8V22a8 8 0 0 1 8-8z"
      fill="color-mix(in srgb, var(--nm-file-accent) 18%, #ffffff)"
      transform="rotate(8 60 65)"
    />
    <path
      d="M72 14v18a6 6 0 0 0 6 6h18z"
      fill="color-mix(in srgb, var(--nm-file-accent) 30%, #ffffff)"
      transform="rotate(8 60 65)"
    />
    <g transform="rotate(8 60 65)" fill="color-mix(in srgb, var(--nm-file-accent) 55%, #ffffff)">
      <rect x="38" y="52" width="40" height="5" rx="2.5" />
      <rect x="38" y="64" width="30" height="5" rx="2.5" />
    </g>
  </svg>
);

/**
 * Área de envio de arquivo (arrastar e soltar ou clicar para selecionar). Com um
 * arquivo escolhido mostra nome e tamanho, com botão para remover. A validação
 * (tamanho/tipo) fica com quem usa o campo.
 */
export const FileField = ({
  value,
  onChange,
  disabled,
  error,
  accept,
  ariaLabel,
  hint,
}: FileFieldProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const open = () => {
    if (!disabled) inputRef.current?.click();
  };

  const clear = () => {
    // Zera o input nativo: sem isso, escolher o mesmo arquivo de novo não dispara `change`.
    if (inputRef.current) inputRef.current.value = "";
    onChange(null);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onChange(file);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      open();
    }
  };

  const classes = [
    "nm-file-field",
    value ? "nm-file-field--filled" : "",
    dragging ? "nm-file-field--dragging" : "",
    error ? "nm-file-field--error" : "",
    disabled ? "nm-file-field--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const native = (
    <input
      ref={inputRef}
      type="file"
      className="nm-file-field__native"
      accept={accept}
      disabled={disabled}
      tabIndex={-1}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.target.files?.[0] ?? null)}
    />
  );

  if (value) {
    return (
      <div className={classes} aria-invalid={error || undefined}>
        {native}
        <Icon name="FileText" size="lg" className="nm-file-field__icon" aria-hidden />
        <div className="nm-file-field__file">
          <span className="nm-file-field__name" title={value.name}>
            {value.name}
          </span>
          <span className="nm-file-field__size">{formatSize(value.size)}</span>
        </div>
        <button
          type="button"
          className="nm-file-field__clear"
          onClick={clear}
          disabled={disabled}
          aria-label="Remover arquivo"
        >
          <Icon name="X" size="sm" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <div
      className={classes}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-invalid={error || undefined}
      aria-disabled={disabled || undefined}
      onClick={open}
      onKeyDown={onKeyDown}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
      {native}
      <Icon name="CloudUpload" size={40} className="nm-file-field__icon" aria-hidden />
      <span className="nm-file-field__title">Arraste e solte o arquivo aqui</span>
      <span className="nm-file-field__subtitle">
        ou <span className="nm-file-field__link">clique para selecionar</span>
      </span>
      {hint && <span className="nm-file-field__hint">{hint}</span>}
      <Illustration />
    </div>
  );
};

export default FileField;
