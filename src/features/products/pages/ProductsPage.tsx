import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  CustomTabs,
  Input,
  PageTitleCard,
  Skeleton,
  Table,
  type TableColumn,
} from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import type { CatalogProduct } from "../services/ProductsService";
import {
  DeleteProductDialog,
  ProductClientsDialog,
  ProductFormDialog,
} from "./ProductDialogs";
import "./ProductsPage.css";

type View = "product" | "client";

/**
 * Linha unificada das tabelas expansíveis.
 * - Em "Por produto": a linha-pai é um produto e as sub-linhas são os clientes.
 * - Em "Por cliente": a linha-pai é um cliente e as sub-linhas são os produtos.
 */
interface Row {
  key: string;
  kind: "product" | "client";
  /** Id do produto (kind "product") para as ações de escrita. */
  productId?: string;
  color?: string;
  title: string;
  /** CNPJ (clientes). Vazio para produtos. */
  sub: string;
  /** Código SAP (produtos) ou BP (clientes). */
  code: string;
  links: number;
  children?: Row[];
}

type Dialog =
  | { type: "create" }
  | { type: "edit"; product: CatalogProduct }
  | { type: "clients"; product: CatalogProduct }
  | { type: "delete"; product: CatalogProduct }
  | null;

export const ProductsPage = () => {
  const svc = useIoC("products");
  const [view, setView] = useState<View>("product");
  const [search, setSearch] = useState("");
  // Linha-pai selecionada → abre o painel lateral de detalhes.
  const [selected, setSelected] = useState<Row | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  // Fronteira de carregamento dos dados: dispara `svc.load()` uma vez na
  // montagem e acompanha os estados de carregamento/erro (skeleton enquanto
  // carrega; mensagem + "Tentar novamente" em caso de falha).
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Incrementado pelo botão "Tentar novamente" para reexecutar o efeito.
  const [retryToken, setRetryToken] = useState(0);
  // Incrementado após `refresh()` para recalcular as linhas do snapshot.
  const [version, setVersion] = useState(0);

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
        void err;
        const normalized = new Error("Não foi possível exibir os dados.");
        setError(normalized);
        setLoading(false);
        toast.error(normalized.message);
      });
    return () => {
      cancelled = true;
    };
  }, [svc, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

  /** Recarrega o snapshot após uma mutação e atualiza a tabela. */
  const refresh = useCallback(async () => {
    try {
      await svc.refresh();
    } catch {
      toast.error("Não foi possível atualizar os dados.");
    }
    setVersion((v) => v + 1);
    setSelected(null);
  }, [svc]);

  const matchesProduct = (p: CatalogProduct): boolean => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      p.name.toLowerCase().includes(term) ||
      p.sapCode.toLowerCase().includes(term)
    );
  };

  const productToRow = (p: CatalogProduct): Row => ({
    key: `p-${p.id}`,
    kind: "product",
    productId: p.id,
    color: p.color,
    title: p.name,
    sub: "",
    code: p.sapCode,
    links: svc.clientCountOfProduct(p.id),
    children: svc.clientsOfProduct(p.id).map((c) => ({
      key: `p-${p.id}-c-${c.id}`,
      kind: "client" as const,
      title: c.razao,
      sub: c.cnpj,
      code: c.codigo,
      links: 0,
    })),
  });

  const data = useMemo<Row[]>(() => {
    if (view === "product") {
      return svc.products.filter(matchesProduct).map(productToRow);
    }

    // Visão por cliente: a busca casa o cliente (nome, CNPJ, BP) ou seus produtos.
    const term = search.trim().toLowerCase();
    return svc.clients
      .map((c) => {
        const matchesClient =
          c.razao.toLowerCase().includes(term) ||
          c.cnpj.toLowerCase().includes(term) ||
          c.codigo.toLowerCase().includes(term);
        const products = svc
          .productsOfClient(c.id)
          .filter(
            (p) =>
              !term ||
              matchesClient ||
              p.name.toLowerCase().includes(term) ||
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
        links: products.length,
        children: products.map((p) => ({
          key: `c-${c.id}-p-${p.id}`,
          kind: "product" as const,
          productId: p.id,
          color: p.color,
          title: p.name,
          sub: "",
          code: p.sapCode,
          links: 0,
        })),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, search, svc, loading, version]);

  const hasFilter = search.trim() !== "";

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
    {
      id: "sub",
      label: "CNPJ",
      accessor: (r) => r.sub,
      render: (_value, r) =>
        r.sub ? r.sub : <span className="nm-prod__muted">—</span>,
    },
    {
      id: "code",
      label: view === "product" ? "Código SAP / BP" : "BP / Código SAP",
      accessor: (r) => r.code,
    },
    {
      id: "links",
      label: view === "product" ? "Clientes" : "Produtos",
      align: "right",
      accessor: (r) => r.links,
      render: (_value, r) => {
        if (r.children) {
          return (
            <span className="nm-prod__count">
              <Users size={14} aria-hidden="true" />
              {r.links} {r.kind === "product" ? "cliente(s)" : "produto(s)"}
            </span>
          );
        }
        return <span className="nm-prod__muted">—</span>;
      },
    },
  ];

  // ─── Ações de escrita ──────────────────────────────────────────────────────
  const productById = (id?: string) =>
    id ? svc.products.find((p) => p.id === id) : undefined;

  const handleCreate = async (v: { name: string; sapCode: string }) => {
    await svc.createProduct(v);
    toast.success("Produto cadastrado.");
    setDialog(null);
    await refresh();
  };

  const handleEdit = async (
    product: CatalogProduct,
    v: { name: string; sapCode: string },
  ) => {
    const changes: { name?: string; sapCode?: string } = {};
    if (v.name !== product.name) changes.name = v.name;
    if (v.sapCode !== product.sapCode) changes.sapCode = v.sapCode;
    if (Object.keys(changes).length > 0) {
      await svc.updateProduct(product.id, changes);
      toast.success("Produto atualizado.");
    }
    setDialog(null);
    await refresh();
  };

  const handleLinkClients = async (product: CatalogProduct, ids: number[]) => {
    // Os ids numéricos são substitutos: a API recebe sempre os UUIDs reais.
    const uuids = ids
      .map((id) => svc.clientUuidOf(id))
      .filter((u): u is string => !!u);
    await svc.updateProduct(product.id, { clientUuids: uuids });
    toast.success("Vínculos atualizados.");
    setDialog(null);
    await refresh();
  };

  const handleDelete = async (product: CatalogProduct) => {
    await svc.deleteProduct(product.id);
    toast.success(`Produto "${product.name}" excluído.`);
    setDialog(null);
    await refresh();
  };

  const pageStyle = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 18,
  };

  const header = (withCreate: boolean) => (
    <PageTitleCard
      title="Produtos"
      subtitle="Catálogo de produtos e seus vínculos com clientes"
      actions={
        withCreate && (
          <Button variant="contained" onClick={() => setDialog({ type: "create" })}>
            + Novo produto
          </Button>
        )
      }
    />
  );

  // ─── Fronteira de carregamento ────────────────────────────────────────────
  if (loading) {
    return (
      <div style={pageStyle} aria-busy="true">
        {header(false)}
        <Skeleton.Table rows={6} columns={4} showHeader />
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        {header(false)}
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
    <div style={pageStyle}>
      {header(true)}

      {/* Filtros */}
      <div className="nm-prod__filtros">
        <Input
          size="sm"
          placeholder={
            view === "product"
              ? "Buscar por nome ou código SAP…"
              : "Buscar por cliente, CNPJ, BP ou produto…"
          }
          leadingIcon={<Search size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 0", minWidth: 0 }}
        />

        {hasFilter && (
          <Button variant="outlined" size="sm" onClick={() => setSearch("")}>
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
        <DetailsDrawer
          row={selected}
          view={view}
          onClose={() => setSelected(null)}
          onEdit={() => {
            const p = productById(selected.productId);
            if (p) setDialog({ type: "edit", product: p });
          }}
          onLinks={() => {
            const p = productById(selected.productId);
            if (p) setDialog({ type: "clients", product: p });
          }}
          onDelete={() => {
            const p = productById(selected.productId);
            if (p) setDialog({ type: "delete", product: p });
          }}
        />
      )}

      {dialog?.type === "create" && (
        <ProductFormDialog
          product={null}
          onClose={() => setDialog(null)}
          onSubmit={handleCreate}
        />
      )}
      {dialog?.type === "edit" && (
        <ProductFormDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSubmit={(v) => handleEdit(dialog.product, v)}
        />
      )}
      {dialog?.type === "clients" && (
        <ProductClientsDialog
          product={dialog.product}
          clients={svc.clients}
          initialIds={svc.clientsOfProduct(dialog.product.id).map((c) => c.id)}
          onClose={() => setDialog(null)}
          onSubmit={(ids) => handleLinkClients(dialog.product, ids)}
        />
      )}
      {dialog?.type === "delete" && (
        <DeleteProductDialog
          product={dialog.product}
          onClose={() => setDialog(null)}
          onConfirm={() => handleDelete(dialog.product)}
        />
      )}
    </div>
  );
};

/**
 * Painel lateral de detalhes da linha-pai selecionada.
 *
 * Cada informação aparece uma única vez: os metadados do item-pai ficam no
 * topo e a lista de vinculados mostra só o que é específico de cada vínculo.
 * Para produtos, expõe as ações de escrita (editar, clientes, excluir).
 */
interface DetailsDrawerProps {
  row: Row;
  view: View;
  onClose: () => void;
  onEdit: () => void;
  onLinks: () => void;
  onDelete: () => void;
}

const DetailsDrawer = ({
  row,
  view,
  onClose,
  onEdit,
  onLinks,
  onDelete,
}: DetailsDrawerProps) => {
  const isProduct = row.kind === "product";
  const children = row.children ?? [];
  const linkedLabel = view === "product" ? "Clientes vinculados" : "Produtos vinculados";
  const childSubLabel = isProduct ? "CNPJ" : "Código SAP";

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

        <dl className="nm-prod__drawer-meta">
          {!isProduct && (
            <div>
              <dt>CNPJ</dt>
              <dd>{row.sub || "—"}</dd>
            </div>
          )}
          <div>
            <dt>{isProduct ? "Código SAP" : "BP"}</dt>
            <dd>{row.code || "—"}</dd>
          </div>
        </dl>

        {isProduct && row.productId && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 12px" }}>
            <Button variant="outlined" size="sm" onClick={onEdit}>
              Editar
            </Button>
            <Button variant="outlined" size="sm" onClick={onLinks}>
              Clientes
            </Button>
            <Button variant="outlined" size="sm" color="error" onClick={onDelete}>
              Excluir
            </Button>
          </div>
        )}

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
                      {c.kind === "client"
                        ? `${childSubLabel}: ${c.sub || "—"} · BP: ${c.code || "—"}`
                        : `${childSubLabel}: ${c.code || "—"}`}
                    </span>
                  </div>
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
