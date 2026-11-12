import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Input,
  Modal,
  PageTitleCard,
  Skeleton,
  StatusTag,
  Table,
  type StatusTagStatus,
  type TableColumn,
  type TableRowAction,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useAuth } from "@core/auth/AuthContext";
import {
  formatCnpj,
  isValidCnpj,
  maskCnpj,
  normalizeCnpj,
  type ClientContractSummary,
} from "@features/products/services/contract";
import type {
  ClientRecord,
  ClientRecordInput,
  ProductOption,
} from "../services/ClientRegistrationService";

const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#3D4556",
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const sectionTitle: CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  color: "#0D265E",
  margin: 0,
};

const hint: CSSProperties = { fontSize: 12, color: "#5B6475", fontWeight: 400 };
const errorText: CSSProperties = { color: "#B42F2F", fontWeight: 400 };

interface FormState {
  cnpj: string;
  name: string;
  bpid: string;
  active: boolean;
}

type FormErrors = Partial<Record<"cnpj" | "name" | "bpid" | "branch", string>>;

const EMPTY: FormState = { cnpj: "", name: "", bpid: "", active: true };

/**
 * Mensagem amigável por status HTTP. No 409 a API devolve a mensagem em
 * português (BP ou CNPJ da matriz duplicado, `productIds` repetido): exibe-a.
 */
const errorMessage = (err: unknown, fallback: string): string => {
  const status = err as { status?: number; statusCode?: number } | null;
  const code = status?.status ?? status?.statusCode;
  const msg = err instanceof Error ? err.message : "";
  if (code === 409) return msg || "Já existe um cliente com este BP ou CNPJ.";
  if (code === 400) {
    return /cnpj/i.test(msg)
      ? "CNPJ inválido."
      : "Dados inválidos. Revise os campos informados.";
  }
  if (code === 404) return "Cliente ou produto não encontrado.";
  return msg || fallback;
};

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
};

const statusTone = (status?: string): StatusTagStatus =>
  status === "ACTIVE" ? "success" : status === "SUSPENDED" ? "warning" : "neutral";

const sameSet = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((x) => b.includes(x));

const PageHeader = ({ onCreate }: { onCreate?: () => void }) => (
  <PageTitleCard
    title="Cadastro de clientes"
    subtitle="Gerencie os clientes do portal (CNPJ, nome, BPID, filiais e produtos)"
    actions={
      onCreate && (
        <Button variant="contained" onClick={onCreate}>
          + Novo cliente
        </Button>
      )
    }
  />
);

/** Tabela somente leitura dos contratos vinculados ao cliente (por CNPJ). */
const ContractsTable = ({
  contracts,
}: {
  contracts?: ClientContractSummary[];
}) => {
  if (contracts === undefined) {
    return <span style={hint}>Contratos indisponíveis no momento.</span>;
  }
  if (contracts.length === 0) {
    return <span style={hint}>Nenhum contrato vinculado.</span>;
  }
  const columns: TableColumn<ClientContractSummary>[] = [
    { id: "contractNumber", label: "Contrato", accessor: (c) => c.contractNumber ?? "—" },
    {
      id: "status",
      label: "Status",
      accessor: (c) => c.status ?? "—",
      render: (_v, c) => (
        <StatusTag label={c.status ?? "—"} status={statusTone(c.status)} size="sm" />
      ),
    },
    { id: "from", label: "Início", accessor: (c) => formatDate(c.effectiveFrom) },
    {
      id: "to",
      label: "Fim",
      accessor: (c) => (c.effectiveTo ? formatDate(c.effectiveTo) : "Indeterminada"),
    },
  ];
  return (
    <Table<ClientContractSummary>
      columns={columns}
      data={contracts}
      emptyMessage="Nenhum contrato vinculado"
    />
  );
};

