import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import {
  Button,
  Input,
  Modal,
  Select,
  Skeleton,
  Table,
  type TableColumn,
  type TableRowAction,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import type { OwnerProductResponse } from "../services/contract";
import { contractErrorMessage } from "../services/contractErrors";
import type { CatalogProductRef } from "../services/ReferenceService";

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

interface Row extends OwnerProductResponse {
  name: string;
  sapCode: string;
  /** `product.id` (usado nas rotas `/owners/:ownerId/products/:productId`). */
  productId: string;
}

type Dialog =
  | { type: "add" }
  | { type: "edit"; row: Row }
  | { type: "remove"; row: Row }
  | null;

/**
 * Produtos habilitados para o depositante (`OwnerProduct`). Só estes produtos
 * podem entrar em itens de contrato. Escrita exige `canWrite`.
 */
export const OwnerProductsPanel = ({
  ownerId,
  canWrite,
}: {
  ownerId: string;
  canWrite: boolean;
}) => {
  const owners = useIoC("owners");
  const reference = useIoC("contractsReference");

  const [rows, setRows] = useState<Row[]>([]);
  const [catalog, setCatalog] = useState<CatalogProductRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([owners.listProducts(ownerId), reference.listProducts()])
      .then(([ops, products]) => {
        if (cancelled) return;
        setCatalog(products);
        setRows(
          ops.map((op) => ({
            ...op,
            productId: op.product.id,
            name: op.product.name,
            sapCode: op.product.sapCode,
          })),
        );
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(contractErrorMessage(err, "Não foi possível carregar os produtos do depositante."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [owners, reference, ownerId, reloadToken]);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  const columns: TableColumn<Row>[] = [
    { id: "name", label: "Produto", accessor: "name" },
    { id: "sap", label: "Código SAP", accessor: "sapCode" },
    { id: "code", label: "Código do cliente", accessor: (r) => r.customerProductCode ?? "—" },
    { id: "desc", label: "Descrição do cliente", accessor: (r) => r.customerProductDescription ?? "—" },
  ];

  const actions: TableRowAction<Row>[] = canWrite
    ? [
        { id: "edit", label: "Editar rótulos", icon: "Pencil", onClick: (r) => setDialog({ type: "edit", row: r }) },
        { id: "rm", label: "Desvincular", icon: "Trash", variant: "danger", onClick: (r) => setDialog({ type: "remove", row: r }) },
      ]
    : [];

  if (loading) return <Skeleton.Table rows={3} columns={4} showHeader />;
  if (error) {
    return (
      <div role="alert" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={errorText}>{error}</span>
        <Button variant="outlined" size="sm" onClick={reload}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <span style={hint}>
          Só produtos vinculados ao depositante podem entrar em itens de contrato. Editar os
          rótulos não altera itens de contrato já gravados.
        </span>
        {canWrite && (
          <Button variant="outlined" size="sm" onClick={() => setDialog({ type: "add" })}>
            + Vincular produto
          </Button>
        )}
      </div>

      <Table<Row>
        columns={columns}
        data={rows}
        actions={actions}
        title="Produtos do depositante"
        emptyMessage="Nenhum produto vinculado a este depositante"
      />

      {dialog?.type === "add" && (
        <LinkDialog
          title="Vincular produto ao depositante"
          options={catalog.filter((p) => !rows.some((r) => r.productId === p.id))}
          onClose={() => setDialog(null)}
          onSubmit={async (v) => {
            await owners.addProduct(ownerId, v as { productId: string });
            toast.success("Produto vinculado ao depositante.");
            setDialog(null);
            reload();
          }}
        />
      )}
      {dialog?.type === "edit" && (
        <LinkDialog
          title={`Rótulos de ${dialog.row.name}`}
          fixed={dialog.row}
          onClose={() => setDialog(null)}
          onSubmit={async (v) => {
            await owners.updateProduct(ownerId, dialog.row.productId, {
              customerProductCode: v.customerProductCode,
              customerProductDescription: v.customerProductDescription,
            });
            toast.success("Rótulos atualizados.");
            setDialog(null);
            reload();
          }}
        />
      )}
      {dialog?.type === "remove" && (
        <RemoveDialog
          row={dialog.row}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await owners.removeProduct(ownerId, dialog.row.productId);
            toast.success("Produto desvinculado.");
            setDialog(null);
            reload();
          }}
        />
      )}
    </div>
  );
};

interface LinkValues {
  productId: string;
  customerProductCode: string;
  customerProductDescription: string;
}

const LinkDialog = ({
  title,
  options,
  fixed,
  onClose,
  onSubmit,
}: {
  title: string;
  options?: CatalogProductRef[];
  fixed?: Row;
  onClose: () => void;
  onSubmit: (v: LinkValues) => Promise<void>;
}) => {
  const [productId, setProductId] = useState(fixed?.productId ?? "");
  const [code, setCode] = useState(fixed?.customerProductCode ?? "");
  const [desc, setDesc] = useState(fixed?.customerProductDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const labelOf = (id: string): string => {
    const p = options?.find((x) => x.id === id);
    return p ? `${p.name} (${p.sapCode})` : "Selecione";
  };

  const submit = async () => {
    if (!productId) return setMsg("Selecione o produto.");
    if (!code.trim() && !desc.trim()) {
      return setMsg("Informe ao menos um dos rótulos (código ou descrição do cliente).");
    }
    setSaving(true);
    setMsg(null);
    try {
      await onSubmit({ productId, customerProductCode: code, customerProductDescription: desc });
    } catch (err) {
      setMsg(contractErrorMessage(err, "Não foi possível salvar."));
    } finally {
      setSaving(false);
    }
  };

  const close = () => !saving && onClose();

  return (
    <Modal open onClose={close} size="md">
      <Modal.Header title={title} onClose={close} />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {!fixed && (
            <div style={label}>
              Produto *
              <Select<string>
                size="sm"
                value={productId}
                options={(options ?? []).map((p) => ({ option: p.id }))}
                getOptionItemLabel={labelOf}
                getSelectedOptionLabel={labelOf}
                getOptionKey={(v) => v || "__none"}
                placeholder="Selecione"
                onChange={setProductId}
                disabled={saving}
              />
            </div>
          )}
          <label style={label}>
            Código do produto do cliente
            <Input size="sm" value={code} onChange={(e) => setCode(e.target.value)} disabled={saving} />
          </label>
          <label style={label}>
            Descrição do produto do cliente
            <Input size="sm" value={desc} onChange={(e) => setDesc(e.target.value)} disabled={saving} />
          </label>
          <span style={hint}>Ao menos um dos dois rótulos é obrigatório.</span>
          {msg && (
            <span role="alert" style={errorText}>
              {msg}
            </span>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outlined" onClick={close} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={submit} loading={saving} disabled={saving}>
          Salvar
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

const RemoveDialog = ({
  row,
  onClose,
  onConfirm,
}: {
  row: Row;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) => {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const confirm = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await onConfirm();
    } catch (err) {
      setMsg(contractErrorMessage(err, "Não foi possível desvincular."));
    } finally {
      setSaving(false);
    }
  };
  const close = () => !saving && onClose();

  return (
    <Modal open onClose={close} size="sm">
      <Modal.Header title="Desvincular produto" onClose={close} />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#3D4556" }}>
          <span>
            Desvincular <strong>{row.name}</strong> do depositante? Novos contratos não poderão
            usar este produto.
          </span>
          {msg && (
            <span role="alert" style={errorText}>
              {msg}
            </span>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outlined" onClick={close} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" color="error" onClick={confirm} loading={saving} disabled={saving}>
          Desvincular
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
