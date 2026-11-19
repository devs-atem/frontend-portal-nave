import { useEffect, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Icon,
  Input,
  PageTitleCard,
  Select,
  type IconName,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { BREAKPOINTS, useMediaQuery } from "@shared/hooks/useMediaQuery";
import { DateField } from "@shared/components/DateField";
import { FileField } from "@shared/components/FileField";
import { ContractFormSkeleton } from "../components/ContractFormSkeleton";
import { SaveDraftModal } from "../components/SaveDraftModal";
import { RevisionEditor, type ProductChoice } from "../components/RevisionEditor";
import type { BaseResponse, ContractResponse, NextIdentifiers } from "../services/contract";
import { validateAttachmentFile } from "../services/FilesService";
import { attachmentFailedMessage, submitContractForm } from "../services/submitContractForm";
import { contractErrorMessage, errorStatus, isStaleStateError } from "../services/contractErrors";
import {
  dateToIso,
  draftRevisionOf,
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
const errorText: CSSProperties = {
  color: "#B42F2F",
  fontWeight: 400,
  fontSize: 12,
};
const section: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EE",
  borderRadius: 12,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};

const SectionTitle = ({
  icon,
  children,
  subtitle,
}: {
  icon: IconName;
  children: string;
  subtitle?: string;
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#0D265E" }}>
    <span
      style={{
        display: "inline-flex",
        flex: "none",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 10,
        background: "color-mix(in srgb, var(--atem-color-action-primary, #0d265e) 10%, #ffffff)",
        color: "var(--atem-color-action-primary, #0d265e)",
      }}
    >
      <Icon name={icon} size="md" aria-hidden />
    </span>
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <strong>{children}</strong>
      {subtitle && <span style={{ ...hint, fontSize: 13 }}>{subtitle}</span>}
    </div>
  </div>
);

const TITLE: Record<ContractFormMode, string> = {
  create: "Novo contrato",
  edit: "Editar rascunho",
  revision: "Nova revisão",
};

export const ContractFormPage = ({ mode }: { mode: ContractFormMode }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const contracts = useIoC("contracts");
  const reference = useIoC("contractsReference");
  const files = useIoC("contractsFiles");

  const [form, setForm] = useState<ContractForm>(emptyContractForm());
  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  /** Número e código interno sugeridos pelo backend (só na criação). */
  const [identifiers, setIdentifiers] = useState<NextIdentifiers | null>(null);
  const [identifiersError, setIdentifiersError] = useState<string | null>(null);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [bases, setBases] = useState<BaseResponse[]>([]);
  /** Falha ao carregar `GET /rest/operational-catalog/bases/all` (null = carregou). */
  const [basesError, setBasesError] = useState<string | null>(null);
  const [productChoices, setProductChoices] = useState<ProductChoice[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [ownerProductsLoading, setOwnerProductsLoading] = useState(true);
  const [basesLoading, setBasesLoading] = useState(true);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isRevision = mode === "revision";
  const stacked = useMediaQuery(BREAKPOINTS.tablet);
  const backPath = id ? `/contratos/${id}` : "/contratos";

  // ─── Identificadores sugeridos (somente na criação) ─────────────────────────
  // O backend gera o número definitivo ao salvar; aqui é só exibição.
  useEffect(() => {
    if (mode !== "create") return;
    let cancelled = false;
    setIdentifiers(null);
    setIdentifiersError(null);
    contracts
      .nextIdentifiers()
      .then((v) => {
        if (!cancelled) setIdentifiers(v);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setIdentifiersError(
            contractErrorMessage(err, "Não foi possível obter o número do contrato."),
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [mode, contracts]);

  // ─── Catálogo de bases ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    setBasesError(null);
    setBasesLoading(true);
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
      })
      .finally(() => {
        if (!cancelled) setBasesLoading(false);
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
        if (!cancelled)
          setLoadError(contractErrorMessage(err, "Não foi possível carregar o contrato."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, id, contracts]);

  // ─── Produtos disponíveis para os itens ────────────────────────────────────
  // Sem depositante no formulário: catálogo completo de produtos.
  useEffect(() => {
    let cancelled = false;
    setOwnerProductsLoading(true);
    reference
      .listProducts()
      .then((rows) => {
        if (!cancelled) {
          setProductChoices(
            rows.map((p) => ({
              productId: p.id,
              name: p.name,
              sapCode: p.sapCode,
            })),
          );
        }
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
  }, [reference]);

  // ─── Edição de campos ──────────────────────────────────────────────────────
  const setField = <K extends keyof ContractForm>(k: K, v: ContractForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const { [k as string]: _removed, ...rest } = e;
      void _removed;
      return rest;
    });
  };

  const changeBase = (key: string) => {
    const [source = "", baseCode = ""] = key.split("|");
    setForm((f) => ({ ...f, source, baseCode }));
    setErrors((e) => {
      const { base: _b, ...rest } = e;
      void _b;
      return rest;
    });
  };

  // ─── Envio ─────────────────────────────────────────────────────────────────
  const onPickFile = (file: File | null) => {
    setAttachment(file);
    setAttachmentError(file ? validateAttachmentFile(file) : null);
  };

  const requestSave = () => {
    if (mode === "create" && !identifiers) {
      setSubmitError(identifiersError ?? "Aguarde o carregamento do número do contrato.");
      return;
    }
    if (attachment) {
      const fileError = validateAttachmentFile(attachment);
      if (fileError) {
        setAttachmentError(fileError);
        return;
      }
    }
    const e = validateContractForm(form, {
      mode: isRevision ? "revision" : "contract",
      contractFrom: isRevision ? isoToDate(contract?.effectiveFrom) : undefined,
      contractTo: isRevision ? isoToDate(contract?.effectiveTo) || undefined : undefined,
      existingRevisions: isRevision ? contract?.revisions : undefined,
      hadDraftItems:
        mode === "edit" && !!contract && (draftRevisionOf(contract)?.items.length ?? 0) > 0,
    });
    setErrors(e);
    setSubmitError(null);
    if (Object.keys(e).length > 0) {
      toast.error("Corrija os campos destacados.");
      return;
    }

    // Rascunhos pedem confirmação; a nova revisão (já aprovada) segue direto.
    if (isRevision) void save();
    else setConfirmOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const result = await submitContractForm(
        { mode, id, form, attachment },
        { contracts, files, onIdentifiers: setIdentifiers },
      );
      if (!result) return;
      if (mode === "create")
        toast.success(`Contrato ${result.contract.contractNumber} criado em rascunho.`);
      else if (mode === "edit") toast.success("Rascunho atualizado.");
      else toast.success("Nova revisão criada.");
      if (result.attachmentFailed) toast.warning(attachmentFailedMessage(mode));
      navigate(`/contratos/${result.contractId}`.replace(/\/$/, ""));
    } catch (err) {
      const msg = contractErrorMessage(err, "Não foi possível salvar o contrato.");
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

  // Esqueleto até o contrato (edição/revisão), os identificadores (criação), as bases e
  // os produtos terminarem de carregar.
  const identifiersPending = mode === "create" && !identifiers && !identifiersError;
  if (loading || basesLoading || ownerProductsLoading || identifiersPending) {
    return (
      <div style={pageStyle}>
        <ContractFormSkeleton mode={mode} />
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

  const baseKey = form.source && form.baseCode ? `${form.source}|${form.baseCode}` : "";
  const baseLabel = (k: string): string => {
    const b = bases.find((x) => `${x.source}|${x.baseCode}` === k);
    return b ? `${b.baseCode} — ${b.name}` : k ? (k.split("|")[1] ?? k) : "Selecione";
  };
  const baseKeys = bases.map((b) => `${b.source}|${b.baseCode}`);
  if (baseKey && !baseKeys.includes(baseKey)) baseKeys.push(baseKey);

  return (
    <div style={pageStyle}>
      <PageTitleCard
        variant="flat"
        title={TITLE[mode]}
        subtitle={
          isRevision
            ? `Contrato ${contract?.contractNumber ?? ""} — a revisão nasce aprovada e passa a valer na data de início`
            : mode === "create"
              ? "Preencha os dados gerais e os itens. A vigência dos itens acompanha a do contrato."
              : "Preencha os dados gerais e os itens da revisão. O rascunho é substituído por completo a cada salvamento."
        }
      />

      {!isRevision && (
        <div style={section}>
          <SectionTitle
            icon="FileText"
            subtitle="Informe a base e a vigência do contrato e, se quiser, anexe o documento."
          >
            Dados gerais
          </SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: stacked ? "1fr" : "minmax(0, 3fr) minmax(0, 2fr)",
              gap: 20,
              alignItems: "stretch",
            }}
          >
            {/* Linha 1: código interno, número e base. Linha 2: início e fim da vigência. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: stacked
                  ? "repeat(auto-fit, minmax(min(100%, 220px), 1fr))"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 14,
                alignContent: "start",
                minWidth: 0,
              }}
            >
              <label style={label}>
                Código interno
                <Input
                  size="sm"
                  value={
                    mode === "create"
                      ? (identifiers?.internalCode ?? "")
                      : (contract?.internalCode ?? "")
                  }
                  placeholder={mode === "create" && !identifiersError ? "Carregando…" : undefined}
                  disabled
                  readOnly
                />
                <span style={hint}>
                  Gerado pelo sistema; será atualizado pela integração com o SAP.
                </span>
              </label>
              <label style={label}>
                Número do contrato
                <Input
                  size="sm"
                  value={
                    mode === "create"
                      ? (identifiers?.contractNumber ?? "")
                      : (contract?.contractNumber ?? "")
                  }
                  placeholder={mode === "create" && !identifiersError ? "Carregando…" : undefined}
                  disabled
                  readOnly
                />
                {identifiersError && <span style={errorText}>{identifiersError}</span>}
              </label>
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
            {/* Coluna de anexo separada por divisória vertical (horizontal quando empilhada). */}
            <div
              style={{
                ...label,
                minWidth: 0,
                alignContent: "start",
                ...(stacked
                  ? { borderTop: "1px solid #E2E6EE", paddingTop: 14 }
                  : { borderLeft: "1px solid #E2E6EE", paddingLeft: 20 }),
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="Paperclip" size="sm" aria-hidden />
                Anexo do contrato (opcional)
              </span>
              <FileField
                ariaLabel="Anexo do contrato"
                accept=".pdf,.doc,.docx,.jpg,.jpeg"
                hint="PDF, DOC, DOCX ou JPG  •  Até 20 MB"
                value={attachment}
                onChange={onPickFile}
                error={!!attachmentError}
                disabled={saving}
              />
              {attachmentError && <span style={errorText}>{attachmentError}</span>}
            </div>
          </div>
        </div>
      )}

      <div style={section}>
        {isRevision && <SectionTitle icon="ClipboardList">Revisão</SectionTitle>}
        <RevisionEditor
          value={form.revision}
          onChange={(revision) => {
            setForm((f) => ({ ...f, revision }));
            setErrors({});
          }}
          errors={errors}
          productChoices={productChoices}
          requireJustification={isRevision}
          itemsOnly={!isRevision}
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
        <Button
          variant="contained"
          onClick={requestSave}
          loading={saving}
          disabled={saving || (mode === "create" && !identifiers)}
        >
          {mode === "create"
            ? "Criar rascunho"
            : mode === "edit"
              ? "Salvar rascunho"
              : "Criar revisão"}
        </Button>
      </div>

      {confirmOpen && !isRevision && (
        <SaveDraftModal
          mode={mode}
          internalCode={
            (mode === "create" ? identifiers?.internalCode : contract?.internalCode) ?? ""
          }
          contractNumber={
            (mode === "create" ? identifiers?.contractNumber : contract?.contractNumber) ?? ""
          }
          baseText={baseKey ? baseLabel(baseKey) : ""}
          effectiveFrom={dateToIso(form.effectiveFrom)}
          effectiveTo={form.effectiveTo ? dateToIso(form.effectiveTo, true) : undefined}
          attachment={attachment}
          items={form.revision.items
            .filter((i) => i.included)
            .map((item) => ({
              item,
              name:
                productChoices.find((p) => p.productId === item.productId)?.name ??
                item.productCode,
            }))}
          saving={saving}
          error={submitError}
          onConfirm={() => void save()}
          onClose={() => setConfirmOpen(false)}
        />
      )}
    </div>
  );
};

export default ContractFormPage;
