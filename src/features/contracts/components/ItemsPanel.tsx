import { useState } from "react";
import { CustomTabs, Icon, Input } from "@devs-atem/design-system";
import { Search } from "lucide-react";

import { BREAKPOINTS, useMediaQuery } from "@shared/hooks/useMediaQuery";
import { MOVEMENT_TYPE_CODES } from "../services/contract";
import {
  FIXED_ACCOUNTING_MEASURE,
  emptyItem,
  type ItemForm,
  type ValidationErrors,
} from "../services/contractRules";
import { errorText, label } from "./itemFormStyles";
import { CheckList, TextField } from "./itemFormParts";
import "./ItemsPanel.css";

/** Produto elegível para um item. */
export interface ProductChoice {
  productId: string;
  name: string;
  sapCode: string;
}

type ItemTab = "data" | "rules";

/** Campos de cada aba (para sinalizar erro numa aba que não está aberta). */
const TAB_FIELDS: Record<ItemTab, string[]> = {
  data: [
    "productId",
    "reservedCapacity",
    "maximumCapacity",
    "minimumQuota",
    "maximumQuota",
    "minimumStock",
    "quotaAlertPercent",
    "movementQuantityTolerancePercent",
  ],
  rules: ["movementLimit", "allowedMovementTypeCodes"],
};

interface ItemsPanelProps {
  items: ItemForm[];
  onChange: (items: ItemForm[]) => void;
  errors: ValidationErrors;
  productChoices: ProductChoice[];
  disabled?: boolean;
}

/** Linha da lista: um produto do catálogo (com o item do formulário, se já tocado). */
interface Row {
  productId: string;
  name: string;
  productCode: string;
  item?: ItemForm;
}

/**
 * Seção "Itens do contrato": uma linha por produto, na ordem devolvida pela API,
 * com checkbox. Só os itens marcados vão ao backend. Editar um campo de uma linha
 * desmarcada a marca automaticamente.
 */
