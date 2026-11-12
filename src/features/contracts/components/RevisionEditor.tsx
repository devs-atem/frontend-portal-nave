import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button, Input, Select } from "@devs-atem/design-system";

import {
  ACCOUNTING_MEASURES,
  MOVEMENT_TYPE_CODES,
  type AccountingMeasure,
  type PoolResponse,
  type TankResponse,
} from "../services/contract";
import {
  emptyItem,
  type ItemForm,
  type RevisionForm,
  type ValidationErrors,
} from "../services/contractRules";
import type { IReferenceService } from "../services/ReferenceService";

/** Produto elegível para um item (já vinculado ao depositante). */
export interface ProductChoice {
  productId: string;
  name: string;
  sapCode: string;
  customerProductCode?: string;
  customerProductDescription?: string;
}

const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#3D4556",
  display: "flex",
  flexDirection: "column",
  gap: 5,
};
const hint: CSSProperties = { fontSize: 12, color: "#5B6475", fontWeight: 400 };
const errorText: CSSProperties = { color: "#B42F2F", fontWeight: 400, fontSize: 12 };
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
  gap: 12,
};
const card: CSSProperties = {
  border: "1px solid #E2E6EE",
  borderRadius: 10,
  padding: 14,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  background: "#FFFFFF",
};

interface RefData {
  pools: PoolResponse[];
  tanks: TankResponse[];
}

interface RevisionEditorProps {
  value: RevisionForm;
  onChange: (v: RevisionForm) => void;
  errors: ValidationErrors;
  source: string;
  baseCode: string;
  productChoices: ProductChoice[];
  reference: IReferenceService;
  /** Nova revisão exige justificativa. */
  requireJustification?: boolean;
  disabled?: boolean;
}

