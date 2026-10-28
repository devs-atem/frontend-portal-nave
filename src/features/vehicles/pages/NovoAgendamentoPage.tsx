import { useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Input,
  PageTitleCard,
  Select,
  Textarea,
  Typography,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { CAP_VEIC, JANELAS, LOCAIS_TRANSF, PATIOS, fN, iso } from "@shared/domain";

const STEPS = [
  "Dados gerais",
  "Veículo e transportadora",
  "Motorista e cliente de venda",
  "Produtos e janela",
  "Resumo",
];

interface WizardState {
  tipo: "Carga" | "Descarga";
  patio: string;
  modal: string;
  frete: string;
  req: string;
  obs: string;
  placa: string;
  car1: string;
  tipoVeic: string;
  uf: string;
  transpNome: string;
  transpDoc: string;
  cpf: string;
  nome: string;
  cnh: string;
  cvRazao: string;
  transf: boolean;
  localTransf: string;
  itens: Array<{ p: string; q: string }>;
  data: string;
  slot: string;
}

const label: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#3D4556", display: "flex", flexDirection: "column", gap: 5 };
const grid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: "14px 16px" };

const UFS = ["AC", "AM", "AP", "PA", "RO", "RR", "TO", "SP", "RJ", "MG"];

export const NovoAgendamentoPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const navigate = useNavigate();
  const cliId = cliente === "all" ? 1 : cliente;

  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [w, setW] = useState<WizardState>({
    tipo: "Carga",
    patio: "",
    modal: "Rodoviário",
    frete: "Sem frete",
    req: "",
    obs: "",
    placa: "",
    car1: "",
    tipoVeic: "",
    uf: "AM",
    transpNome: "",
    transpDoc: "",
    cpf: "",
    nome: "",
    cnh: "",
    cvRazao: "",
    transf: false,
    localTransf: "",
    itens: [{ p: "", q: "" }],
    data: iso(new Date(svc.hoje.getTime() + 86_400_000)),
    slot: "",
  });

  const set = <K extends keyof WizardState>(k: K, v: WizardState[K]) => {
    setW((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const prodOpts = useMemo(
    () => svc.produtos.filter((p) => svc.saldoDisponivelProduto(cliId, p.id) > 0 || w.tipo === "Descarga"),
    [svc, cliId, w.tipo],
  );

  const totalQ = w.itens.reduce((a, it) => a + (Number(it.q.replace(/\D/g, "")) || 0), 0);
  const cap = CAP_VEIC[w.tipoVeic] ?? Infinity;

  function validate(s: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!w.patio) e.patio = "Selecione o pátio.";
      if (!w.req.trim()) e.req = "Informe o nº da requisição ou NF.";
    }
    if (s === 1) {
      if (!w.placa.trim()) e.placa = "Informe a placa do cavalo.";
      if (!w.tipoVeic) e.tipoVeic = "Selecione o tipo de veículo.";
      if (!w.transpNome.trim()) e.transpNome = "Informe a razão social ou nome.";
    }
    if (s === 2) {
      if (!w.cpf.trim()) e.cpf = "Informe o CPF do motorista.";
      if (!w.nome.trim()) e.nome = "Informe o nome do motorista.";
      if (!w.cnh.trim()) e.cnh = "Informe a CNH.";
      if (w.transf && !w.localTransf) e.localTransf = "Selecione o local de transferência.";
    }
    if (s === 3) {
      w.itens.forEach((it, i) => {
        if (!it.p) e[`p${i}`] = "Selecione o produto.";
        if (!Number(it.q.replace(/\D/g, ""))) e[`q${i}`] = "Informe a quantidade.";
      });
      if (totalQ > cap) e.cap = `Total de ${fN(totalQ)} L excede a capacidade (${fN(cap)} L).`;
      if (!w.data) e.data = "Informe a data.";
      if (!w.slot) e.slot = "Escolha uma janela de horário.";
    }
    return e;
  }

  const next = () => {
    const e = validate(step);
    if (Object.keys(e).length) {
      setErrors(e);
      toast.error("Corrija os campos destacados para continuar.");
      return;
    }
    setStep((s) => s + 1);
  };

  const submit = () => {
    for (let s = 0; s < 4; s++) {
      const e = validate(s);
      if (Object.keys(e).length) {
        setStep(s);
        setErrors(e);
        toast.error(`Há campos inválidos no passo ${s + 1}.`);
        return;
      }
    }
    toast.success("Agendamento enviado para autorização do terminal.");
    navigate("/veiculos/agendamentos");
  };

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1100 }}>
      <PageTitleCard title="Novo agendamento" subtitle="Preencha os dados em 5 passos" />

      {/* Stepper */}
      <div style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: "16px 20px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {STEPS.map((t, i) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => i < step && setStep(i)} style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "none", padding: 0, cursor: i < step ? "pointer" : "default" }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", border: `2px solid ${i < step ? "#1E8E5A" : i === step ? "#F39200" : "#CDD3DE"}`, background: i < step ? "#1E8E5A" : i === step ? "#F39200" : "#FFFFFF", color: i <= step ? "#FFFFFF" : "#5B6475", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>{i < step ? "✓" : i + 1}</span>
              <span style={{ fontSize: 13, color: i === step ? "#0D265E" : "#5B6475", fontWeight: i === step ? 700 : 500 }}>{t}</span>
            </button>
            {i < STEPS.length - 1 && <span style={{ width: 36, height: 2, background: i < step ? "#1E8E5A" : "#E2E6EE" }} />}
          </div>
        ))}
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 18 }}>
        <Typography.H4>{`Passo ${Math.min(step + 1, 5)} de 5 — ${STEPS[step]}`}</Typography.H4>

        {step === 0 && (
          <div style={grid}>
            <label style={label}>Tipo de operação *
              <Select<string> value={w.tipo} options={["Carga", "Descarga"].map((o) => ({ option: o }))} onChange={(v) => set("tipo", v as WizardState["tipo"])} />
            </label>
            <label style={label}>Pátio *
              <Select<string> value={w.patio} placeholder="Selecione…" options={PATIOS.map((o) => ({ option: o }))} onChange={(v) => set("patio", v)} error={!!errors.patio} errorMessage={errors.patio} />
            </label>
            <label style={label}>Modal *
              <Select<string> value={w.modal} options={["Rodoviário", "Marítimo", "Dutoviário"].map((o) => ({ option: o }))} onChange={(v) => set("modal", v)} />
            </label>
            <label style={label}>Nº requisição/NF *
              <Input value={w.req} onChange={(e) => set("req", e.target.value)} error={!!errors.req} />
            </label>
            <label style={{ ...label, gridColumn: "1 / -1" }}>Observações
              <Textarea value={w.obs} onChange={(e) => set("obs", e.target.value)} rows={2} />
            </label>
          </div>
        )}

        {step === 1 && (
          <div style={grid}>
            <label style={label}>Placa cavalo *
              <Input value={w.placa} onChange={(e) => set("placa", e.target.value.toUpperCase())} placeholder="ABC1D23" error={!!errors.placa} />
            </label>
            <label style={label}>Carreta 1
              <Input value={w.car1} onChange={(e) => set("car1", e.target.value.toUpperCase())} placeholder="ABC1D23" />
            </label>
            <label style={label}>Tipo de veículo *
              <Select<string> value={w.tipoVeic} placeholder="Selecione…" options={Object.keys(CAP_VEIC).map((o) => ({ option: o }))} onChange={(v) => set("tipoVeic", v)} error={!!errors.tipoVeic} errorMessage={errors.tipoVeic} />
            </label>
            <label style={label}>UF *
              <Select<string> value={w.uf} options={UFS.map((o) => ({ option: o }))} onChange={(v) => set("uf", v)} />
            </label>
            <label style={label}>Transportadora (CNPJ) *
              <Input value={w.transpDoc} onChange={(e) => set("transpDoc", e.target.value)} placeholder="00.000.000/0000-00" />
            </label>
            <label style={label}>Razão social / Nome *
              <Input value={w.transpNome} onChange={(e) => set("transpNome", e.target.value)} error={!!errors.transpNome} />
            </label>
          </div>
        )}

        {step === 2 && (
          <div style={grid}>
            <label style={label}>CPF *
              <Input value={w.cpf} onChange={(e) => set("cpf", e.target.value)} placeholder="000.000.000-00" error={!!errors.cpf} />
            </label>
            <label style={label}>Nome *
              <Input value={w.nome} onChange={(e) => set("nome", e.target.value)} error={!!errors.nome} />
            </label>
            <label style={label}>CNH *
              <Input value={w.cnh} onChange={(e) => set("cnh", e.target.value)} error={!!errors.cnh} />
            </label>
            <label style={label}>Cliente de venda
              <Input value={w.cvRazao} onChange={(e) => set("cvRazao", e.target.value)} />
            </label>
            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input type="checkbox" checked={w.transf} onChange={(e) => set("transf", e.target.checked)} />
              Operação de transferência?
            </label>
            {w.transf && (
              <label style={label}>Local de transferência *
                <Select<string> value={w.localTransf} placeholder="Selecione…" options={LOCAIS_TRANSF.map((o) => ({ option: o }))} onChange={(v) => set("localTransf", v)} error={!!errors.localTransf} errorMessage={errors.localTransf} />
              </label>
            )}
          </div>
        )}

        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Typography.Label>Produtos</Typography.Label>
            {w.itens.map((it, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "28px minmax(200px,1.4fr) minmax(140px,1fr) auto", gap: 12, alignItems: "flex-start" }}>
                <span style={{ height: 38, display: "flex", alignItems: "center", fontWeight: 700, color: "#5B6475" }}>{i + 1}</span>
                <Select<string>
                  value={it.p}
                  placeholder="Produto"
                  options={prodOpts.map((p) => ({ option: String(p.id) }))}
                  getOptionItemLabel={(id) => svc.prod(Number(id)).nome}
                  getSelectedOptionLabel={(id) => svc.prod(Number(id)).nome}
                  getOptionKey={(id) => id}
                  onChange={(v) => setW((s) => { const itens = [...s.itens]; itens[i] = { ...itens[i], p: v }; return { ...s, itens }; })}
                  error={!!errors[`p${i}`]}
                  errorMessage={errors[`p${i}`]}
                />
                <Input value={it.q} onChange={(e) => setW((s) => { const itens = [...s.itens]; const d = e.target.value.replace(/\D/g, ""); itens[i] = { ...itens[i], q: d ? fN(Number(d)) : "" }; return { ...s, itens }; })} placeholder="Quantidade (L)" error={!!errors[`q${i}`]} />
                {w.itens.length > 1 && (
                  <Button variant="outlined" color="error" onClick={() => setW((s) => ({ ...s, itens: s.itens.filter((_, j) => j !== i) }))}>Remover</Button>
                )}
              </div>
            ))}
            <div>
              <Button variant="outlined" onClick={() => setW((s) => ({ ...s, itens: [...s.itens, { p: "", q: "" }] }))}>+ Adicionar produto</Button>
            </div>
            {w.tipoVeic && (
              <span style={{ fontSize: 12, color: totalQ > cap ? "#B42F2F" : "#3D4556" }}>
                Total: {fN(totalQ)} L de {fN(cap)} L de capacidade ({w.tipoVeic})
              </span>
            )}
            {errors.cap && <span style={{ fontSize: 13, color: "#8E2626" }}>{errors.cap}</span>}

            <Typography.Label>Previsão de chegada</Typography.Label>
            <label style={{ ...label, maxWidth: 220 }}>Data *
              <Input type="date" value={w.data} onChange={(e) => set("data", e.target.value)} error={!!errors.data} />
            </label>
            <div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#3D4556" }}>Janela de horário *</span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(104px,1fr))", gap: 8, marginTop: 6 }}>
                {JANELAS.map((h) => (
                  <button key={h} type="button" onClick={() => set("slot", h)} style={{ height: 48, borderRadius: 8, border: `1px solid ${w.slot === h ? "#0D265E" : "#CDD3DE"}`, background: w.slot === h ? "#0D265E" : "#FFFFFF", color: w.slot === h ? "#FFFFFF" : "#0D265E", cursor: "pointer", fontWeight: 700 }}>{h}</button>
                ))}
              </div>
              {errors.slot && <span style={{ fontSize: 12, color: "#B42F2F" }}>{errors.slot}</span>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 14 }}>
            {[
              ["Dados gerais", [["Tipo", w.tipo], ["Pátio", w.patio], ["Modal", w.modal], ["Requisição/NF", w.req]]],
              ["Veículo e transportadora", [["Placa", w.placa], ["Tipo", w.tipoVeic], ["UF", w.uf], ["Transportadora", w.transpNome]]],
              ["Motorista e cliente", [["Motorista", w.nome], ["CPF", w.cpf], ["CNH", w.cnh], ["Cliente de venda", w.cvRazao], ["Transferência", w.transf ? w.localTransf : "Não"]]],
              ["Produtos e janela", [...w.itens.map((it, i) => [`Produto ${i + 1}`, it.p ? `${svc.prod(Number(it.p)).nome} — ${it.q} L` : "—"] as [string, string]), ["Previsão", `${w.data}${w.slot ? ` às ${w.slot}` : ""}`]]],
            ].map(([t, items]) => (
              <div key={t as string} style={{ border: "1px solid #E2E6EE", borderRadius: 10, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                <Typography.Label>{t as string}</Typography.Label>
                {(items as [string, string][]).map(([l, v]) => (
                  <div key={l} style={{ display: "grid", gridTemplateColumns: "150px 1fr", gap: 10, fontSize: 13 }}>
                    <span style={{ color: "#5B6475" }}>{l}</span>
                    <span>{v || "—"}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Navegação */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "space-between", borderTop: "1px solid #E2E6EE", paddingTop: 16 }}>
          <Button variant="outlined" color="error" onClick={() => navigate("/veiculos/agendamentos")}>Cancelar</Button>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {step > 0 && <Button variant="outlined" onClick={() => setStep((s) => Math.max(0, s - 1))}>Voltar</Button>}
            <Button variant="outlined" onClick={() => toast.success("Rascunho salvo.")}>Salvar rascunho</Button>
            {step < 4 ? (
              <Button variant="contained" onClick={next}>Continuar</Button>
            ) : (
              <Button variant="contained" color="warning" onClick={submit}>Enviar agendamento</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NovoAgendamentoPage;
