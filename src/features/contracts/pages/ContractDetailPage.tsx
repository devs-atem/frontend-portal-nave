import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  CustomTabs,
  PageTitleCard,
  Skeleton,
  Table,
  type TableColumn,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import type { ClientRecord } from "@features/client-registration/services/ClientRegistrationService";
import { ActionModal } from "../components/ActionModal";
import { ContractStatusTag } from "../components/ContractStatusTag";
import { OwnerProductsPanel } from "../components/OwnerProductsPanel";
import { useContractPermissions } from "../permissions";
import {
  CONTRACT_ACTION_LABEL,
  type ContractAction,
  type ContractActionRequest,
  type ContractItemResponse,
  type ContractResponse,
  type OwnerResponse,
  type RevisionResponse,
} from "../services/contract";
import { contractErrorMessage, errorStatus, isStaleStateError } from "../services/contractErrors";
import {
  allowedActions,
  clientOwnsCnpj,
  formatDate,
  formatQty,
} from "../services/contractRules";

type Tab = "summary" | "revisions" | "owner";

const section: CSSProperties = {
  background: "#FFFFFF",
  border: "1px solid #E2E6EE",
  borderRadius: 12,
  padding: "18px 20px",
  display: "flex",
  flexDirection: "column",
  gap: 14,
};
const hint: CSSProperties = { fontSize: 12, color: "#5B6475" };
const dt: CSSProperties = { fontSize: 11, fontWeight: 600, color: "#5B6475", textTransform: "uppercase" };
const dd: CSSProperties = { margin: 0, fontSize: 14, color: "#1F2937" };

const Field = ({ title, children }: { title: string; children: ReactNode }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
    <span style={dt}>{title}</span>
    <span style={dd}>{children}</span>
  </div>
);

const buildItemColumns = (
  poolLabel: (id: string) => string,
  productName: (id: string) => string | undefined,
): TableColumn<ContractItemResponse>[] => [
  {
    id: "product",
    label: "Produto",
    accessor: (i) => productName(i.productId) ?? i.productCode,
    render: (_v, i) => (
      <span>
        {productName(i.productId) ?? i.productCode}
        <span style={hint}> ({i.productCode})</span>
        {i.customerProductDescription ? ` — ${i.customerProductDescription}` : ""}
      </span>
    ),
  },
  { id: "pool", label: "Pool", accessor: (i) => poolLabel(i.poolId) },
  { id: "measure", label: "Medida", accessor: (i) => i.accountingMeasure },
  { id: "reserved", label: "Cap. reservada", align: "right", accessor: (i) => formatQty(i.reservedCapacity) },
  { id: "max", label: "Cap. máxima", align: "right", accessor: (i) => formatQty(i.maximumCapacity) },
  { id: "minq", label: "Cota mín.", align: "right", accessor: (i) => formatQty(i.minimumQuota) },
  { id: "maxq", label: "Cota máx.", align: "right", accessor: (i) => formatQty(i.maximumQuota) },
  { id: "types", label: "Movimentos", accessor: (i) => i.allowedMovementTypeCodes.join(", ") },
  {
    id: "tanks",
    label: "Tanques",
    accessor: (i) => (i.allowedTankCodes?.length ? i.allowedTankCodes.join(", ") : "Todos"),
  },
];

const RevisionBlock = ({
  rev,
  current,
  columns,
}: {
  rev: RevisionResponse;
  current: boolean;
  columns: TableColumn<ContractItemResponse>[];
}) => (
  <div style={section}>
    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <strong style={{ color: "#0D265E" }}>Revisão {rev.revisionNumber}</strong>
      <span style={hint}>
        {rev.approvedAt ? `Aprovada em ${formatDate(rev.approvedAt)}` : "Rascunho"}
        {current ? " · vigente" : ""}
      </span>
    </div>
    <span style={dd}>
      Vigência: {formatDate(rev.effectiveFrom)} → {formatDate(rev.effectiveUntil, "Indeterminada")}
    </span>
    {rev.justification && <span style={hint}>Justificativa: {rev.justification}</span>}
    <Table<ContractItemResponse>
      columns={columns}
      data={rev.items ?? []}
      title="Itens"
      emptyMessage="Revisão sem itens"
    />
  </div>
);

