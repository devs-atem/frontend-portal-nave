import { useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Modal,
  PageTitleCard,
  StatusTag,
  Table,
  type TableColumn,
  type TableRowAction,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import type {
  ClientRecord,
  ClientRecordInput,
} from "../services/ClientRegistrationService";

const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#3D4556",
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

/** Aplica máscara de CNPJ (00.000.000/0000-00) a partir dos dígitos. */
const maskCnpj = (v: string): string =>
  v
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

interface FormState {
  cnpj: string;
  name: string;
  bpid: string;
}

const EMPTY: FormState = { cnpj: "", name: "", bpid: "" };

export const ClientRegistrationPage = () => {
  const svc = useIoC("clientRegistration");
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<FormState>>({});

  const data = svc.list();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (c: ClientRecord) => {
    setEditId(c.id);
    setForm({ cnpj: c.cnpj, name: c.name, bpid: c.bpid });
    setErrors({});
    setOpen(true);
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    const digits = form.cnpj.replace(/\D/g, "");
    if (!digits) e.cnpj = "Informe o CNPJ.";
    else if (digits.length !== 14) e.cnpj = "CNPJ deve ter 14 dígitos.";
    if (!form.name.trim()) e.name = "Informe o nome do cliente.";
    if (!form.bpid.trim()) e.bpid = "Informe o BPID.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = () => {
    if (!validate()) {
      toast.error("Corrija os campos destacados.");
      return;
    }
    const input: ClientRecordInput = {
      cnpj: form.cnpj,
      name: form.name.trim(),
      bpid: form.bpid.trim(),
    };
    if (editId) {
      svc.update(editId, input);
      toast.success("Cliente atualizado.");
    } else {
      svc.create(input);
      toast.success("Cliente cadastrado.");
    }
    setOpen(false);
    refresh();
  };

  const remove = (c: ClientRecord) => {
    svc.remove(c.id);
    toast.success(`Cliente "${c.name}" removido.`);
    refresh();
  };

  const columns: TableColumn<ClientRecord>[] = [
    { id: "name", label: "Nome", accessor: "name", sortable: true },
    { id: "cnpj", label: "CNPJ", accessor: "cnpj" },
    { id: "bpid", label: "BPID", accessor: "bpid" },
    {
      id: "active",
      label: "Situação",
      align: "right",
      accessor: (c) => (
        <StatusTag
          label={c.active ? "Ativo" : "Inativo"}
          status={c.active ? "success" : "neutral"}
          size="sm"
        />
      ),
    },
  ];

  const actions: TableRowAction<ClientRecord>[] = [
    { id: "edit", label: "Editar", icon: "Pencil", onClick: (c) => openEdit(c) },
    { id: "del", label: "Remover", icon: "Trash", variant: "danger", onClick: (c) => remove(c) },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Cadastro de clientes"
        subtitle="Gerencie os clientes do portal (CNPJ, nome e BPID)"
        actions={
          <Button variant="contained" onClick={openCreate}>
            + Novo cliente
          </Button>
        }
      />

      <Table<ClientRecord>
        columns={columns}
        data={data}
        title="Clientes"
        actions={actions}
        emptyMessage="Nenhum cliente cadastrado"
      />

      <Modal open={open} onClose={() => setOpen(false)} size="md">
        <Modal.Header
          title={editId ? "Editar cliente" : "Novo cliente"}
          subtitle="Preencha os dados do cliente"
          onClose={() => setOpen(false)}
        />
        <Modal.Body>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={label}>
              CNPJ *
              <Input
                value={form.cnpj}
                onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                error={!!errors.cnpj}
              />
              {errors.cnpj && (
                <span style={{ color: "#B42F2F", fontWeight: 400 }}>{errors.cnpj}</span>
              )}
            </label>

            <label style={label}>
              Nome *
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="Razão social"
                error={!!errors.name}
              />
              {errors.name && (
                <span style={{ color: "#B42F2F", fontWeight: 400 }}>{errors.name}</span>
              )}
            </label>

            <label style={label}>
              BPID *
              <Input
                value={form.bpid}
                onChange={(e) => set("bpid", e.target.value)}
                placeholder="Ex.: BP-100245"
                error={!!errors.bpid}
              />
              {errors.bpid && (
                <span style={{ color: "#B42F2F", fontWeight: 400 }}>{errors.bpid}</span>
              )}
            </label>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outlined" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={save}>
            {editId ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ClientRegistrationPage;
