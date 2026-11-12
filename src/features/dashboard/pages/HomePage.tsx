import { type CSSProperties, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarCheck,
  Droplet,
  Lock,
  Truck,
  type LucideProps,
} from "lucide-react";
import { Card, PageTitleCard, StatusTag, Typography } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { OccupancyTank } from "@shared/components/OccupancyTank";
import { fDH, fH, fN, fPct, statusToTag } from "@shared/domain";
import { BalanceByProductChart } from "../components/BalanceByProductChart";
import { InboundOutboundChart } from "../components/InboundOutboundChart";
import "../components/charts.css";
import "./HomePage.css";

type KpiStatus = "info" | "warning" | "default" | "success";

interface KpiData {
  label: string;
  value: string;
  sub: string;
  icon: ComponentType<LucideProps>;
  status: KpiStatus;
}

const sectionCard: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EE",
  borderRadius: 12,
  padding: 18,
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

export const InicioPage = () => {
  const svc = useIoC("armazenagem");
  const { cliente } = useClienteAtivo();
  const navigate = useNavigate();

  const kpis = svc.kpisDashboard(cliente);
  const kpiCards: KpiData[] = [
    { label: "Saldo total disponível", value: `${fN(kpis.disponivel)} L`, sub: `${fN(kpis.disponivelKg)} kg`, icon: Droplet, status: "info" },
    { label: "Saldo bloqueado", value: `${fN(kpis.bloqueado)} L`, sub: `${fN(kpis.bloqueadoKg)} kg`, icon: Lock, status: "warning" },
    { label: "Veículos no terminal agora", value: String(kpis.veiculosNoTerminal), sub: `${kpis.veiculosEmOperacao} em operação`, icon: Truck, status: "default" },
    { label: "Agendamentos de hoje", value: String(kpis.agendamentosHoje), sub: `${kpis.agendamentosHoje} concluídos`, icon: CalendarCheck, status: "default" },
    { label: "Descargas no mês", value: String(kpis.descargasMes), sub: `${fN(kpis.litrosRecebidosMes)} L recebidos`, icon: ArrowDownToLine, status: "success" },
    { label: "Cargas no mês", value: String(kpis.cargasMes), sub: `${fN(kpis.litrosExpedidosMes)} L expedidos`, icon: ArrowUpFromLine, status: "success" },
  ];
  const tqs = svc.tanquesDe(cliente);
  const prodBars = svc.saldoPorProduto(cliente);
  const movimento = svc.movimentoDiarioDe(cliente);
  const prox = svc.proximosAgendamentos(cliente);
  const nfs = svc.nfesDe(cliente).slice(0, 5);
  const alertas = svc.alertas(cliente).slice(0, 7);

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1680 }}>
      <PageTitleCard
        title="Início"
        subtitle="Visão geral do seu produto no terminal"
      />

      {/* KPIs */}
      <div className="nm-kpis">
        {kpiCards.map((k) => {
          const KpiIcon = k.icon;
          return (
            <div key={k.label} className="nm-kpi">
              <div className="nm-kpi__top">
                <span className={`nm-kpi__badge nm-kpi__badge--${k.status}`}>
                  <KpiIcon size={18} aria-hidden="true" />
                </span>
                <span className="nm-kpi__label">{k.label}</span>
              </div>
              <span className="nm-kpi__value">{k.value}</span>
              <span className="nm-kpi__sub">{k.sub}</span>
            </div>
          );
        })}
      </div>

      {/* Gráficos: saldo por produto + entradas × saídas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,440px),1fr))", gap: 14 }}>
        <BalanceByProductChart
          dados={prodBars}
          nomeProduto={(id) => svc.prod(id).nome}
          corProduto={(id) => svc.corProduto(id)}
        />
        <InboundOutboundChart dados={movimento} />
      </div>

      {/* Ocupação dos tanques */}
      <div style={sectionCard}>
        <Typography.H4>Ocupação dos tanques</Typography.H4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(84px,1fr))", gap: 12 }}>
          {tqs.map((t) => (
            <div key={t.id} title={svc.prod(t.produtoId).nome} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <OccupancyTank ratio={t.vol / t.cap} color={svc.corProduto(t.produtoId)} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#0D265E" }}>{t.codigo}</span>
              <span style={{ fontSize: 12, color: "#3D4556", fontVariantNumeric: "tabular-nums" }}>{fPct(t.vol / t.cap)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Próximos agendamentos + NF-e + alertas */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,340px),1fr))", gap: 14 }}>
        <Card>
          <Card.Header>
            <Typography.H4>Próximos agendamentos</Typography.H4>
          </Card.Header>
          <Card.Body>
            {prox.length === 0 && (
              <Typography.Body>Nenhum agendamento para hoje ou amanhã.</Typography.Body>
            )}
            {prox.map((a) => (
              <div key={a.id} style={{ display: "grid", gridTemplateColumns: "62px 1fr auto", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid #EEF1F5", fontSize: 13 }}>
                <span style={{ fontWeight: 700, color: "#0D265E" }}>{fH(a.previsao)}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace" }}>{a.placa ?? a.navio}</span>
                <StatusTag label={a.status} status={statusToTag(a.status)} size="sm" />
              </div>
            ))}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <Typography.H4>Últimas NF-e emitidas</Typography.H4>
          </Card.Header>
          <Card.Body>
            {nfs.map((n) => (
              <div key={n.id} style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid #EEF1F5", fontSize: 13 }}>
                <span>
                  <strong>NF {n.numero}</strong>
                  <br />
                  <span style={{ fontSize: 12, color: "#5B6475" }}>{fDH(n.emissao)}</span>
                </span>
                <StatusTag label={n.situacao} status={statusToTag(n.situacao)} size="sm" />
              </div>
            ))}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header>
            <Typography.H4>Alertas ({alertas.length})</Typography.H4>
          </Card.Header>
          <Card.Body>
            {alertas.map((a, i) => (
              <button
                key={i}
                type="button"
                onClick={() => navigate("/saldos/posicao")}
                style={{ display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left", padding: "8px 0", border: 0, borderTop: "1px solid #EEF1F5", background: "none", cursor: "pointer", fontSize: 13, width: "100%" }}
              >
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: a.cor, marginTop: 6, flex: "none" }} />
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, color: "#171A21" }}>{a.titulo}</span>
                  <span style={{ fontSize: 12, color: "#5B6475" }}>{a.detalhe}</span>
                </span>
              </button>
            ))}
          </Card.Body>
        </Card>
      </div>
    </div>
  );
};

export default InicioPage;
