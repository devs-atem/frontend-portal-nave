import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Modal,
  PageTitleCard,
  Skeleton,
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
  active: boolean;
}

type FormErrors = Partial<Record<"cnpj" | "name" | "bpid", string>>;

const EMPTY: FormState = { cnpj: "", name: "", bpid: "", active: true };

const errorMessage = (err: unknown, fallback: string): string =>
  err instanceof Error && err.message ? err.message : fallback;

const PageHeader = ({ onCreate }: { onCreate?: () => void }) => (
  <PageTitleCard
    title="Cadastro de clientes"
    subtitle="Gerencie os clientes do portal (CNPJ, nome e BPID)"
    actions={
      onCreate && (
        <Button variant="contained" onClick={onCreate}>
          + Novo cliente
        </Button>
      )
    }
  />
);

export const ClientRegistrationPage = () => {
  const svc = useIoC("clientRegistration");

  // ─── Carregamento ──────────────────────────────────────────────────────────
  const [data, setData] = useState<ClientRecord[]>([]);
  /** Primeira carga (skeleton de página inteira). */
  const [loading, setLoading] = useState(true);
  /** Recarga após uma mutação (skeleton dentro da tabela). */
  const [reloading, setReloading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    svc
      .list()
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        void err;
        const normalized = new Error("Não foi possível exibir os dados.");
        setError(normalized);
        toast.error(normalized.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setReloading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [svc, reloadToken]);

  const reload = useCallback(() => {
    setReloading(true);
    setReloadToken((t) => t + 1);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setReloadToken((t) => t + 1);
  }, []);

  // ─── Formulário ────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);

  // ─── Exclusão ──────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<ClientRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setOpen(true);
  };

  const openEdit = (c: ClientRecord) => {
    setEditing(c);
    setForm({ cnpj: c.cnpj, name: c.name, bpid: c.bpid, active: c.active });
    setErrors({});
    setOpen(true);
  };

  const closeForm = () => {
    if (!saving) setOpen(false);
  };

  const validate = (): boolean => {
    const e: FormErrors = {};
    const digits = form.cnpj.replace(/\D/g, "");
    if (!digits) e.cnpj = "Informe o CNPJ.";
    else if (digits.length !== 14) e.cnpj = "CNPJ deve ter 14 dígitos.";
    if (!form.name.trim()) e.name = "Informe o nome do cliente.";
    if (!form.bpid.trim()) e.bpid = "Informe o BPID.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) {
      toast.error("Corrija os campos destacados.");
      return;
    }
    const input: ClientRecordInput = {
      cnpj: form.cnpj,
      name: form.name.trim(),
      bpid: form.bpid.trim(),
      active: form.active,
    };
    setSaving(true);
    try {
      if (editing) {
        await svc.update(editing.id, input, editing.branches);
        toast.success("Cliente atualizado.");
      } else {
        await svc.create(input);
        toast.success("Cliente cadastrado.");
      }
      setOpen(false);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível salvar o cliente."));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await svc.remove(toDelete.id);
      toast.success(`Cliente "${toDelete.name}" removido.`);
      setToDelete(null);
      reload();
    } catch (err) {
      toast.error(errorMessage(err, "Não foi possível remover o cliente."));
    } finally {
      setDeleting(false);
    }
  };

  const columns: TableColumn<ClientRecord>[] = [
    { id: "name", label: "Nome", accessor: "name", sortable: true },
    { id: "cnpj", label: "CNPJ", accessor: "cnpj" },
    { id: "bpid", label: "BPID", accessor: "bpid" },
    {
      id: "active",
      label: "Situação",
      align: "right",
      accessor: (c) => (c.active ? "Ativo" : "Inativo"),
      render: (_v, c) => (
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
    {
      id: "del",
      label: "Remover",
      icon: "Trash",
      variant: "danger",
      onClick: (c) => setToDelete(c),
    },
  ];

  const pageStyle: CSSProperties = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  // Primeira carga: skeleton da tabela.
  if (loading) {
    return (
      <div style={pageStyle} aria-busy="true">
        <PageHeader />
        <Skeleton.Table rows={6} columns={4} showHeader />
      </div>
    );
  }

  // Falha na carga: mensagem + nova tentativa.
  if (error) {
    return (
      <div style={pageStyle}>
        <PageHeader />
        <div
          role="alert"
          style={{
            background: "#FFFFFF",
            border: "1px solid #E2E6EE",
            borderRadius: 12,
            padding: "32px 24px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            color: "#3D4556",
          }}
        >
          <span>{error.message}</span>
          <Button variant="contained" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <PageHeader onCreate={openCreate} />

      <Table<ClientRecord>
        columns={columns}
        data={data}
        title="Clientes"
        actions={actions}
        loading={reloading}
        skeletonRows={6}
        emptyMessage="Nenhum cliente cadastrado"
      />

      {/* Cadastro / edição */}
      <Modal open={open} onClose={closeForm} size="md">
        <Modal.Header
          title={editing ? "Editar cliente" : "Novo cliente"}
          subtitle="Preencha os dados do cliente"
          onClose={closeForm}
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
                disabled={saving}
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
                disabled={saving}
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
                placeholder="Ex.: 100245"
                error={!!errors.bpid}
                disabled={saving}
              />
              {errors.bpid && (
                <span style={{ color: "#B42F2F", fontWeight: 400 }}>{errors.bpid}</span>
              )}
            </label>

            <label style={{ ...label, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                disabled={saving}
              />
              Cliente ativo
            </label>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outlined" onClick={closeForm} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={save} loading={saving} disabled={saving}>
            {editing ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Confirmação de exclusão */}
      <Modal
        open={!!toDelete}
        onClose={() => !deleting && setToDelete(null)}
        size="sm"
      >
        <Modal.Header
          title="Remover cliente"
          onClose={() => !deleting && setToDelete(null)}
        />
        <Modal.Body>
          <span style={{ color: "#3D4556" }}>
            Tem certeza que deseja remover <strong>{toDelete?.name}</strong>? Esta
            ação não pode ser desfeita.
          </span>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outlined"
            onClick={() => setToDelete(null)}
            disabled={deleting}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={confirmRemove}
            loading={deleting}
            disabled={deleting}
          >
            Remover
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ClientRegistrationPage;