const TextField = ({
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

const CheckList = ({
  title,
  options,
  selected,
  onChange,
  error,
  emptyText,
  disabled,
  allowCustom,
}: {
  title: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  error?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Permite digitar um código que não está na lista. */
  allowCustom?: boolean;
}) => {
  const [custom, setCustom] = useState("");
  const all = [...new Set([...options, ...selected])];
  const toggle = (o: string) =>
    onChange(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  const addCustom = () => {
    const code = custom.trim().toUpperCase();
    if (code && !selected.includes(code)) onChange([...selected, code]);
    setCustom("");
  };
  return (
    <div style={label}>
      {title}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {all.length === 0 && <span style={hint}>{emptyText ?? "Nenhuma opção."}</span>}
        {all.map((o) => (
          <label
            key={o}
            style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 400 }}
          >
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
      {allowCustom && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", maxWidth: 360 }}>
          <Input
            size="sm"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            placeholder="Outro código do supervisório"
            disabled={disabled}
          />
          <Button variant="outlined" size="sm" onClick={addCustom} disabled={disabled}>
            Adicionar
          </Button>
        </div>
      )}
      {allowCustom && (
        <span style={hint}>
          Deve ser exatamente o código enviado pelo supervisório; caso contrário o movimento é
          tratado como tipo não autorizado.
        </span>
      )}
      {error && <span style={errorText}>{error}</span>}
    </div>
  );
};

/**
 * Editor da revisão: vigência, justificativa e lista de itens. É reaproveitado
 * pelo formulário de contrato (rascunho) e pela nova revisão. O produto de cada
 * item vem dos produtos já vinculados ao depositante; pools e tanques são
 * carregados da base escolhida, filtrados pelo `sapCode` do produto.
 */
export const RevisionEditor = ({
  value,
  onChange,
  errors,
  source,
  baseCode,
  productChoices,
  reference,
  requireJustification,
  disabled,
}: RevisionEditorProps) => {
  const [refData, setRefData] = useState<Record<string, RefData | "loading" | "error">>({});
  const requested = useRef(new Set<string>());

  // Troca de base invalida os catálogos já carregados.
  const baseKey = `${source}|${baseCode}`;
  const lastBase = useRef(baseKey);
  useEffect(() => {
    if (lastBase.current !== baseKey) {
      lastBase.current = baseKey;
      requested.current = new Set();
      setRefData({});
    }
  }, [baseKey]);

  const productCodes = [...new Set(value.items.map((i) => i.productCode).filter(Boolean))].join(",");

  useEffect(() => {
    if (!source || !baseCode || !productCodes) return;
    for (const code of productCodes.split(",")) {
      const k = `${baseKey}|${code}`;
      if (requested.current.has(k)) continue;
      requested.current.add(k);
      setRefData((d) => ({ ...d, [code]: "loading" }));
      Promise.all([
        reference.listPools({ source, baseCode, productCode: code }),
        reference.listTanks({ source, baseCode, productCode: code }),
      ])
        .then(([pools, tanks]) => setRefData((d) => ({ ...d, [code]: { pools, tanks } })))
        .catch(() => setRefData((d) => ({ ...d, [code]: "error" })));
    }
  }, [source, baseCode, baseKey, productCodes, reference]);

  const setRev = (patch: Partial<RevisionForm>) => onChange({ ...value, ...patch });
  const setItem = (key: string, patch: Partial<ItemForm>) =>
    setRev({ items: value.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) });
  const removeItem = (key: string) =>
    setRev({ items: value.items.filter((i) => i.key !== key) });
  const err = (item: ItemForm, f: string): string | undefined => errors[`item.${item.key}.${f}`];

  const pickProduct = (item: ItemForm, productId: string) => {
    const p = productChoices.find((x) => x.productId === productId);
    setItem(item.key, {
      productId,
      productCode: p?.sapCode ?? "",
      customerProductCode: p?.customerProductCode ?? "",
      customerProductDescription: p?.customerProductDescription ?? "",
      poolId: "",
      allowedTankCodes: [],
    });
  };

  const productLabel = (id: string, fallback: string): string => {
    const p = productChoices.find((x) => x.productId === id);
    return p ? `${p.name} (${p.sapCode})` : fallback || "Selecione";
  };

  const poolWarning = (item: ItemForm, pool?: PoolResponse): string | null => {
    if (!pool || !value.effectiveFrom) return null;
    if (pool.effectiveFrom && pool.effectiveFrom.slice(0, 10) > value.effectiveFrom) {
      return "A vigência do pool começa depois do início da revisão.";
    }
    if (
      pool.effectiveTo &&
      (!value.effectiveUntil || pool.effectiveTo.slice(0, 10) < value.effectiveUntil)
    ) {
      return "A vigência do pool termina antes do fim da revisão.";
    }
    void item;
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={grid}>
        <TextField
          title="Início da revisão *"
          type="date"
          value={value.effectiveFrom}
          onChange={(v) => setRev({ effectiveFrom: v })}
          error={errors["rev.effectiveFrom"]}
          disabled={disabled}
        />
        <TextField
          title="Fim da revisão (vazio = indeterminado)"
          type="date"
          value={value.effectiveUntil}
          onChange={(v) => setRev({ effectiveUntil: v })}
          error={errors["rev.effectiveUntil"]}
          disabled={disabled}
        />
      </div>

      <label style={label}>
        Justificativa{requireJustification ? " *" : " (opcional)"}
        <textarea
          value={value.justification}
          onChange={(e) => setRev({ justification: e.target.value })}
          rows={2}
          disabled={disabled}
          style={{
            border: `1px solid ${errors["rev.justification"] ? "#B42F2F" : "#E2E6EE"}`,
            borderRadius: 8,
            padding: 8,
            font: "inherit",
            fontWeight: 400,
            resize: "vertical",
          }}
        />
        {errors["rev.justification"] && (
          <span style={errorText}>{errors["rev.justification"]}</span>
        )}
      </label>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ color: "#0D265E", fontSize: 14 }}>Itens ({value.items.length})</strong>
        <Button
          variant="outlined"
          size="sm"
          onClick={() => setRev({ items: [...value.items, emptyItem()] })}
          disabled={disabled || productChoices.length === 0}
        >
          + Adicionar item
        </Button>
      </div>
      {productChoices.length === 0 && (
        <span style={hint}>
          Nenhum produto vinculado ao depositante. Vincule produtos ao depositante para
          adicionar itens.
        </span>
      )}
      {errors["rev.items"] && <span style={errorText}>{errors["rev.items"]}</span>}

      {value.items.map((item, idx) => {
        const rd = item.productCode ? refData[item.productCode] : undefined;
        const loaded = rd && rd !== "loading" && rd !== "error" ? rd : undefined;
        const pools = loaded?.pools ?? [];
        const tanks = loaded?.tanks ?? [];
        const selectedPool = pools.find((p) => p.id === item.poolId);
        const warn = poolWarning(item, selectedPool);
        const productIds = productChoices.map((p) => p.productId);
        const poolIds = pools.map((p) => p.id);

        return (
          <div key={item.key} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13, color: "#3D4556" }}>Item {idx + 1}</strong>
              <Button
                variant="outlined"
                size="sm"
                color="error"
                onClick={() => removeItem(item.key)}
                disabled={disabled}
              >
                Remover
              </Button>
            </div>

            <div style={grid}>
              <div style={label}>
                Produto *
                <Select<string>
                  size="sm"
                  value={item.productId}
                  options={productIds.map((option) => ({ option }))}
                  getOptionItemLabel={(id) => productLabel(id, id)}
                  getSelectedOptionLabel={(id) => productLabel(id, item.productCode)}
                  getOptionKey={(id) => id || "__none"}
                  placeholder="Selecione"
                  onChange={(id) => pickProduct(item, id)}
                  disabled={disabled}
                />
                {err(item, "productId") && <span style={errorText}>{err(item, "productId")}</span>}
              </div>

              <div style={label}>
                Pool *
                <Select<string>
                  size="sm"
                  value={item.poolId}
                  options={poolIds.map((option) => ({ option }))}
                  getOptionItemLabel={(id) => {
                    const p = pools.find((x) => x.id === id);
                    return p ? `${p.code} — ${p.name}` : id;
                  }}
                  getSelectedOptionLabel={(id) => {
                    const p = pools.find((x) => x.id === id);
                    return p ? `${p.code} — ${p.name}` : id ? "Pool atual" : "Selecione";
                  }}
                  getOptionKey={(id) => id || "__none"}
                  placeholder={
                    !source || !baseCode
                      ? "Escolha a base"
                      : !item.productCode
                        ? "Escolha o produto"
                        : rd === "loading"
                          ? "Carregando…"
                          : "Selecione"
                  }
                  onChange={(id) => setItem(item.key, { poolId: id })}
                  disabled={disabled || !item.productCode}
                />
                {rd === "error" && (
                  <span style={errorText}>Não foi possível carregar pools e tanques da base.</span>
                )}
                {loaded && pools.length === 0 && (
                  <span style={hint}>Nenhum pool ativo da base permite este produto.</span>
                )}
                {warn && <span style={{ ...hint, color: "#B45309" }}>{warn}</span>}
                {err(item, "poolId") && <span style={errorText}>{err(item, "poolId")}</span>}
              </div>

              <div style={label}>
                Medida contábil *
                <Select<string>
                  size="sm"
                  value={item.accountingMeasure}
                  options={ACCOUNTING_MEASURES.map((option) => ({ option }))}
                  getOptionItemLabel={(m) => m}
                  getSelectedOptionLabel={(m) => m || "Selecione"}
                  getOptionKey={(m) => m || "__none"}
                  placeholder="Selecione"
                  onChange={(m) => setItem(item.key, { accountingMeasure: m as AccountingMeasure })}
                  disabled={disabled}
                />
                {err(item, "accountingMeasure") && (
                  <span style={errorText}>{err(item, "accountingMeasure")}</span>
                )}
              </div>
            </div>

            <div style={grid}>
              <TextField
                title="Código do produto do cliente"
                value={item.customerProductCode}
                onChange={(v) => setItem(item.key, { customerProductCode: v })}
                disabled={disabled}
              />
              <TextField
                title="Descrição do produto do cliente"
                value={item.customerProductDescription}
                onChange={(v) => setItem(item.key, { customerProductDescription: v })}
                disabled={disabled}
              />
            </div>

            <div style={grid}>
              <TextField title="Capacidade reservada *" value={item.reservedCapacity} onChange={(v) => setItem(item.key, { reservedCapacity: v })} error={err(item, "reservedCapacity")} placeholder="1000.000" disabled={disabled} />
              <TextField title="Capacidade máxima *" value={item.maximumCapacity} onChange={(v) => setItem(item.key, { maximumCapacity: v })} error={err(item, "maximumCapacity")} placeholder="1500.000" disabled={disabled} />
              <TextField title="Cota mínima" value={item.minimumQuota} onChange={(v) => setItem(item.key, { minimumQuota: v })} error={err(item, "minimumQuota")} disabled={disabled} />
              <TextField title="Cota máxima *" value={item.maximumQuota} onChange={(v) => setItem(item.key, { maximumQuota: v })} error={err(item, "maximumQuota")} disabled={disabled} />
              <TextField title="Estoque mínimo" value={item.minimumStock} onChange={(v) => setItem(item.key, { minimumStock: v })} error={err(item, "minimumStock")} disabled={disabled} />
              <TextField title="Limite de movimentação" value={item.movementLimit} onChange={(v) => setItem(item.key, { movementLimit: v })} error={err(item, "movementLimit")} disabled={disabled} />
              <TextField title="Tolerância de quantidade (%)" value={item.movementQuantityTolerancePercent} onChange={(v) => setItem(item.key, { movementQuantityTolerancePercent: v })} error={err(item, "movementQuantityTolerancePercent")} placeholder="2.5" disabled={disabled} />
              <TextField title="Alerta de cota (%)" value={item.quotaAlertPercent} onChange={(v) => setItem(item.key, { quotaAlertPercent: v })} error={err(item, "quotaAlertPercent")} placeholder="90" disabled={disabled} />
            </div>

            <CheckList
              title="Tipos de movimento permitidos *"
              options={[...MOVEMENT_TYPE_CODES]}
              selected={item.allowedMovementTypeCodes}
              onChange={(v) => setItem(item.key, { allowedMovementTypeCodes: v })}
              error={err(item, "allowedMovementTypeCodes")}
              disabled={disabled}
              allowCustom
            />
            <CheckList
              title="Tanques permitidos (vazio = todos)"
              options={tanks.map((t) => t.tankCode)}
              selected={item.allowedTankCodes}
              onChange={(v) => setItem(item.key, { allowedTankCodes: v })}
              emptyText={item.productCode ? "Nenhum tanque ativo da base para este produto." : "Escolha o produto."}
              disabled={disabled}
            />
          </div>
        );
      })}
    </div>
  );
};
