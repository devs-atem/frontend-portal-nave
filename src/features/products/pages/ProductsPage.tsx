import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  CustomTabs,
  Input,
  PageTitleCard,
  Select,
  Skeleton,
  StatusTag,
  Table,
  type TableColumn,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import type { CatalogProduct } from "../services/ProductsService";
import "./ProductsPage.css";

type View = "product" | "client";
type StatusFilter = "all" | "active" | "inactive";

/**
 * Linha unificada das tabelas expansíveis.
 * - Em "Por produto": a linha-pai é um produto e as sub-linhas são os clientes.
 * - Em "Por cliente": a linha-pai é um cliente e as sub-linhas são os produtos.
 */
interface Row {
  key: string;
  kind: "product" | "client";
  color?: string;
  title: string;
  sub: string;
  code: string;
  group: string;
  active?: boolean;
  links: number;
  children?: Row[];
}

const STATUS_OPTS: StatusFilter[] = ["all", "active", "inactive"];
const STATUS_LABEL: Record<StatusFilter, string> = {
  all: "Todos os status",
  active: "Somente ativos",
  inactive: "Somente inativos",
};

/**
 * Mapeia o grupo do produto para um "tom" de tag. Os tons são estáveis por
 * família de combustível; qualquer grupo não mapeado cai no tom neutro (azul
 * da paleta Navemazônia). As cores reais vivem no CSS (`.nm-prod__tag--*`),
 * todas derivadas da paleta do projeto.
 */
const groupTone = (group: string): string => {
  const g = group.toLowerCase();
  if (g.includes("biodiesel")) return "biodiesel";
  if (g.includes("etanol")) return "etanol";
  if (g.includes("gasolina")) return "gasolina";
  if (g.includes("diesel")) return "diesel";
  return "neutral";
};

