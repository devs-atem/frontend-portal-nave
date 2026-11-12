import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Button,
  Input,
  PageTitleCard,
  Pagination,
  Select,
  Skeleton,
  Table,
  type TableColumn,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import type { ClientRecord } from "@features/client-registration/services/ClientRegistrationService";
import { ContractStatusTag } from "../components/ContractStatusTag";
import { useContractPermissions } from "../permissions";
import {
  CONTRACT_STATUSES,
  CONTRACT_STATUS_LABEL,
  type BaseResponse,
  type ContractListQuery,
  type ContractResponse,
  type ContractStatus,
  type OwnerOption,
} from "../services/contract";
import { contractErrorMessage } from "../services/contractErrors";
import { clientCnpjs, clientOwnsCnpj, formatDate } from "../services/contractRules";

const PAGE_SIZE = 10;

interface Filters {
  status: ContractStatus | "";
  baseKey: string; // `${source}|${baseCode}` ou ""
  ownerId: string;
  clientId: string;
  internalCode: string;
  contractNumber: string;
}

const EMPTY: Filters = {
  status: "",
  baseKey: "",
  ownerId: "",
  clientId: "",
  internalCode: "",
  contractNumber: "",
};

const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#3D4556",
  display: "flex",
  flexDirection: "column",
  gap: 5,
  flex: "1 1 180px",
  minWidth: 160,
};

const hint: CSSProperties = { fontSize: 12, color: "#5B6475" };

/** Select genérico de filtro com opção "todos" (valor vazio). */
const FilterSelect = ({
  title,
  value,
  options,
  allLabel,
  onChange,
}: {
  title: string;
  value: string;
  options: { value: string; label: string }[];
  allLabel: string;
  onChange: (v: string) => void;
}) => {
  const all = [{ value: "", label: allLabel }, ...options];
  const labelOf = (v: string): string => all.find((o) => o.value === v)?.label ?? allLabel;
  return (
    <div style={label}>
      {title}
      <Select<string>
        size="sm"
        value={value}
        options={all.map((o) => ({ option: o.value }))}
        getOptionItemLabel={labelOf}
        getSelectedOptionLabel={labelOf}
        getOptionKey={(v) => v || "__all"}
        onChange={onChange}
      />
    </div>
  );
};