export const ItemsPanel = ({
  items,
  onChange,
  errors,
  productChoices,
  disabled,
}: ItemsPanelProps) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ItemTab>("data");
  const stacked = useMediaQuery(BREAKPOINTS.tablet);

  // Ordem do catálogo (API); itens de produtos fora do catálogo atual ficam no fim.
  const rows: Row[] = [
    ...productChoices.map((p) => ({
      productId: p.productId,
      name: p.name,
      productCode: p.sapCode,
      item: items.find((i) => i.productId === p.productId),
    })),
    ...items
      .filter((i) => !productChoices.some((p) => p.productId === i.productId))
      .map((i) => ({
        productId: i.productId,
        name: i.productCode || "Produto",
        productCode: i.productCode,
        item: i,
      })),
  ];

  const selectedRow = rows.find((r) => r.productId === selectedId) ?? rows[0];
  // Linha ainda não tocada: item provisório só para exibir os campos vazios.
  const itemOf = (row: Row): ItemForm =>
    row.item ?? { ...emptyItem(), productId: row.productId, productCode: row.productCode };
  const selected = selectedRow ? itemOf(selectedRow) : undefined;

  const itemErrors = (item: ItemForm): string[] =>
    Object.keys(errors).filter((k) => k.startsWith(`item.${item.key}.`));
  const err = (item: ItemForm, f: string): string | undefined => errors[`item.${item.key}.${f}`];
  const tabHasError = (item: ItemForm, t: ItemTab): boolean =>
    TAB_FIELDS[t].some((f) => err(item, f));

  /** Aplica `patch` ao item da linha, criando-o (já marcado) se ainda não existir. */
  const patchRow = (row: Row, patch: Partial<ItemForm>) => {
    if (row.item) {
      onChange(items.map((i) => (i === row.item ? { ...i, ...patch } : i)));
    } else {
      onChange([...items, { ...itemOf(row), included: true, ...patch }]);
    }
  };
  const setIncluded = (row: Row, included: boolean) => patchRow(row, { included });
  // Editar um campo de uma linha desmarcada a marca.
  const edit = (row: Row, patch: Partial<ItemForm>) => patchRow(row, { ...patch, included: true });

  const isIncluded = (row: Row): boolean => !!row.item?.included;

  const needle = query.trim().toLowerCase();
  const visible = rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => {
      return (
        !needle ||
        row.name.toLowerCase().includes(needle) ||
        row.productCode.toLowerCase().includes(needle)
      );
    });

  return (
    <section className="nm-items" aria-label="Itens do contrato">
      <div className="nm-items__header">
        <div className="nm-items__heading">
          <span className="nm-items__badge">
            <Icon name="Package" size="lg" aria-hidden />
          </span>
          <div>
            <h3 className="nm-items__title">Itens do contrato</h3>
            <p className="nm-items__subtitle">
              Gerencie os produtos, capacidades e regras de movimentação do contrato.
            </p>
          </div>
        </div>
      </div>

      {productChoices.length === 0 && (
        <span style={errorText}>Nenhum produto disponível para compor os itens.</span>
      )}

      <div className={`nm-items__body${stacked ? " nm-items__body--stacked" : ""}`}>
        <div className="nm-items__sidebar">
          <Input
            size="sm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar produto..."
            aria-label="Buscar produto"
            leadingIcon={<Search size={16} />}
          />
          <ul className="nm-items__list" aria-label="Lista de itens">
            {rows.length === 0 && <li className="nm-items__empty">Nenhum produto disponível.</li>}
            {rows.length > 0 && visible.length === 0 && (
              <li className="nm-items__empty">Nenhum item encontrado.</li>
            )}
            {visible.map(({ row, index }) => {
              const isSelected = row === selectedRow;
              const rowItem = row.item;
              const hasError = !!rowItem && itemErrors(rowItem).length > 0;
              return (
                <li
                  key={row.productId}
                  className={`nm-items__row${isSelected ? " nm-items__row--selected" : ""}`}
                >
                  <button
                    type="button"
                    className="nm-items__pick"
                    aria-current={isSelected || undefined}
                    onClick={() => setSelectedId(row.productId)}
                  >
                    <span
                      className={`nm-items__number${hasError ? " nm-items__number--error" : ""}`}
                    >
                      {index + 1}
                    </span>
                    <span className="nm-items__name" title={row.name}>
                      {row.name}
                    </span>
                  </button>
                  <input
                    type="checkbox"
                    className="nm-items__check"
                    checked={isIncluded(row)}
                    onChange={(e) => setIncluded(row, e.target.checked)}
                    disabled={disabled}
                    aria-label={`Incluir ${row.name}`}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <div className="nm-items__detail">
          {!selectedRow || !selected ? (
            <div className="nm-items__empty-detail">
              <Icon name="PackagePlus" size={32} aria-hidden />
              <span>Nenhum produto disponível para informar capacidades e regras.</span>
            </div>
          ) : (
            <>
              <div className="nm-items__detail-header">
                <div className="nm-items__detail-title">
                  <span className="nm-items__detail-icon">
                    <Icon name="Fuel" size="md" aria-hidden />
                  </span>
                  <span className="nm-items__detail-name">{selectedRow.name}</span>
                </div>
              </div>

              <div className="nm-items__detail-body">
                <CustomTabs
                  value={tab}
                  onChange={(v) => setTab(v as ItemTab)}
                  aria-label="Seções do item"
                >
                  <CustomTabs.List aria-label="Alternar seção do item">
                    <CustomTabs.Tab value="data">
                      Dados do item{tabHasError(selected, "data") ? " •" : ""}
                    </CustomTabs.Tab>
                    <CustomTabs.Tab value="rules">
                      Regras de movimentação{tabHasError(selected, "rules") ? " •" : ""}
                    </CustomTabs.Tab>
                  </CustomTabs.List>
                </CustomTabs>

                {tab === "data" && (
                  <>
                    <div className="nm-items__row-grid nm-items__row-grid--product">
                      <label style={label}>
                        Produto
                        <Input
                          size="sm"
                          value={`${selectedRow.name} (${selectedRow.productCode})`}
                          disabled
                          readOnly
                        />
                        {err(selected, "productId") && (
                          <span style={errorText}>{err(selected, "productId")}</span>
                        )}
                      </label>
                      <div style={label}>
                        Medida contábil
                        <span style={{ fontSize: 14, fontWeight: 400, color: "#1F2937" }}>
                          {FIXED_ACCOUNTING_MEASURE}
                        </span>
                      </div>
                    </div>

                    <div className="nm-items__row-grid nm-items__row-grid--quantities">
                      <TextField
                        title="Capacidade reservada *"
                        value={selected.reservedCapacity}
                        onChange={(v) => edit(selectedRow, { reservedCapacity: v })}
                        error={err(selected, "reservedCapacity")}
                        placeholder="1000.000"
                        disabled={disabled}
                      />
                      <TextField
                        title="Capacidade máxima *"
                        value={selected.maximumCapacity}
                        onChange={(v) => edit(selectedRow, { maximumCapacity: v })}
                        error={err(selected, "maximumCapacity")}
                        placeholder="1500.000"
                        disabled={disabled}
                      />
                      <TextField
                        title="Cota mínima"
                        value={selected.minimumQuota}
                        onChange={(v) => edit(selectedRow, { minimumQuota: v })}
                        error={err(selected, "minimumQuota")}
                        disabled={disabled}
                      />
                      <TextField
                        title="Cota máxima *"
                        value={selected.maximumQuota}
                        onChange={(v) => edit(selectedRow, { maximumQuota: v })}
                        error={err(selected, "maximumQuota")}
                        disabled={disabled}
                      />
                      <TextField
                        title="Estoque mínimo"
                        value={selected.minimumStock}
                        onChange={(v) => edit(selectedRow, { minimumStock: v })}
                        error={err(selected, "minimumStock")}
                        disabled={disabled}
                      />
                    </div>

                    <div className="nm-items__row-grid nm-items__row-grid--percent">
                      <TextField
                        title="Alerta de cota (%)"
                        value={selected.quotaAlertPercent}
                        onChange={(v) => edit(selectedRow, { quotaAlertPercent: v })}
                        error={err(selected, "quotaAlertPercent")}
                        placeholder="90"
                        disabled={disabled}
                      />
                      <span className="nm-items__divider" aria-hidden="true" />
                      <TextField
                        title="Tolerância de quantidade (%)"
                        value={selected.movementQuantityTolerancePercent}
                        onChange={(v) => edit(selectedRow, { movementQuantityTolerancePercent: v })}
                        error={err(selected, "movementQuantityTolerancePercent")}
                        placeholder="2.5"
                        disabled={disabled}
                      />
                    </div>
                  </>
                )}

                {tab === "rules" && (
                  <>
                    <div className="nm-items__row-grid nm-items__row-grid--product">
                      <TextField
                        title="Limite de movimentação"
                        value={selected.movementLimit}
                        onChange={(v) => edit(selectedRow, { movementLimit: v })}
                        error={err(selected, "movementLimit")}
                        disabled={disabled}
                      />
                    </div>
                    <CheckList
                      title="Tipos de movimento permitidos *"
                      options={[...MOVEMENT_TYPE_CODES]}
                      selected={selected.allowedMovementTypeCodes}
                      onChange={(v) => edit(selectedRow, { allowedMovementTypeCodes: v })}
                      error={err(selected, "allowedMovementTypeCodes")}
                      disabled={disabled}
                    />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default ItemsPanel;
