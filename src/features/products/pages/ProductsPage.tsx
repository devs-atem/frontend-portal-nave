import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Button,
  Input,
  PageTitleCard,
  Select,
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

export const ProductsPage = () => {
  const svc = useIoC("products");
  const [view, setView] = useState<View>("product");
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<string>("all");
  const [status, setStatus] = useState<StatusFilter>("all");

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
      accessor: (r) => (
        <span className="nm-prod__cell">
          {r.kind === "product" ? (
            <span
              className="nm-prod__dot"
              style={{ background: r.color ?? "#ccc" }}
              aria-hidden="true"
            />
          ) : (
            <span className="nm-prod__badge" aria-hidden="true">
              CLI
            </span>
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
    },
    {
      id: "status",
      label: view === "product" ? "Clientes / Status" : "Produtos / Status",
      align: "right",
      accessor: (r) => {
        if (r.children) {
          return (
            <span className="nm-prod__count">
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
        return "—";
      },
    },
  ];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18 }}>
      <PageTitleCard
        title="Produtos"
        subtitle="Catálogo de produtos e seus vínculos com clientes"
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              variant={view === "product" ? "contained" : "outlined"}
              onClick={() => setView("product")}
            >
              Por produto
            </Button>
            <Button
              variant={view === "client" ? "contained" : "outlined"}
              onClick={() => setView("client")}
            >
              Por cliente
            </Button>
          </div>
        }
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
          style={{ flex: "1 1 280px" }}
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

      <Table<Row>
        columns={columns}
        data={data}
        title={view === "product" ? "Produtos" : "Clientes"}
        getSubRows={(r) => r.children}
        expandAllControl
        emptyMessage="Nenhum registro encontrado para os filtros aplicados"
      />
    </div>
  );
};

export default ProductsPage;
