import { useState, type CSSProperties } from "react";
import { Button, Input, Modal } from "@devs-atem/design-system";

import type { Cliente } from "@shared/domain";
import type { CatalogProduct } from "../services/ProductsService";
import { productErrorMessage } from "./productErrors";

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

// ─── Criar / editar produto ──────────────────────────────────────────────────

interface ProductFormDialogProps {
  /** `null` = novo produto. */
  product: CatalogProduct | null;
  onClose: () => void;
  /** Deve lançar em caso de falha (a mensagem é exibida no diálogo). */
  onSubmit: (values: { name: string; sapCode: string }) => Promise<void>;
}

export const ProductFormDialog = ({
  product,
  onClose,
  onSubmit,
}: ProductFormDialogProps) => {
  const [name, setName] = useState(product?.name ?? "");
  const [sapCode, setSapCode] = useState(product?.sapCode ?? "");
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; sapCode?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmingSap, setConfirmingSap] = useState(false);
  const [saving, setSaving] = useState(false);

  const sapChanged = !!product && sapCode.trim() !== product.sapCode;

  const submit = async (confirmed = false) => {
    const e: typeof fieldErrors = {};
    if (!name.trim()) e.name = "Informe o nome do produto.";
    if (!sapCode.trim()) e.sapCode = "Informe o código SAP.";
    setFieldErrors(e);
    if (Object.keys(e).length > 0) return;

    // Alterar sapCode tem efeitos em contratos: exige confirmação explícita.
    if (sapChanged && !confirmed) {
      setConfirmingSap(true);
      return;
    }

    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit({ name: name.trim(), sapCode: sapCode.trim() });
    } catch (err) {
      setConfirmingSap(false);
      const msg = productErrorMessage(err, "save");
      if ((err as { status?: number } | null)?.status === 409) {
        setFieldErrors((f) => ({ ...f, sapCode: msg }));
      } else {
        setSubmitError(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal open onClose={close} size="md">
      <Modal.Header
        title={product ? "Editar produto" : "Novo produto"}
        subtitle="Nome e código SAP do produto"
        onClose={close}
      />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={label}>
            Nome *
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldErrors((f) => ({ ...f, name: undefined }));
              }}
              placeholder="Ex.: Diesel S10"
              error={!!fieldErrors.name}
              disabled={saving}
            />
            {fieldErrors.name && <span style={errorText}>{fieldErrors.name}</span>}
          </label>

          <label style={label}>
            Código SAP *
            <Input
              value={sapCode}
              onChange={(e) => {
                setSapCode(e.target.value);
                setFieldErrors((f) => ({ ...f, sapCode: undefined }));
                setConfirmingSap(false);
              }}
              placeholder="Ex.: 000000000012345"
              error={!!fieldErrors.sapCode}
              disabled={saving}
            />
            {fieldErrors.sapCode && <span style={errorText}>{fieldErrors.sapCode}</span>}
          </label>

          {confirmingSap && (
            <div
              role="alert"
              style={{
                border: "1px solid #F39200",
                background: "#FFF6E8",
                borderRadius: 8,
                padding: "10px 12px",
                fontSize: 13,
                color: "#3D4556",
              }}
            >
              <strong>Atenção ao alterar o código SAP.</strong> O código já
              gravado nos itens de contratos existentes <strong>não</strong> é
              atualizado, e o salvamento republica o evento de todos os contratos
              que usam este produto. Evite alterar o código de produto em uso.
            </div>
          )}

          {submitError && <span style={errorText}>{submitError}</span>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outlined" onClick={close} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => submit(confirmingSap)}
          loading={saving}
          disabled={saving}
        >
          {confirmingSap
            ? "Confirmar alteração"
            : product
              ? "Salvar alterações"
              : "Cadastrar"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── Vínculo com clientes ────────────────────────────────────────────────────

interface ProductClientsDialogProps {
  product: CatalogProduct;
  clients: Cliente[];
  /** Ids (substitutos) dos clientes hoje vinculados. */
  initialIds: number[];
  onClose: () => void;
  /** Recebe a lista COMPLETA de ids selecionados (substituição total). */
  onSubmit: (clientIds: number[]) => Promise<void>;
}

export const ProductClientsDialog = ({
  product,
  clients,
  initialIds,
  onClose,
  onSubmit,
}: ProductClientsDialogProps) => {
  const [selected, setSelected] = useState<number[]>(initialIds);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const term = search.trim().toLowerCase();
  const visible = clients.filter(
    (c) =>
      !term ||
      c.razao.toLowerCase().includes(term) ||
      c.cnpj.toLowerCase().includes(term) ||
      c.codigo.toLowerCase().includes(term),
  );

  const unchanged =
    selected.length === initialIds.length &&
    selected.every((id) => initialIds.includes(id));

  const submit = async () => {
    setSaving(true);
    setSubmitError(null);
    try {
      await onSubmit(selected);
    } catch (err) {
      setSubmitError(productErrorMessage(err, "save"));
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) onClose();
  };

  return (
    <Modal open onClose={close} size="md">
      <Modal.Header
        title="Clientes do produto"
        subtitle={`${product.name} (${product.sapCode})`}
        onClose={close}
      />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={hint}>
            Vínculo cadastral (catálogo): <strong>não habilita</strong> o produto
            em contratos — isso depende do vínculo do depositante. Ao salvar, a
            seleção abaixo substitui todos os vínculos atuais.
          </span>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente por nome, CNPJ ou BP"
            disabled={saving}
          />
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              border: "1px solid #E2E6EE",
              borderRadius: 8,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {visible.length === 0 ? (
              <span style={hint}>Nenhum cliente encontrado.</span>
            ) : (
              visible.map((c) => (
                <label
                  key={c.id}
                  style={{ ...label, flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 400 }}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(c.id)}
                    onChange={() => toggle(c.id)}
                    disabled={saving}
                  />
                  {c.razao} — {c.cnpj} (BP {c.codigo})
                </label>
              ))
            )}
          </div>
          <span style={hint}>{selected.length} cliente(s) selecionado(s).</span>
          {submitError && <span style={errorText}>{submitError}</span>}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outlined" onClick={close} disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          loading={saving}
          disabled={saving || unchanged}
        >
          Salvar vínculos
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

// ─── Exclusão ────────────────────────────────────────────────────────────────

interface DeleteProductDialogProps {
  product: CatalogProduct;
  onClose: () => void;
  /** Deve lançar em caso de falha. */
  onConfirm: () => Promise<void>;
}

export const DeleteProductDialog = ({
  product,
  onClose,
  onConfirm,
}: DeleteProductDialogProps) => {
  const [deleting, setDeleting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const confirm = async () => {
    setDeleting(true);
    setSubmitError(null);
    try {
      await onConfirm();
    } catch (err) {
      setSubmitError(productErrorMessage(err, "delete"));
    } finally {
      setDeleting(false);
    }
  };

  const close = () => {
    if (!deleting) onClose();
  };

  return (
    <Modal open onClose={close} size="sm">
      <Modal.Header title="Excluir produto" onClose={close} />
      <Modal.Body>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#3D4556" }}>
          <span>
            Tem certeza que deseja excluir <strong>{product.name}</strong> (
            {product.sapCode})? Esta ação é definitiva.
          </span>
          <span style={hint}>
            Serão removidos os vínculos com clientes e com depositantes. Se o
            produto já foi usado em itens de contrato, a exclusão é bloqueada.
          </span>
          {submitError && (
            <span role="alert" style={{ ...errorText, fontWeight: 600 }}>
              {submitError}
            </span>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outlined" onClick={close} disabled={deleting}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={confirm}
          loading={deleting}
          disabled={deleting}
        >
          Excluir
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
