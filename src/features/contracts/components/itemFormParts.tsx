import { Input } from "@devs-atem/design-system";

import { errorText, label } from "./itemFormStyles";

export const TextField = ({
  title,
  value,
  onChange,
  error,
  type,
  placeholder,
  disabled,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <label style={label}>
    {title}
    <Input
      size="sm"
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      error={!!error}
      disabled={disabled}
    />
    {error && <span style={errorText}>{error}</span>}
  </label>
);

export const CheckList = ({
  title,
  options,
  selected,
  onChange,
  error,
  disabled,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  error?: string;
  disabled?: boolean;
}) => {
  const all = [...new Set([...options, ...selected])];
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  return (
    <div style={label}>
      {title}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {all.map((o) => (
          <label key={o} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={selected.includes(o)}
              onChange={() => toggle(o)}
              disabled={disabled}
            />
            {o}
          </label>
        ))}
      </div>
      {error && <span style={errorText}>{error}</span>}
    </div>
  );
};
