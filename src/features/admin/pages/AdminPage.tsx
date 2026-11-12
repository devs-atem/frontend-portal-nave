import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  Button,
  CustomTabs,
  Input,
  PageTitleCard,
  StatusTag,
  Table,
  Typography,
  type TableColumn,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import {
  JANELAS,
  fDH,
  fDec,
  fN,
  fPct,
  statusToTag,
  type Auditoria,
  type Produto,
  type Tanque,
  type Usuario,
} from "@shared/domain";

const label: CSSProperties = { fontSize: 12, fontWeight: 600, color: "#3D4556", display: "flex", flexDirection: "column", gap: 5, maxWidth: 220 };

export const AdminPage = () => {
  const svc = useIoC("armazenagem");
  const [tol, setTol] = useState("0,5");
  const [prazo, setPrazo] = useState("2");
  const [inativ, setInativ] = useState("30");

  const usuarioCols: TableColumn<Usuario>[] = [
    { id: "nome", label: "Nome", accessor: "nome", sortable: true },
    { id: "email", label: "E-mail", accessor: "email" },
    { id: "perfil", label: "Perfil", accessor: "perfil" },
    { id: "clientes", label: "Clientes", accessor: "clientes" },
    { id: "ultimo", label: "Último acesso", accessor: (u) => fDH(u.ultimo) },
    { id: "ativo", label: "Situação", accessor: (u) => (u.ativo ? "Ativo" : "Inativo"), render: (_v, u) => <StatusTag label={u.ativo ? "Ativo" : "Inativo"} status={statusToTag(u.ativo ? "Ativo" : "Inativo")} size="sm" /> },
  ];

  const produtoCols: TableColumn<Produto>[] = [
    { id: "codigo", label: "Código", accessor: "codigo", sortable: true },
    { id: "nome", label: "Produto", accessor: "nome" },
    { id: "un", label: "Unidade", accessor: () => "Litros" },
    { id: "dens", label: "Densidade padrão (20 °C)", accessor: (p) => fDec(p.dens, 4), align: "right" },
  ];

  const tanqueCols: TableColumn<Tanque>[] = [
    { id: "codigo", label: "Tanque", accessor: "codigo", sortable: true },
    { id: "produto", label: "Produto", accessor: (t) => svc.prod(t.produtoId).nome },
    { id: "cliente", label: "Cliente", accessor: (t) => svc.cli(t.clienteId).codigo },
    { id: "cap", label: "Capacidade (L)", accessor: (t) => fN(t.cap), align: "right" },
    { id: "vol", label: "Volume atual (L)", accessor: (t) => fN(t.vol), align: "right" },
    { id: "ocup", label: "Ocupação", accessor: (t) => fPct(t.vol / t.cap), align: "right" },
  ];

  const auditCols: TableColumn<Auditoria>[] = [
    { id: "dh", label: "Data/hora", accessor: (a) => fDH(a.dh), sortable: true },
    { id: "u", label: "Usuário", accessor: "u" },
    { id: "acao", label: "Ação", accessor: "acao" },
    { id: "ent", label: "Entidade", accessor: "ent" },
    { id: "id", label: "ID", accessor: "id" },
  ];

  interface Janela { horario: string; vagas: string }
  const janelas: Janela[] = JANELAS.map((h, i) => ({ horario: h, vagas: `${3 + (i % 3)} vagas` }));
  const janelaCols: TableColumn<Janela>[] = [
    { id: "horario", label: "Horário", accessor: "horario" },
    { id: "vagas", label: "Pátio A", accessor: "vagas", align: "right" },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard title="Administração" subtitle="Cadastros e parâmetros do portal" />

      <CustomTabs defaultValue="usuarios">
        <CustomTabs.List aria-label="Seções da administração">
          <CustomTabs.Tab value="usuarios">Usuários e perfis</CustomTabs.Tab>
          <CustomTabs.Tab value="patios">Pátios e janelas</CustomTabs.Tab>
          <CustomTabs.Tab value="produtos">Produtos</CustomTabs.Tab>
          <CustomTabs.Tab value="tanques">Tanques</CustomTabs.Tab>
          <CustomTabs.Tab value="param">Tolerâncias e parâmetros</CustomTabs.Tab>
          <CustomTabs.Tab value="auditoria">Log de auditoria</CustomTabs.Tab>
        </CustomTabs.List>

        <CustomTabs.Panel value="usuarios">
          <Table<Usuario> columns={usuarioCols} data={svc.usuarios} title="Usuários" />
        </CustomTabs.Panel>
        <CustomTabs.Panel value="patios">
          <Table<Janela> columns={janelaCols} data={janelas} title="Janelas do Pátio A" />
        </CustomTabs.Panel>
        <CustomTabs.Panel value="produtos">
          <Table<Produto> columns={produtoCols} data={svc.produtos} title="Produtos" />
        </CustomTabs.Panel>
        <CustomTabs.Panel value="tanques">
          <Table<Tanque> columns={tanqueCols} data={svc.tanques} title="Tanques" />
        </CustomTabs.Panel>
        <CustomTabs.Panel value="param">
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E6EE", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 16, maxWidth: 640 }}>
            <Typography.H4>Tolerâncias e parâmetros</Typography.H4>
            <label style={label}>Tolerância de diferença de peso/quantidade (%)
              <Input value={tol} onChange={(e) => setTol(e.target.value)} />
            </label>
            <label style={label}>Prazo mínimo para editar/cancelar agendamento (horas)
              <Input value={prazo} onChange={(e) => setPrazo(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label style={label}>Expiração de sessão por inatividade (minutos)
              <Input value={inativ} onChange={(e) => setInativ(e.target.value.replace(/\D/g, ""))} />
            </label>
            <div>
              <Button variant="contained" onClick={() => {
                const v = parseFloat(tol.replace(",", "."));
                if (!(v > 0 && v < 10)) { toast.error("Tolerância inválida. Informe um percentual entre 0,01 e 10."); return; }
                toast.success("Parâmetros salvos e registrados no log de auditoria.");
              }}>Salvar parâmetros</Button>
            </div>
          </div>
        </CustomTabs.Panel>
        <CustomTabs.Panel value="auditoria">
          <Table<Auditoria> columns={auditCols} data={svc.auditoria} title="Log de auditoria" />
        </CustomTabs.Panel>
      </CustomTabs>
    </div>
  );
};

export default AdminPage;