export const ClientRegistrationPage = () => {
  const svc = useIoC("clientRegistration");
  const navigate = useNavigate();
  const { authByPermission } = useAuth();

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

  // Filiais (lista completa, sem máscara).
  const [branches, setBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState("");

  // Produtos vinculados (só na edição; carregados do detalhe do cliente).
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productIds, setProductIds] = useState<string[]>([]);
  const [initialProductIds, setInitialProductIds] = useState<string[]>([]);
  const [productsState, setProductsState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [productSearch, setProductSearch] = useState("");

  // ─── Detalhe (leitura) ─────────────────────────────────────────────────────
  const [detail, setDetail] = useState<ClientRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ─── Exclusão ──────────────────────────────────────────────────────────────
  const [toDelete, setToDelete] = useState<ClientRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  /** Qtde de contratos por CNPJ (null = desconhecida/indisponível). */
  const [deleteContracts, setDeleteContracts] = useState<number | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm((s) => ({ ...s, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const resetFormExtras = () => {
    setBranches([]);
    setBranchInput("");
    setProductOptions([]);
    setProductIds([]);
    setInitialProductIds([]);
    setProductsState("idle");
    setProductSearch("");
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    resetFormExtras();
    setOpen(true);
  };

  const openEdit = (c: ClientRecord) => {
    setEditing(c);
    setForm({ cnpj: c.cnpj, name: c.name, bpid: c.bpid, active: c.active });
    setErrors({});
    resetFormExtras();
    setBranches(c.branches);
    setOpen(true);

    // Carrega os produtos vinculados (detalhe) e as opções do catálogo. Enquanto
    // não terminar, `productIds` não é enviado (evita sobrescrever com lista vazia).
    setProductsState("loading");
    Promise.all([svc.get(c.id), svc.listProductOptions()])
      .then(([full, options]) => {
        const ids = (full.products ?? []).map((p) => p.id);
        setProductOptions(options);
        setProductIds(ids);
        setInitialProductIds(ids);
        setProductsState("ready");
      })
      .catch(() => setProductsState("error"));
  };

  const closeForm = () => {
    if (!saving) setOpen(false);
  };

  const addBranch = () => {
    const value = normalizeCnpj(branchInput);
    let msg: string | undefined;
    if (!value) return;
    if (value.length !== 14 || !isValidCnpj(value)) msg = "CNPJ da filial inválido.";
    else if (branches.includes(value)) msg = "Esta filial já foi adicionada.";
    if (msg) {
      setErrors((e) => ({ ...e, branch: msg }));
      return;
    }
    setBranches((b) => [...b, value]);
    setBranchInput("");
    setErrors((e) => ({ ...e, branch: undefined }));
  };

  const removeBranch = (cnpj: string) =>
    setBranches((b) => b.filter((x) => x !== cnpj));

  const toggleProduct = (id: string) =>
    setProductIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );

  const validate = (): boolean => {
    const e: FormErrors = {};
    const digits = normalizeCnpj(form.cnpj);
    if (!digits) e.cnpj = "Informe o CNPJ.";
    else if (digits.length !== 14) e.cnpj = "CNPJ deve ter 14 caracteres.";
    else if (!isValidCnpj(digits)) e.cnpj = "CNPJ inválido.";
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
      branches,
    };
    // Substituição total: só envia produtos se o detalhe foi carregado e houve mudança.
    if (
      editing &&
      productsState === "ready" &&
      !sameSet(productIds, initialProductIds)
    ) {
      input.productIds = productIds;
    }
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
      if ((err as { status?: number } | null)?.status === 404) {
        setOpen(false);
        reload();
      }
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (c: ClientRecord) => {
    setDetail(c);
    setDetailLoading(true);
    svc
      .get(c.id, { withContracts: true })
      .then((full) => setDetail(full))
      .catch((err: unknown) => {
        toast.error(errorMessage(err, "Não foi possível carregar o detalhe."));
        setDetail(null);
      })
      .finally(() => setDetailLoading(false));
  };

  const openDelete = (c: ClientRecord) => {
    setToDelete(c);
    setDeleteContracts(null);
    // Best effort: a exclusão não verifica contratos no back; avisa o usuário.
    svc
      .get(c.id, { withContracts: true })
      .then((full) => setDeleteContracts(full.contracts?.length ?? null))
      .catch(() => setDeleteContracts(null));
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
      id: "branches",
      label: "Filiais",
      accessor: (c) => c.branches.length,
    },
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
    { id: "view", label: "Detalhes", icon: "Eye", onClick: (c) => openDetail(c) },
    { id: "edit", label: "Editar", icon: "Pencil", onClick: (c) => openEdit(c) },
    {
      id: "del",
      label: "Remover",
      icon: "Trash",
      variant: "danger",
      onClick: (c) => openDelete(c),
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
        <Skeleton.Table rows={6} columns={5} showHeader />
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

  const visibleProducts = productOptions.filter((p) => {
    const t = productSearch.trim().toLowerCase();
    return (
      !t ||
      p.name.toLowerCase().includes(t) ||
      p.sapCode.toLowerCase().includes(t)
    );
  });

  const headquartersDigits = normalizeCnpj(form.cnpj);

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
              CNPJ da matriz *
              <Input
                value={form.cnpj}
                onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
                placeholder="00.000.000/0000-00"
                error={!!errors.cnpj}
                disabled={saving}
              />
              {errors.cnpj && <span style={errorText}>{errors.cnpj}</span>}
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
              {errors.name && <span style={errorText}>{errors.name}</span>}
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
              {errors.bpid && <span style={errorText}>{errors.bpid}</span>}
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

            {/* Filiais */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h4 style={sectionTitle}>Filiais</h4>
              <span style={hint}>
                Os CNPJs das filiais também determinam quais contratos aparecem
                para este cliente. Ao salvar, a lista abaixo substitui todas as
                filiais cadastradas.
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    value={branchInput}
                    onChange={(e) => {
                      setBranchInput(maskCnpj(e.target.value));
                      setErrors((er) => ({ ...er, branch: undefined }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addBranch();
                      }
                    }}
                    placeholder="00.000.000/0000-00"
                    error={!!errors.branch}
                    disabled={saving}
                  />
                </div>
                <Button variant="outlined" onClick={addBranch} disabled={saving}>
                  Adicionar
                </Button>
              </div>
              {errors.branch && <span style={errorText}>{errors.branch}</span>}
              {branchInput && normalizeCnpj(branchInput) === headquartersDigits && (
                <span style={hint}>Atenção: este CNPJ é igual ao da matriz.</span>
              )}
              {branches.length === 0 ? (
                <span style={hint}>Nenhuma filial cadastrada.</span>
              ) : (
                <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
                  {branches.map((b) => (
                    <li
                      key={b}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        border: "1px solid #E2E6EE",
                        borderRadius: 8,
                        padding: "6px 10px",
                        fontSize: 13,
                      }}
                    >
                      <span>{formatCnpj(b)}</span>
                      <Button
                        variant="outlined"
                        onClick={() => removeBranch(b)}
                        disabled={saving}
                      >
                        Remover
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Produtos (só na edição: a API não aceita produtos na criação) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h4 style={sectionTitle}>Produtos vinculados</h4>
              {!editing ? (
                <span style={hint}>
                  Disponível após o cadastro: a API só aceita o vínculo de
                  produtos na edição.
                </span>
              ) : productsState === "loading" ? (
                <span style={hint}>Carregando produtos…</span>
              ) : productsState === "error" ? (
                <span style={errorText}>
                  Não foi possível carregar os produtos. Os vínculos atuais serão
                  mantidos.
                </span>
              ) : (
                <>
                  <span style={hint}>
                    Vínculo cadastral (catálogo): não habilita o produto em
                    contratos. Ao salvar, a seleção substitui todos os vínculos.
                  </span>
                  <Input
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Buscar produto por nome ou código SAP"
                    disabled={saving}
                  />
                  <div
                    style={{
                      maxHeight: 180,
                      overflowY: "auto",
                      border: "1px solid #E2E6EE",
                      borderRadius: 8,
                      padding: 8,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    {visibleProducts.length === 0 ? (
                      <span style={hint}>Nenhum produto encontrado.</span>
                    ) : (
                      visibleProducts.map((p) => (
                        <label
                          key={p.id}
                          style={{ ...label, flexDirection: "row", alignItems: "center", gap: 8, fontWeight: 400 }}
                        >
                          <input
                            type="checkbox"
                            checked={productIds.includes(p.id)}
                            onChange={() => toggleProduct(p.id)}
                            disabled={saving}
                          />
                          {p.name} ({p.sapCode})
                        </label>
                      ))
                    )}
                  </div>
                  <span style={hint}>{productIds.length} produto(s) selecionado(s).</span>
                </>
              )}
            </div>
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

      {/* Detalhe (leitura) */}
      <Modal open={!!detail} onClose={() => setDetail(null)} size="md">
        <Modal.Header
          title={detail?.name ?? "Cliente"}
          subtitle="Detalhes do cliente"
          onClose={() => setDetail(null)}
        />
        <Modal.Body>
          {detailLoading || !detail ? (
            <Skeleton.Table rows={4} columns={3} showHeader />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, color: "#3D4556", fontSize: 13 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
                <span><strong>CNPJ:</strong> {detail.cnpj}</span>
                <span><strong>BPID:</strong> {detail.bpid}</span>
                <span><strong>Situação:</strong> {detail.active ? "Ativo" : "Inativo"}</span>
              </div>

              <div>
                <h4 style={sectionTitle}>Filiais ({detail.branches.length})</h4>
                {detail.branches.length === 0 ? (
                  <span style={hint}>Nenhuma filial cadastrada.</span>
                ) : (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {detail.branches.map((b) => (
                      <li key={b}>{formatCnpj(b)}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h4 style={sectionTitle}>Produtos vinculados ({detail.products?.length ?? 0})</h4>
                {!detail.products || detail.products.length === 0 ? (
                  <span style={hint}>Nenhum produto vinculado.</span>
                ) : (
                  <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                    {detail.products.map((p) => (
                      <li key={p.id}>
                        {p.name} ({p.sapCode})
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <h4 style={sectionTitle}>Contratos</h4>
                <span style={hint}>
                  Vínculo por CNPJ do depositante (matriz e filiais). Esta lista não
                  aplica o escopo de custódia e pode diferir da tela de Contratos.
                </span>
                <ContractsTable contracts={detail.contracts} />
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          {detail && authByPermission("portal_nave:contracts:read") && (
            <Button
              variant="outlined"
              onClick={() => navigate(`/contratos?clientId=${encodeURIComponent(detail.id)}`)}
            >
              Ver contratos
            </Button>
          )}
          <Button variant="outlined" onClick={() => setDetail(null)}>
            Fechar
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
          <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#3D4556" }}>
            <span>
              Tem certeza que deseja remover <strong>{toDelete?.name}</strong>? Esta
              ação é definitiva.
            </span>
            <span style={hint}>
              Serão removidas as filiais e os vínculos com produtos (os produtos
              permanecem). A exclusão não verifica contratos.
            </span>
            {deleteContracts !== null && deleteContracts > 0 && (
              <span role="alert" style={{ color: "#B42F2F", fontWeight: 600 }}>
                Atenção: há {deleteContracts} contrato(s) associado(s) a este
                cliente por CNPJ.
              </span>
            )}
          </div>
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
