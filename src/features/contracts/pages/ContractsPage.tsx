import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button, Input, PageTitleCard } from "@devs-atem/design-system";

import { useAuth } from "@core/auth/AuthContext";

interface ContractForm {
  produtos: string;
  capacidadeEstatica: string;
  reservaMinimaEac: string;
  destinacaoSaldo: string;
  giroMinimo: string;
  movimentacaoMensalMinima: string;
  baseVolumetrica: string;
  operacaoFluvialMinima: string;
  ctAnexoI: string;
  perdaOperacional: string;
}

const WRITE_PERMISSION = "portal_nave:contracts:write";

const INITIAL: ContractForm = {
  produtos: "Etanol Anidro (EAC) e Etanol Hidratado (EHC)",
  capacidadeEstatica: "6500",
  reservaMinimaEac: "3750",
  destinacaoSaldo: "EAC e/ou EHC",
  giroMinimo: "2.5",
  movimentacaoMensalMinima: "16250",
  baseVolumetrica: "Volume corrigido a 20 °C",
  operacaoFluvialMinima: "2000",
  ctAnexoI: "65",
  perdaOperacional: "0.25",
};

const toNumber = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

export const ContractsPage = () => {
  const { authByPermission } = useAuth();
  const canEdit = authByPermission(WRITE_PERMISSION);

  const [form, setForm] = useState<ContractForm>(INITIAL);
  const set =
    (key: keyof ContractForm) => (e: ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  // Saldo flexível = capacidade estática total − reserva mínima para EAC.
  const saldoFlexivel = Math.max(
    0,
    toNumber(form.capacidadeEstatica) - toNumber(form.reservaMinimaEac),
  );

  const invalid =
    toNumber(form.reservaMinimaEac) > toNumber(form.capacidadeEstatica);

  const handleSave = () => {
    if (invalid) {
      toast.error("A reserva mínima não pode exceder a capacidade estática.");
      return;
    }
    // TODO: persistir via API quando o endpoint de contratos estiver disponível.
    toast.success("Parâmetros contratuais salvos.");
  };

  const field = (
    label: string,
    key: keyof ContractForm,
    opts: { type?: string; unit?: string } = {},
  ) => (
    <label
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: "#3D4556",
        display: "flex",
        flexDirection: "column",
        gap: 5,
      }}
    >
      {label}
      {opts.unit ? ` (${opts.unit})` : ""}
      <Input
        type={opts.type ?? "text"}
        value={form[key]}
        onChange={set(key)}
        disabled={!canEdit}
      />
    </label>
  );

  return (
    <div
      style={{
        padding: "24px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
      }}
    >
      <PageTitleCard
        title="Contratos"
        subtitle="Parâmetros contratuais de armazenagem"
      />

      <div
        style={{
          background: "#FFFFFF",
          border: "1px solid #E2E6EE",
          borderRadius: 12,
          padding: "18px 20px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,260px),1fr))",
          gap: 16,
        }}
      >
        {field("Produtos contratados", "produtos")}
        {field("Capacidade estática total", "capacidadeEstatica", {
          type: "number",
          unit: "m³",
        })}
        {field("Reserva mínima para EAC", "reservaMinimaEac", {
          type: "number",
          unit: "m³",
        })}

        <label
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#3D4556",
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          Saldo flexível (m³) — calculado
          <Input value={fmt(saldoFlexivel)} disabled readOnly />
        </label>

        {field("Destinação do saldo", "destinacaoSaldo")}
        {field("Giro mínimo", "giroMinimo", {
          type: "number",
          unit: "vezes/mês",
        })}
        {field("Movimentação mensal mínima", "movimentacaoMensalMinima", {
          type: "number",
          unit: "m³",
        })}
        {field("Base volumétrica", "baseVolumetrica")}
        {field("Operação fluvial mínima", "operacaoFluvialMinima", {
          type: "number",
          unit: "m³ por embarcação",
        })}
        {field("CT no Anexo I — máximo", "ctAnexoI", {
          type: "number",
          unit: "m³",
        })}
        {field("Perda operacional admissível", "perdaOperacional", {
          type: "number",
          unit: "% ao mês",
        })}
      </div>

      {invalid && (
        <span style={{ color: "#B42318", fontSize: 13 }}>
          A reserva mínima para EAC não pode exceder a capacidade estática
          total.
        </span>
      )}

      {canEdit && (
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="contained" onClick={handleSave}>
            Salvar
          </Button>
          <Button variant="outlined" onClick={() => setForm(INITIAL)}>
            Restaurar padrão
          </Button>
        </div>
      )}
    </div>
  );
};

export default ContractsPage;
