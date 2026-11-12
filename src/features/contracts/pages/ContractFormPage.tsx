import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button, Input, PageTitleCard, Select, Skeleton } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { DateField } from "@shared/components/DateField";
import { RevisionEditor, type ProductChoice } from "../components/RevisionEditor";
import type {
  BaseResponse,
  ContractResponse,
  OwnerOption,
} from "../services/contract";
import { contractErrorMessage, errorStatus, isStaleStateError } from "../services/contractErrors";
import {
  buildContractRequest,
  buildRevisionInput,
  emptyContractForm,
  formFromContract,
  isoToDate,
  revisionFormFromContract,
  validateContractForm,
  type ContractForm,
  type ValidationErrors,
} from "../services/contractRules";

export type ContractFormMode = "create" | "edit" | "revision";

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
const section: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EE",
  borderRadius: 12,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const grid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,240px),1fr))",
  gap: 14,
};

const TITLE: Record<ContractFormMode, string> = {
  create: "Novo contrato",
  edit: "Editar rascunho",
  revision: "Nova revisão",
};

export const ContractFormPage = ({ mode }: { mode: ContractFormMode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const contracts = useIoC("contracts");
  const owners = useIoC("owners");
  const reference = useIoC("contractsReference");

  const [form, setForm] = useState<ContractForm>(emptyContractForm());
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [ownersList, setOwnersList] = useState<OwnerOption[]>([]);
  /** Falha ao carregar `GET /rest/owners/all` (null = carregou). */
  const [ownersError, setOwnersError] = useState<string | null>(null);
  const [bases, setBases] = useState<BaseResponse[]>([]);
  /** Falha ao carregar `GET /rest/operational-catalog/bases/all` (null = carregou). */
  const [basesError, setBasesError] = useState<string | null>(null);
  const [productChoices, setProductChoices] = useState<ProductChoice[]>([]);
  const [ownerProductsLoading, setOwnerProductsLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isRevision = mode === "revision";
  const backPath = id ? `/contratos/${id}` : "/contratos";

  // ─── Catálogos dos selects: cargas INDEPENDENTES ───────────────────────────
  // Depositantes e bases não bloqueiam um ao outro nem o formulário: uma base
  // lenta/sem permissão não impede o select de depositantes (e vice-versa).
  useEffect(() => {
    let cancelled = false;
    setOwnersError(null);
    owners
      .listOptions()
      .then((rows) => {
        if (!cancelled) setOwnersList(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setOwnersError(
          errorStatus(err) === 403
            ? "Sem permissão para listar depositantes."
            : contractErrorMessage(err, "Não foi possível carregar os depositantes."),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [owners]);

  useEffect(() => {
    let cancelled = false;
    setBasesError(null);
    reference
      .listBases()
      .then((rows) => {
        if (!cancelled) setBases(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBasesError(
          errorStatus(err) === 403
            ? "Sem permissão para listar bases."
            : contractErrorMessage(err, "Não foi possível carregar as bases."),
        );
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  // ─── Carga inicial: contrato (edição/revisão) ──────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);

    const run = async (): Promise<void> => {
      const loadedContract = mode !== "create" && id ? await contracts.get(id) : null;
      if (loadedContract && mode === "edit" && loadedContract.status !== "DRAFT") {
        throw new Error("Só contratos em rascunho podem ser editados.");
      }
      if (cancelled) return;

      if (loadedContract) {
        setContract(loadedContract);
        setForm(
          mode === "edit"
            ? formFromContract(loadedContract)
            : {
                ...emptyContractForm(),
                ownerId: loadedContract.ownerId,
                source: loadedContract.source,
                baseCode: loadedContract.baseCode,
                effectiveFrom: isoToDate(loadedContract.effectiveFrom),
                effectiveTo: isoToDate(loadedContract.effectiveTo),
                revision: revisionFormFromContract(loadedContract),
              },
        );
      }
    };

    run()
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(contractErrorMessage(err, "Não foi possível carregar o contrato."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id, contracts]);

  // ─── Produtos disponíveis para os itens ────────────────────────────────────
  // Com depositante: produtos habilitados para ele (OwnerProduct). Sem
  // depositante (campo opcional por enquanto): catálogo completo de produtos.
  useEffect(() => {
    let cancelled = false;
    setOwnerProductsLoading(true);
    const request: Promise<ProductChoice[]> = form.ownerId
      ? owners.listProducts(form.ownerId).then((rows) =>
          rows.map((op) => ({
            productId: op.product.id,
            name: op.product.name,
            sapCode: op.product.sapCode,
            customerProductCode: op.customerProductCode,
            customerProductDescription: op.customerProductDescription,
          })),
        )
      : reference
          .listProducts()
          .then((rows) => rows.map((p) => ({ productId: p.id, name: p.name, sapCode: p.sapCode })));
    request
      .then((rows) => {
        if (!cancelled) setProductChoices(rows);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setProductChoices([]);
        toast.error(contractErrorMessage(err, "Não foi possível carregar os produtos."));
      })
      .finally(() => {
        if (!cancelled) setOwnerProductsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.ownerId, owners, reference]);

  // ─── Edição de campos ──────────────────────────────────────────────────────
  const setField = <K extends keyof ContractForm>(k: K, v: ContractForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const { [k as string]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  };

  const changeOwner = (ownerId: string) => {
    setForm((f) => ({
      ...f,
      ownerId,
      // Os produtos dos itens dependem do depositante.
      revision: { ...f.revision, items: [] },
    }));
    setErrors((e) => {
      const { ownerId: _o, ...rest } = e;
      void _o;
      return rest;
    });
  };

  const changeBase = (key: string) => {
    const [source = "", baseCode = ""] = key.split("|");
    setForm((f) => ({
      ...f,
      source,
      baseCode,
      // Pool e tanques dependem da base.
      revision: {
        ...f.revision,
        items: f.revision.items.map((i) => ({ ...i, poolId: "", allowedTankCodes: [] })),
      },
    }));
    setErrors((e) => {
      const { base: _b, ...rest } = e;
      void _b;
      return rest;
    });
  };

  // ─── Envio ─────────────────────────────────────────────────────────────────
  const submit = async () => {
    const e = validateContractForm(form, {
      mode: isRevision ? "revision" : "contract",
      contractFrom: isRevision ? isoToDate(contract?.effectiveFrom) : undefined,
      contractTo: isRevision ? isoToDate(contract?.effectiveTo) || undefined : undefined,
      existingRevisions: isRevision ? contract?.revisions : undefined,
    });
    setErrors(e);
    setSubmitError(null);
    if (Object.keys(e).length > 0) {
      toast.error("Corrija os campos destacados.");
      return;
    }

    setSaving(true);
    try {
      let saved: ContractResponse;
      if (mode === "create") {
        saved = await contracts.create(buildContractRequest(form));
        toast.success("Contrato criado em rascunho.");
      } else if (mode === "edit" && id) {
        saved = await contracts.update(id, buildContractRequest(form));
        toast.success("Rascunho atualizado.");
      } else if (id) {
        saved = await contracts.createRevision(id, {
          ...buildRevisionInput(form.revision),
          justification: form.revision.justification.trim(),
        });
        toast.success("Nova revisão criada.");
      } else {
        return;
      }
      navigate(`/contratos/${saved?.id ?? id ?? ""}`.replace(/\/$/, ""));
    } catch (err) {
      const status = errorStatus(err);
      const msg = contractErrorMessage(err, "Não foi possível salvar o contrato.");
      if (status === 409 && /identity/i.test(err instanceof Error ? err.message : "")) {
        setErrors((x) => ({
          ...x,
          internalCode: "Já existe um contrato com este código ou número.",
          contractNumber: "Já existe um contrato com este código ou número.",
        }));
      }
      setSubmitError(msg);
      toast.error(msg);
      if (isStaleStateError(err) && id) navigate(`/contratos/${id}`);
    } finally {
      setSaving(false);
    }
  };

  const pageStyle: CSSProperties = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  if (loading) {
    return (
      <div style={pageStyle} aria-busy="true">
        <PageTitleCard title={TITLE[mode]} subtitle="Carregando…" />
        <Skeleton.Table rows={5} columns={3} showHeader />
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={pageStyle}>
        <PageTitleCard title={TITLE[mode]} subtitle="Não foi possível abrir o formulário" />
        <div role="alert" style={{ ...section, alignItems: "center" }}>
          <span>{loadError}</span>
          <Button variant="outlined" onClick={() => navigate(backPath)}>
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  const ownerLabel = (oid: string): string => {
    const o = ownersList.find((x) => x.id === oid);
    return o ? `${o.internalCode} - ${o.legalName}` : contract?.owner?.legalName ?? (oid ? "Depositante atual" : "Selecione");
  };
  const baseKey = form.source && form.baseCode ? `${form.source}|${form.baseCode}` : "";
  const baseLabel = (k: string): string => {
    const b = bases.find((x) => `${x.source}|${x.baseCode}` === k);
    return b ? `${b.baseCode} — ${b.name}` : k ? k.split("|")[1] ?? k : "Selecione";
  };
  const ownerIds = ownersList.map((o) => o.id);
  if (form.ownerId && !ownerIds.includes(form.ownerId)) ownerIds.push(form.ownerId);
  const baseKeys = bases.map((b) => `${b.source}|${b.baseCode}`);
  if (baseKey && !baseKeys.includes(baseKey)) baseKeys.push(baseKey);

  return (
    <div style={pageStyle}>
      <PageTitleCard
        title={TITLE[mode]}
        subtitle={
          isRevision
            ? `Contrato ${contract?.contractNumber ?? ""} — a revisão nasce aprovada e passa a valer na data de início`
            : "Preencha os dados gerais e os itens da revisão. O rascunho é substituído por completo a cada salvamento."
        }
      />

      {!isRevision && (
        <div style={section}>
          <strong style={{ color: "#0D265E" }}>Dados gerais</strong>
          <div style={grid}>
            <label style={label}>
              Código interno *
              <Input
                size="sm"
                value={form.internalCode}
                onChange={(e) => setField("internalCode", e.target.value)}
                error={!!errors.internalCode}
                disabled={saving}
              />
              {errors.internalCode && <span style={errorText}>{errors.internalCode}</span>}
            </label>
            <label style={label}>
              Número do contrato *
              <Input
                size="sm"
                value={form.contractNumber}
                onChange={(e) => setField("contractNumber", e.target.value)}
                error={!!errors.contractNumber}
                disabled={saving}
              />
              {errors.contractNumber && <span style={errorText}>{errors.contractNumber}</span>}
            </label>
            <div style={label}>
              Depositante (Owner)
              <Select<string>
                size="sm"
                value={form.ownerId}
                options={ownerIds.map((option) => ({ option }))}
                getOptionItemLabel={ownerLabel}
                getSelectedOptionLabel={ownerLabel}
                getOptionKey={(v) => v || "__none"}
                placeholder="Selecione"
                onChange={changeOwner}
                disabled={saving}
              />
              {errors.ownerId && <span style={errorText}>{errors.ownerId}</span>}
              {ownersError ? (
                <span style={errorText}>{ownersError}</span>
              ) : (
                ownersList.length === 0 && (
                  <span style={hint}>Nenhum depositante disponível.</span>
                )
              )}
            </div>
            <div style={label}>
              Base
              <Select<string>
                size="sm"
                value={baseKey}
                options={baseKeys.map((option) => ({ option }))}
                getOptionItemLabel={baseLabel}
                getSelectedOptionLabel={baseLabel}
                getOptionKey={(v) => v || "__none"}
                placeholder="Selecione"
                onChange={changeBase}
                disabled={saving}
              />
              {errors.base && <span style={errorText}>{errors.base}</span>}
              {basesError ? (
                <span style={errorText}>{basesError}</span>
              ) : (
                bases.length === 0 && <span style={hint}>Nenhuma base disponível.</span>
              )}
            </div>
            <div style={label}>
              Início da vigência *
              <DateField
                ariaLabel="Início da vigência"
                value={form.effectiveFrom}
                onChange={(v) => setField("effectiveFrom", v)}
                error={!!errors.effectiveFrom}
                disabled={saving}
              />
              {errors.effectiveFrom && <span style={errorText}>{errors.effectiveFrom}</span>}
            </div>
            <div style={label}>
              Fim da vigência (vazio = indeterminado)
              <DateField
                ariaLabel="Fim da vigência"
                value={form.effectiveTo}
                onChange={(v) => setField("effectiveTo", v)}
                error={!!errors.effectiveTo}
                disabled={saving}
                min={form.effectiveFrom || undefined}
                align="end"
              />
              {errors.effectiveTo && <span style={errorText}>{errors.effectiveTo}</span>}
            </div>
          </div>
        </div>
      )}

      <div style={section}>
        <strong style={{ color: "#0D265E" }}>{isRevision ? "Revisão" : "Revisão inicial"}</strong>
        {ownerProductsLoading && <span style={hint}>Carregando produtos…</span>}
        <RevisionEditor
          value={form.revision}
          onChange={(revision) => {
            setForm((f) => ({ ...f, revision }));
            setErrors({});
          }}
          errors={errors}
          source={form.source}
          baseCode={form.baseCode}
          productChoices={productChoices}
          reference={reference}
          requireJustification={isRevision}
          disabled={saving}
        />
      </div>

      {submitError && (
        <span role="alert" style={{ ...errorText, fontWeight: 600 }}>
          {submitError}
        </span>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
        <Button variant="outlined" onClick={() => navigate(backPath)} disabled={saving}>
          Cancelar
        </Button>
        <Button variant="contained" onClick={submit} loading={saving} disabled={saving}>
          {mode === "create" ? "Criar rascunho" : mode === "edit" ? "Salvar rascunho" : "Criar revisão"}
        </Button>
      </div>
    </div>
  );
};

export default ContractFormPage;