export const ProductsPage = () => {
  const svc = useIoC("products");
  const [view, setView] = useState<View>("product");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  // Linha-pai selecionada → abre o painel lateral de detalhes.
  const [selected, setSelected] = useState<Row | null>(null);

  // Fronteira de carregamento dos dados: dispara `svc.load()` uma vez na
  // montagem e acompanha os estados de carregamento/erro. Sob o mock o load
  // resolve imediatamente, então estes estados são inertes e a página renderiza
  // como hoje.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Incrementado pelo botão "Tentar novamente" para reexecutar o efeito.
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    svc
      .load()
      .then(() => {
        if (!cancelled) setLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const normalized =
          err instanceof Error ? err : new Error("Falha ao carregar os dados.");
        setError(normalized);
        setLoading(false);
        toast.error(normalized.message);
      });
    return () => {
      cancelled = true;
    };
  }, [svc, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  /** Grupos únicos para o filtro (apenas na visão por produto). */
  const groups = useMemo(
    () => ["all", ...new Set(svc.products.map((p) => p.group))],
    [svc],
  );

  const matchesProduct = (p: CatalogProduct): boolean => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.abbreviation.toLowerCase().includes(term) ||
      p.sapCode.toLowerCase().includes(term);
    const matchesGroup = group === "all" || p.group === group;
    const matchesStatus =
      status === "all" ||
      (status === "active" && p.active) ||
      (status === "inactive" && !p.active);
    return matchesSearch && matchesGroup && matchesStatus;
  };

  const productToRow = (p: CatalogProduct): Row => ({
    key: `p-${p.id}`,
    kind: "product",
    color: p.color,
    title: p.name,
    sub: p.abbreviation,
    code: p.sapCode,
    group: p.group,
    active: p.active,
    links: svc.clientCountOfProduct(p.id),
    children: svc.clientsOfProduct(p.id).map((c) => ({
      key: `p-${p.id}-c-${c.id}`,
      kind: "client" as const,
      title: c.razao,
      sub: c.cnpj,
      code: c.codigo,
      group: "",
      links: 0,
    })),
  });

  const data = useMemo<Row[]>(() => {
    if (view === "product") {
      return svc.products.filter(matchesProduct).map(productToRow);
    }

    // Visão por cliente: filtra os produtos de cada cliente por grupo/status; a
    // busca por texto casa tanto o cliente quanto seus produtos.
    const term = search.trim().toLowerCase();
    const matchesProductNoSearch = (p: CatalogProduct): boolean => {
      const matchesGroup = group === "all" || p.group === group;
      const matchesStatus =
        status === "all" ||
        (status === "active" && p.active) ||
        (status === "inactive" && !p.active);
      return matchesGroup && matchesStatus;
    };

    return svc.clients
      .map((c) => {
        const matchesClient =
          c.razao.toLowerCase().includes(term) ||
          c.cnpj.toLowerCase().includes(term) ||
          c.codigo.toLowerCase().includes(term);
        const products = svc
          .productsOfClient(c.id)
          .filter(matchesProductNoSearch)
          .filter(
            (p) =>
              !term ||
              matchesClient ||
              p.name.toLowerCase().includes(term) ||
              p.abbreviation.toLowerCase().includes(term) ||
              p.sapCode.toLowerCase().includes(term),
          );
        return { c, products };
      })
      .filter(({ products }) => products.length > 0)
      .map(({ c, products }) => ({
        key: `c-${c.id}`,
        kind: "client" as const,
        title: c.razao,
        sub: c.cnpj,
        code: c.codigo,
        group: "",
        links: products.length,
        children: products.map((p) => ({
          key: `c-${c.id}-p-${p.id}`,
          kind: "product" as const,
          color: p.color,
          title: p.name,
          sub: p.abbreviation,
          code: p.sapCode,
          group: p.group,
          active: p.active,
          links: 0,
        })),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, group, status, svc]);

  const clearFilters = () => {
    setSearch("");
    setGroup("all");
    setStatus("all");
  };

  const hasFilter = search.trim() !== "" || group !== "all" || status !== "all";

  const columns: TableColumn<Row>[] = [
    {
      id: "title",
      label: view === "product" ? "Produto / Cliente" : "Cliente / Produto",
      accessor: (r) => r.title,
      render: (_value, r) => (
        <span className="nm-prod__cell">
          {r.children && r.children.length > 0 && (
            <ChevronDown
              size={16}
              className="nm-prod__chevron"
              aria-hidden="true"
            />
          )}
          {r.kind === "product" && (
            <span
              className="nm-prod__dot"
              style={{ background: r.color ?? "#ccc" }}
              aria-hidden="true"
            />
          )}
          <span className="nm-prod__titulo">{r.title}</span>
        </span>
      ),
      sortable: true,
    },
    { id: "sub", label: "Sigla / CNPJ", accessor: (r) => r.sub },
    { id: "code", label: "Código", accessor: (r) => r.code },
    {
      id: "group",
      label: "Grupo",
      accessor: (r) => (r.kind === "product" ? r.group : "—"),
      render: (_value, r) => {
        if (r.kind !== "product" || !r.group) return <span className="nm-prod__muted">—</span>;
        return (
          <span className={`nm-prod__tag nm-prod__tag--${groupTone(r.group)}`}>
            {r.group}
          </span>
        );
      },
    },
    {
      id: "status",
      label: view === "product" ? "Clientes / Status" : "Produtos / Status",
      align: "right",
      accessor: (r) => r.title,
      render: (_value, r) => {
        if (r.children) {
          return (
            <span className="nm-prod__count">
              <Users size={14} aria-hidden="true" />
              {r.links} {r.kind === "product" ? "cliente(s)" : "produto(s)"}
            </span>
          );
        }
        if (r.kind === "product") {
          return (
            <StatusTag
              label={r.active ? "Ativo" : "Inativo"}
              status={r.active ? "success" : "neutral"}
              size="sm"
            />
          );
        }
        return <span className="nm-prod__muted">—</span>;
      },
    },
  ];

  // ─── Fronteira de carregamento ────────────────────────────────────────────
  // Estado de carregamento: exibe um skeleton de tabela enquanto `load()` está
  // pendente (inerte sob o mock, que resolve imediatamente).
  if (loading) {
    return (
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <PageTitleCard
          title="Produtos"
          subtitle="Catálogo de produtos e seus vínculos com clientes"
        />
        <Skeleton.Table rows={6} columns={5} showHeader />
      </div>
    );
  }

  // Estado de erro: mensagem + ação de nova tentativa.
  if (error) {
    return (
      <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
        <PageTitleCard
          title="Produtos"
          subtitle="Catálogo de produtos e seus vínculos com clientes"
        />
        <div className="nm-prod__error">
          <p className="nm-prod__error-msg">{error.message}</p>
          <Button variant="contained" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Produtos"
        subtitle="Catálogo de produtos e seus vínculos com clientes"
      />

      {/* Filtros */}
      <div className="nm-prod__filtros">
        <Input
          size="sm"
          placeholder={
            view === "product"
              ? "Buscar por nome, sigla ou código SAP…"
              : "Buscar por produto ou cliente…"
          }
          leadingIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />

        {view === "product" && (
          <Select<string>
            size="sm"
            value={group}
            options={groups.map((g) => ({ option: g }))}
            getOptionItemLabel={(g) => (g === "all" ? "Todos os grupos" : g)}
            getSelectedOptionLabel={(g) => (g === "all" ? "Todos os grupos" : g)}
            onChange={(g) => setGroup(g)}
            style={{ flex: "0 0 200px" }}
          />
        )}

        <Select<StatusFilter>
          size="sm"
          value={status}
          options={STATUS_OPTS.map((s) => ({ option: s }))}
          getOptionItemLabel={(s) => STATUS_LABEL[s]}
          getSelectedOptionLabel={(s) => STATUS_LABEL[s]}
          onChange={(s) => setStatus(s)}
          style={{ flex: "0 0 200px" }}
        />

        {hasFilter && (
          <Button variant="outlined" size="sm" onClick={clearFilters}>
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Alternância de visão — acima da tabela */}
      <CustomTabs
        className="nm-prod__tabs"
        value={view}
        onChange={(v) => setView(v as View)}
        aria-label="Visualização de produtos"
      >
        <CustomTabs.List aria-label="Alternar entre visão por produto e por cliente">
          <CustomTabs.Tab value="product">Por produto</CustomTabs.Tab>
          <CustomTabs.Tab value="client">Por cliente</CustomTabs.Tab>
        </CustomTabs.List>
      </CustomTabs>

      <Table<Row>
        columns={columns}
        data={data}
        title={view === "product" ? "Produtos" : "Clientes"}
        getSubRows={(r) => r.children}
        expandAllControl
        onRowClick={(r) => setSelected(r)}
        emptyMessage="Nenhum registro encontrado para os filtros aplicados"
      />

      {selected && (
        <DetailsDrawer row={selected} view={view} onClose={() => setSelected(null)} />
      )}
    </div>
  );
};

/**
 * Painel lateral de detalhes da linha-pai selecionada.
 *
 * Princípio: cada informação aparece UMA ÚNICA VEZ. Os metadados do item-pai
 * (sigla/CNPJ, código e — quando produto — grupo) ficam só no topo; a lista de
 * vinculados mostra apenas o que é específico de cada vínculo, sem repetir os
 * campos já exibidos no cabeçalho.
 */
interface DetailsDrawerProps {
  row: Row;
  view: View;
  onClose: () => void;
}

const DetailsDrawer = ({ row, view, onClose }: DetailsDrawerProps) => {
  const isProduct = row.kind === "product";
  const children = row.children ?? [];
  // Rótulo da relação conforme a visão atual.
  const linkedLabel = view === "product" ? "Clientes vinculados" : "Produtos vinculados";
  // Nos filhos de um produto (clientes), `sub` = CNPJ. Nos filhos de um cliente
  // (produtos), `sub` = sigla. Rotulamos a coluna de acordo.
  const childSubLabel = isProduct ? "CNPJ" : "Sigla";

  return (
    <>
      <div className="nm-prod__drawer-overlay" onClick={onClose} aria-hidden="true" />
      <aside className="nm-prod__drawer" role="dialog" aria-label={`Detalhes de ${row.title}`}>
        <header className="nm-prod__drawer-head">
          <span className="nm-prod__drawer-title">
            {isProduct && (
              <span
                className="nm-prod__dot nm-prod__dot--lg"
                style={{ background: row.color ?? "#ccc" }}
                aria-hidden="true"
              />
            )}
            <strong>{row.title}</strong>
          </span>
          <button className="nm-prod__drawer-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        {/* Metadados do item — exibidos UMA única vez */}
        <dl className="nm-prod__drawer-meta">
          <div>
            <dt>{isProduct ? "Sigla" : "CNPJ"}</dt>
            <dd>{row.sub || "—"}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>{row.code || "—"}</dd>
          </div>
          {isProduct && (
            <div>
              <dt>Grupo</dt>
              <dd>
                <span className={`nm-prod__tag nm-prod__tag--${groupTone(row.group)}`}>
                  {row.group}
                </span>
              </dd>
            </div>
          )}
          {isProduct && (
            <div>
              <dt>Status</dt>
              <dd>
                <StatusTag
                  label={row.active ? "Ativo" : "Inativo"}
                  status={row.active ? "success" : "neutral"}
                  size="sm"
                />
              </dd>
            </div>
          )}
        </dl>

        {/* Lista de vinculados — só os campos específicos do vínculo */}
        <section className="nm-prod__drawer-section">
          <h3 className="nm-prod__drawer-section-title">
            <Users size={16} aria-hidden="true" />
            {linkedLabel}
            <span className="nm-prod__count">{children.length}</span>
          </h3>

          {children.length === 0 ? (
            <p className="nm-prod__muted" style={{ fontSize: 13 }}>
              Nenhum vínculo.
            </p>
          ) : (
            <ul className="nm-prod__linked">
              {children.map((c) => (
                <li key={c.key} className="nm-prod__linked-item">
                  {c.kind === "product" && (
                    <span
                      className="nm-prod__dot"
                      style={{ background: c.color ?? "#ccc" }}
                      aria-hidden="true"
                    />
                  )}
                  <div className="nm-prod__linked-main">
                    <span className="nm-prod__linked-name">{c.title}</span>
                    <span className="nm-prod__linked-sub">
                      {childSubLabel}: {c.sub || "—"} · Código: {c.code || "—"}
                    </span>
                  </div>
                  {c.kind === "product" && (
                    <StatusTag
                      label={c.active ? "Ativo" : "Inativo"}
                      status={c.active ? "success" : "neutral"}
                      size="sm"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </>
  );
};

export default ProductsPage;