export const ContractsPage = () => {
  const contracts = useIoC("contracts");
  const owners = useIoC("owners");
  const reference = useIoC("contractsReference");
  const clientsSvc = useIoC("clientRegistration");
  const perms = useContractPermissions();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // ─── Dados de apoio (tolerantes a falha: sem acesso, a tela segue funcionando) ───
  const [ownersList, setOwnersList] = useState<OwnerOption[]>([]);
  const [bases, setBases] = useState<BaseResponse[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([
      owners.listOptions(),
      reference.listBases(),
      clientsSvc.list(),
    ]).then(([o, b, c]) => {
      if (cancelled) return;
      if (o.status === "fulfilled") setOwnersList(o.value);
      if (b.status === "fulfilled") setBases(b.value);
      if (c.status === "fulfilled") setClients(c.value);
    });
    return () => {
      cancelled = true;
    };
  }, [owners, reference, clientsSvc]);

  const ownerById = useMemo(() => new Map(ownersList.map((o) => [o.id, o])), [ownersList]);

  // ─── Filtros: rascunho (digitação) × aplicado (consulta) ──────────────────
  const initial: Filters = { ...EMPTY, clientId: params.get("clientId") ?? "" };
  const [draft, setDraft] = useState<Filters>(initial);
  const [applied, setApplied] = useState<Filters>(initial);
  const [page, setPage] = useState(1);

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) =>
    setDraft((f) => ({ ...f, [k]: v }));

  const apply = () => {
    setApplied(draft);
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setPage(1);
  };

  // ─── Consulta ──────────────────────────────────────────────────────────────
  const [rows, setRows] = useState<ContractResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  /** Cliente filtrado sem nenhum depositante com o CNPJ dele. */
  const [noOwnerForClient, setNoOwnerForClient] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  const clientsReady = clients.length > 0 || !applied.clientId;

  useEffect(() => {
    if (!clientsReady) return; // aguarda a lista de clientes para resolver o filtro
    let cancelled = false;
    setLoading(true);
    setError(false);
    setNoOwnerForClient(false);

    const [source, baseCode] = applied.baseKey ? applied.baseKey.split("|") : ["", ""];
    const base: ContractListQuery = {
      status: applied.status || undefined,
      source: source || undefined,
      baseCode: baseCode || undefined,
      internalCode: applied.internalCode.trim() || undefined,
      contractNumber: applied.contractNumber.trim() || undefined,
    };

    const run = async (): Promise<void> => {
      const client = applied.clientId
        ? clients.find((c) => c.id === applied.clientId)
        : undefined;

      if (!client) {
        const resp = await contracts.list({
          ...base,
          ownerId: applied.ownerId || undefined,
          page,
          limit: PAGE_SIZE,
        });
        if (cancelled) return;
        setRows(resp.rows);
        setTotal(resp.total);
        return;
      }

      // Filtro por cliente: vínculo lógico por CNPJ (matriz + filiais) do Owner.
      let clientOwners = await owners.findByCnpjs(clientCnpjs(client));
      if (applied.ownerId) clientOwners = clientOwners.filter((o) => o.id === applied.ownerId);
      if (cancelled) return;
      if (clientOwners.length === 0) {
        setNoOwnerForClient(true);
        setRows([]);
        setTotal(0);
        return;
      }
      const results = await Promise.all(
        clientOwners.map((o) => contracts.listAll({ ...base, ownerId: o.id })),
      );
      if (cancelled) return;
      const merged = results
        .flat()
        .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
      setTotal(merged.length);
      setRows(merged.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE));
    };

    run()
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(true);
        toast.error(contractErrorMessage(err, "Não foi possível carregar os contratos."));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contracts, owners, applied, page, clients, clientsReady, reloadToken]);

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  // ─── Apresentação ──────────────────────────────────────────────────────────
  const ownerName = (c: ContractResponse): string =>
    c.owner?.legalName ?? ownerById.get(c.ownerId)?.legalName ?? `${c.ownerId.slice(0, 8)}…`;

  const clientName = (c: ContractResponse): string => {
    const cnpj = c.owner?.cnpj;
    return clients.find((cl) => clientOwnsCnpj(cl, cnpj))?.name ?? "—";
  };

  const columns: TableColumn<ContractResponse>[] = [
    { id: "contractNumber", label: "Contrato", accessor: "contractNumber" },
    { id: "internalCode", label: "Código interno", accessor: "internalCode" },
    { id: "owner", label: "Depositante", accessor: (c) => ownerName(c) },
    { id: "client", label: "Cliente", accessor: (c) => clientName(c) },
    { id: "base", label: "Base", accessor: (c) => c.baseCode },
    {
      id: "status",
      label: "Status",
      accessor: (c) => CONTRACT_STATUS_LABEL[c.status] ?? c.status,
      render: (_v, c) => <ContractStatusTag status={c.status} />,
    },
    {
      id: "validity",
      label: "Vigência",
      accessor: (c) => `${formatDate(c.effectiveFrom)} → ${formatDate(c.effectiveTo, "Indeterminada")}`,
    },
  ];

  const pageStyle: CSSProperties = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
  };

  const header = (
    <PageTitleCard
      title="Contratos"
      subtitle="Contratos de custódia, revisões e itens"
      actions={
        perms.write && (
          <Button variant="contained" onClick={() => navigate("/contratos/novo")}>
            + Novo contrato
          </Button>
        )
      }
    />
  );

  const hasFilter = JSON.stringify(applied) !== JSON.stringify(EMPTY);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={pageStyle}>
      {header}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <FilterSelect
          title="Status"
          value={draft.status}
          allLabel="Todos"
          options={CONTRACT_STATUSES.map((s) => ({ value: s, label: CONTRACT_STATUS_LABEL[s] }))}
          onChange={(v) => set("status", v as ContractStatus | "")}
        />
        {bases.length > 0 && (
          <FilterSelect
            title="Base"
            value={draft.baseKey}
            allLabel="Todas"
            options={bases.map((b) => ({
              value: `${b.source}|${b.baseCode}`,
              label: `${b.baseCode} — ${b.name}`,
            }))}
            onChange={(v) => set("baseKey", v)}
          />
        )}
        {ownersList.length > 0 && (
          <FilterSelect
            title="Depositante"
            value={draft.ownerId}
            allLabel="Todos"
            options={ownersList.map((o) => ({ value: o.id, label: `${o.internalCode} - ${o.legalName}` }))}
            onChange={(v) => set("ownerId", v)}
          />
        )}
        {clients.length > 0 && (
          <FilterSelect
            title="Cliente"
            value={draft.clientId}
            allLabel="Todos"
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => set("clientId", v)}
          />
        )}
        <label style={label}>
          Código interno
          <Input
            size="sm"
            value={draft.internalCode}
            onChange={(e) => set("internalCode", e.target.value)}
            placeholder="Igual a…"
          />
        </label>
        <label style={label}>
          Nº do contrato
          <Input
            size="sm"
            value={draft.contractNumber}
            onChange={(e) => set("contractNumber", e.target.value)}
            placeholder="Igual a…"
          />
        </label>
        <Button variant="contained" size="sm" onClick={apply}>
          Filtrar
        </Button>
        {(hasFilter || JSON.stringify(draft) !== JSON.stringify(EMPTY)) && (
          <Button variant="outlined" size="sm" onClick={clear}>
            Limpar
          </Button>
        )}
      </div>

      <span style={hint}>
        Os filtros são de igualdade exata. O vínculo contrato × cliente é lógico (CNPJ do
        depositante = matriz ou filial do cliente) e você só vê contratos das suas bases e CNPJs.
      </span>

      {loading ? (
        <div aria-busy="true">
          <Skeleton.Table rows={6} columns={7} showHeader />
        </div>
      ) : error ? (
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
          <span>Não foi possível exibir os contratos.</span>
          <Button variant="contained" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <Table<ContractResponse>
            columns={columns}
            data={rows}
            title="Contratos"
            itemCount={total}
            onRowClick={(c) => navigate(`/contratos/${c.id}`)}
            emptyMessage={
              noOwnerForClient
                ? "Nenhum depositante cadastrado para o CNPJ deste cliente"
                : hasFilter
                  ? "Nenhum contrato encontrado para os filtros aplicados"
                  : "Nenhum contrato disponível. Pode não haver dados ou você pode não ter acesso às bases/CNPJs."
            }
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
};

export default ContractsPage;