export const ContractDetailPage = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const contracts = useIoC("contracts");
  const owners = useIoC("owners");
  const clientsSvc = useIoC("clientRegistration");
  const reference = useIoC("contractsReference");
  const perms = useContractPermissions();

  const [contract, setContract] = useState<ContractResponse | null>(null);
  const [owner, setOwner] = useState<OwnerResponse | null>(null);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [poolNames, setPoolNames] = useState<Map<string, string>>(new Map());
  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("summary");
  const [action, setAction] = useState<ContractAction | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const reload = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    contracts
      .get(id)
      .then((c) => {
        if (!cancelled) setContract(c);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setContract(null);
        setError(
          errorStatus(err) === 404
            ? "Contrato não encontrado ou fora do seu escopo."
            : contractErrorMessage(err, "Não foi possível carregar o contrato."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contracts, id, reloadToken]);

  // Depositante completo e clientes (best effort: sem acesso, a tela segue com o embutido).
  const ownerId = contract?.ownerId;
  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    void Promise.allSettled([owners.get(ownerId), clientsSvc.list()]).then(([o, c]) => {
      if (cancelled) return;
      setOwner(o.status === "fulfilled" ? o.value : null);
      setClients(c.status === "fulfilled" ? c.value : []);
    });
    return () => {
      cancelled = true;
    };
  }, [owners, clientsSvc, ownerId]);

  // Nomes de pool e produto (best effort). O contrato devolve só `poolId`; sem
  // `app:custody:pool:read` (403) cai no início do id.
  const poolSource = contract?.source;
  const poolBase = contract?.baseCode;
  useEffect(() => {
    if (!poolSource || !poolBase) return;
    let cancelled = false;
    void Promise.allSettled([
      reference.listPoolsByBase({ source: poolSource, baseCode: poolBase }),
      reference.listProducts(),
    ]).then(([pools, products]) => {
      if (cancelled) return;
      setPoolNames(
        new Map(
          pools.status === "fulfilled" ? pools.value.map((p) => [p.id, `${p.code} — ${p.name}`]) : [],
        ),
      );
      setProductNames(
        new Map(
          products.status === "fulfilled" ? products.value.map((p) => [p.id, p.name]) : [],
        ),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [reference, poolSource, poolBase]);

  const pageStyle: CSSProperties = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  if (loading && !contract) {
    return (
      <div style={pageStyle} aria-busy="true">
        <PageTitleCard title="Contrato" subtitle="Carregando…" />
        <Skeleton.Table rows={5} columns={3} showHeader />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div style={pageStyle}>
        <PageTitleCard title="Contrato" subtitle="Detalhe do contrato" />
        <div role="alert" style={{ ...section, alignItems: "center" }}>
          <span>{error ?? "Contrato não encontrado."}</span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="outlined" onClick={() => navigate("/contratos")}>
              Voltar à lista
            </Button>
            <Button variant="contained" onClick={reload}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const available = allowedActions(contract.status, perms);
  const ownerView = owner ?? contract.owner;
  const client = clients.find((c) => clientOwnsCnpj(c, ownerView?.cnpj));
  const revisions = contract.revisions ?? (contract.currentRevision ? [contract.currentRevision] : []);
  const itemColumns = buildItemColumns(
    (pid) => poolNames.get(pid) ?? `${pid.slice(0, 8)}…`,
    (prodId) => productNames.get(prodId),
  );

  const confirmAction = async (body: ContractActionRequest): Promise<void> => {
    if (!action) return;
    try {
      await contracts.act(contract.id, action, body);
    } catch (err) {
      if (isStaleStateError(err)) reload();
      throw err;
    }
    toast.success(`${CONTRACT_ACTION_LABEL[action]}: concluído.`);
    setAction(null);
    reload();
  };

  return (
    <div style={pageStyle}>
      <PageTitleCard
        title={`Contrato ${contract.contractNumber}`}
        subtitle={`Código interno ${contract.internalCode}`}
        actions={
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button variant="outlined" onClick={() => navigate("/contratos")}>
              Voltar
            </Button>
            {available.edit && (
              <Button variant="outlined" onClick={() => navigate(`/contratos/${contract.id}/editar`)}>
                Editar
              </Button>
            )}
            {available.newRevision && (
              <Button variant="outlined" onClick={() => navigate(`/contratos/${contract.id}/nova-revisao`)}>
                Nova revisão
              </Button>
            )}
            {available.actions.map((a) => (
              <Button
                key={a}
                variant={a === "approve" || a === "submit" ? "contained" : "outlined"}
                color={a === "cancel" ? "error" : undefined}
                onClick={() => setAction(a)}
              >
                {CONTRACT_ACTION_LABEL[a]}
              </Button>
            ))}
          </div>
        }
      />

      <CustomTabs
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        aria-label="Seções do contrato"
      >
        <CustomTabs.List aria-label="Alternar seção do contrato">
          <CustomTabs.Tab value="summary">Resumo</CustomTabs.Tab>
          <CustomTabs.Tab value="revisions">Revisões ({revisions.length})</CustomTabs.Tab>
          <CustomTabs.Tab value="owner">Depositante</CustomTabs.Tab>
        </CustomTabs.List>
      </CustomTabs>

      {tab === "summary" && (
        <div style={section}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))",
              gap: 16,
            }}
          >
            <Field title="Status">
              <ContractStatusTag status={contract.status} />
            </Field>
            <Field title="Depositante">{ownerView?.legalName ?? contract.ownerId}</Field>
            <Field title="Cliente (por CNPJ)">{client?.name ?? "—"}</Field>
            <Field title="Base">
              {contract.baseCode} <span style={hint}>({contract.source})</span>
            </Field>
            <Field title="Vigência">
              {formatDate(contract.effectiveFrom)} → {formatDate(contract.effectiveTo, "Indeterminada")}
            </Field>
            <Field title="Revisão vigente">
              {contract.currentRevision ? `Revisão ${contract.currentRevision.revisionNumber}` : "Nenhuma aprovada"}
            </Field>
          </div>
          {contract.status === "ACTIVE" || contract.status === "SUSPENDED" ? (
            <span style={hint}>
              Uma nova revisão nasce aprovada, mas só passa a valer na data de início, aplicada
              pelo job de ciclo de vida.
            </span>
          ) : null}
        </div>
      )}

      {tab === "revisions" &&
        (revisions.length === 0 ? (
          <div style={section}>
            <span style={hint}>Nenhuma revisão.</span>
          </div>
        ) : (
          revisions.map((r) => (
            <RevisionBlock
              key={r.id}
              rev={r}
              current={r.id === contract.currentRevisionId}
              columns={itemColumns}
            />
          ))
        ))}

      {tab === "owner" && (
        <div style={section}>
          <strong style={{ color: "#0D265E" }}>{ownerView?.legalName ?? "Depositante"}</strong>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,220px),1fr))",
              gap: 16,
            }}
          >
            <Field title="CNPJ">{ownerView?.cnpj ?? "—"}</Field>
            <Field title="Código interno">{ownerView?.internalCode ?? "—"}</Field>
            <Field title="Nome fantasia">{ownerView?.tradeName ?? "—"}</Field>
            <Field title="Situação">{ownerView?.status ?? "—"}</Field>
          </div>
          <OwnerProductsPanel ownerId={contract.ownerId} canWrite={perms.write} />
        </div>
      )}

      {action && (
        <ActionModal action={action} onClose={() => setAction(null)} onConfirm={confirmAction} />
      )}
    </div>
  );
};

export default ContractDetailPage;
