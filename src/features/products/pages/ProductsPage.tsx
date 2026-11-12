import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  CustomTabs,
  Input,
  PageTitleCard,
  Pagination,
  Skeleton,
  Table,
  type TableColumn,
} from "@devs-atem/design-system";

import type { Cliente } from "@shared/domain";
import { useIoC } from "@shared/hooks/useIoC";
import type { PagedResult } from "../services/ProductsDataSource";
import type { CatalogProduct } from "../services/ProductsService";
import {
  DeleteProductDialog,
  ClientProductsDialog,
  ProductClientsDialog,
  ProductFormDialog,
} from "./ProductDialogs";
import "./ProductsPage.css";

type View = "product" | "client";

/** Itens por página (`limit` das APIs paginadas). */
const PAGE_SIZE = 10;

/**
 * Linha das tabelas (somente a listagem paginada, sem vínculos).
 * - Em "Por produto": cada linha é um produto.
 * - Em "Por cliente": cada linha é um cliente.
 * Os vínculos só são buscados ao abrir o painel lateral da linha.
 */
interface Row {
  key: string;
  kind: "product" | "client";
  /** Id do produto (kind "product"). */
  productId?: string;
  /** Id substituto do cliente (kind "client"). */
  clientId?: number;
  color?: string;
  title: string;
  /** CNPJ (clientes). Vazio para produtos. */
  sub: string;
  /** Código SAP (produtos) ou BP (clientes). */
  code: string;
}

/** Item vinculado exibido no painel lateral. */
interface LinkedItem {
  key: string;
  kind: "product" | "client";
  color?: string;
  title: string;
  sub: string;
  code: string;
}

/** Estado do detalhe (vínculos) do item aberto no painel lateral. */
type DetailState =
  | { status: "loading" }
  | { status: "error" }
  | {
      status: "ready";
      items: LinkedItem[];
      /** Clientes vinculados (kind "product"). */
      clientIds: number[];
      /** Produtos vinculados (kind "client"). */
      productIds: string[];
    };

type Dialog =
  | { type: "create" }
  | { type: "edit"; product: CatalogProduct }
  | {
      type: "clients";
      product: CatalogProduct;
      allClients: Cliente[];
      initialIds: number[];
    }
  | {
      type: "client-products";
      client: Cliente;
      allProducts: CatalogProduct[];
      initialIds: string[];
    }
  | { type: "delete"; product: CatalogProduct }
  | null;

export const ProductsPage = () => {
  const svc = useIoC("products");
  const [view, setView] = useState<View>("product");
  const [search, setSearch] = useState("");
  // Linha selecionada → abre o painel lateral e dispara a busca do detalhe.
  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<DetailState>({ status: "loading" });
  const detailRequest = useRef(0);
  const [dialog, setDialog] = useState<Dialog>(null);

  // Página corrente de cada visão e os dados carregados (somente a página).
  const [productPage, setProductPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [productsData, setProductsData] =
    useState<PagedResult<CatalogProduct> | null>(null);
  const [clientsData, setClientsData] =
    useState<PagedResult<Cliente> | null>(null);

  // Carregamento da página corrente: skeleton só na área da tabela; mensagem +
  // "Tentar novamente" em caso de falha.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Incrementado para reexecutar a carga da página (retry e pós-mutação).
  const [reloadToken, setReloadToken] = useState(0);

  const page = view === "product" ? productPage : clientPage;
  const setPage = view === "product" ? setProductPage : setClientPage;

  // Só a visão ativa é carregada, e só a listagem da página corrente dela.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const q = { page, limit: PAGE_SIZE };
    const request =
      view === "product"
        ? svc.loadProductsPage(q).then((r) => {
            if (cancelled) return;
            setProductsData(r);
            // Página ficou fora do intervalo (ex.: última exclusão): volta.
            if (r.rows.length === 0 && r.total > 0 && page > 1) {
              setProductPage(Math.max(1, Math.ceil(r.total / PAGE_SIZE)));
            }
          })
        : svc.loadClientsPage(q).then((r) => {
            if (cancelled) return;
            setClientsData(r);
            if (r.rows.length === 0 && r.total > 0 && page > 1) {
              setClientPage(Math.max(1, Math.ceil(r.total / PAGE_SIZE)));
            }
          });

    request
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
  }, [svc, view, page, reloadToken]);

  const retry = useCallback(() => setReloadToken((t) => t + 1), []);

  const closeDetail = useCallback(() => {
    detailRequest.current++; // invalida uma busca de detalhe em andamento
    setSelected(null);
  }, []);

  /** Recarrega a listagem da página corrente após uma mutação. */
  const refresh = useCallback(() => {
    closeDetail();
    setReloadToken((t) => t + 1);
  }, [closeDetail]);

  /** Abre o painel lateral e busca os vínculos SÓ do item clicado. */
  const openRow = (row: Row) => {
    const requestId = ++detailRequest.current;
    setSelected(row);
    setDetail({ status: "loading" });

    const run =
      row.kind === "product"
        ? svc.getProductDetail(row.productId as string).then((d) => ({
            items: d.clients.map<LinkedItem>((c) => ({
              key: `c-${c.id}`,
              kind: "client",
              title: c.razao,
              sub: c.cnpj,
              code: c.codigo,
            })),
            clientIds: d.clients.map((c) => c.id),
            productIds: [] as string[],
          }))
        : svc.getClientDetail(row.clientId as number).then((d) => ({
            items: d.products.map<LinkedItem>((p) => ({
              key: `p-${p.id}`,
              kind: "product",
              color: p.color,
              title: p.name,
              sub: "",
              code: p.sapCode,
            })),
            clientIds: [] as number[],
            productIds: d.products.map((p) => p.id),
          }));

    run
      .then((r) => {
        if (detailRequest.current === requestId) {
          setDetail({ status: "ready", ...r });
        }
      })
      .catch(() => {
        if (detailRequest.current === requestId) setDetail({ status: "error" });
      });
  };

  const changeView = (v: View) => {
    setView(v);
    closeDetail();
  };

  const term = search.trim().toLowerCase();

  // A API paginada não tem parâmetro de busca: a busca filtra a página corrente.
  const data = useMemo<Row[]>(() => {
    if (view === "product") {
      return (productsData?.rows ?? [])
        .filter(
          (p) =>
            !term ||
            p.name.toLowerCase().includes(term) ||
            p.sapCode.toLowerCase().includes(term),
        )
        .map((p) => ({
          key: `p-${p.id}`,
          kind: "product" as const,
          productId: p.id,
          color: p.color,
          title: p.name,
          sub: "",
          code: p.sapCode,
        }));
    }

    return (clientsData?.rows ?? [])
      .filter(
        (c) =>
          !term ||
          c.razao.toLowerCase().includes(term) ||
          c.cnpj.toLowerCase().includes(term) ||
          c.codigo.toLowerCase().includes(term),
      )
      .map((c) => ({
        key: `c-${c.id}`,
        kind: "client" as const,
        clientId: c.id,
        title: c.razao,
        sub: c.cnpj,
        code: c.codigo,
      }));
  }, [view, term, productsData, clientsData]);

  const total =
    (view === "product" ? productsData?.total : clientsData?.total) ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilter = search.trim() !== "";

  const columns: TableColumn<Row>[] = [
    {
      id: "title",
      label: view === "product" ? "Produto" : "Cliente",
      accessor: (r) => r.title,
      render: (_value, r) => (
        <span className="nm-prod__cell">
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
      label: view === "product" ? "Código SAP" : "BP",
      accessor: (r) => r.code,
    },
  ];

  // ─── Ações de escrita ──────────────────────────────────────────────────────
  const productOf = (id?: string): CatalogProduct | undefined =>
    id ? productsData?.rows.find((p) => p.id === id) : undefined;

  const handleCreate = async (v: { name: string; sapCode: string }) => {
    await svc.createProduct(v);
    toast.success("Produto cadastrado.");
    setDialog(null);
    refresh();
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
    refresh();
  };

  const handleLinkClients = async (product: CatalogProduct, ids: number[]) => {
    // Os ids numéricos são substitutos: a API recebe sempre os UUIDs reais.
    // `clientUuids` é substituição total: descartar um id sem UUID apagaria
    // esse vínculo no backend, então aborta em vez de filtrar em silêncio.
    const uuids = ids.map((id) => svc.clientUuidOf(id));
    if (uuids.some((u) => !u)) {
      toast.error(
        "Não foi possível identificar alguns clientes selecionados. Recarregue a página e tente novamente.",
      );
      return;
    }
    await svc.updateProduct(product.id, { clientUuids: uuids as string[] });
    toast.success("Vínculos atualizados.");
    setDialog(null);
    refresh();
  };

  const handleDelete = async (product: CatalogProduct) => {
    await svc.deleteProduct(product.id);
    toast.success(`Produto "${product.name}" excluído.`);
    setDialog(null);
    // Excluiu o único item da última página → recua uma página.
    if (productsData && productsData.rows.length === 1 && productPage > 1) {
      setProductPage(productPage - 1);
    }
    refresh();
  };

  const clientOf = (id?: number): Cliente | undefined =>
    id !== undefined ? clientsData?.rows.find((c) => c.id === id) : undefined;

  const handleLinkProducts = async (client: Cliente, ids: string[]) => {
    await svc.updateClientProducts(client.id, ids);
    toast.success("Vínculos atualizados.");
    setDialog(null);
    refresh();
  };

  /** Abre o diálogo de vínculo do cliente; a lista de produtos é buscada só agora. */
  const openClientProductsDialog = async (client: Cliente) => {
    if (detail.status !== "ready") return;
    const initialIds = detail.productIds;
    try {
      const allProducts = await svc.listAllProducts();
      setDialog({ type: "client-products", client, allProducts, initialIds });
    } catch {
      toast.error("Não foi possível carregar a lista de produtos.");
    }
  };

  /** Abre o diálogo de vínculo; a lista completa de clientes é buscada só agora. */
  const openLinksDialog = async (product: CatalogProduct) => {
    if (detail.status !== "ready") return;
    const initialIds = detail.clientIds;
    try {
      const allClients = await svc.listAllClients();
      setDialog({ type: "clients", product, allClients, initialIds });
    } catch {
      toast.error("Não foi possível carregar a lista de clientes.");
    }
  };

  const pageStyle = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 18,
  };

  return (
    <div style={pageStyle}>
      <PageTitleCard
        title="Produtos"
        subtitle="Catálogo de produtos e seus vínculos com clientes"
        actions={
          <Button variant="contained" onClick={() => setDialog({ type: "create" })}>
            + Novo produto
          </Button>
        }
      />

      {/* Filtros */}
      <div className="nm-prod__filtros">
        <Input
          size="sm"
          placeholder={
            view === "product"
              ? "Buscar nesta página por nome ou código SAP…"
              : "Buscar nesta página por cliente, CNPJ ou BP…"
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
        onChange={(v) => changeView(v as View)}
        aria-label="Visualização de produtos"
      >
        <CustomTabs.List aria-label="Alternar entre visão por produto e por cliente">
          <CustomTabs.Tab value="product">Por produto</CustomTabs.Tab>
          <CustomTabs.Tab value="client">Por cliente</CustomTabs.Tab>
        </CustomTabs.List>
      </CustomTabs>

      {loading ? (
        <div aria-busy="true">
          <Skeleton.Table rows={6} columns={3} showHeader />
        </div>
      ) : error ? (
        <div className="nm-prod__error">
          <p className="nm-prod__error-msg">{error.message}</p>
          <Button variant="contained" onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <Table<Row>
            columns={columns}
            data={data}
            title={view === "product" ? "Produtos" : "Clientes"}
            itemCount={total}
            onRowClick={openRow}
            emptyMessage="Nenhum registro encontrado para os filtros aplicados"
          />
          {total > PAGE_SIZE && (
            <Pagination
              page={page}
              totalPages={totalPages}
              totalItems={total}
              pageSize={PAGE_SIZE}
              onPageChange={(p) => {
                closeDetail();
                setPage(p);
              }}
            />
          )}
        </>
      )}

      {selected && (
        <DetailsDrawer
          row={selected}
          view={view}
          detail={detail}
          onClose={closeDetail}
          onEdit={() => {
            const p = productOf(selected.productId);
            if (p) setDialog({ type: "edit", product: p });
          }}
          onLinks={() => {
            const p = productOf(selected.productId);
            if (p) void openLinksDialog(p);
          }}
          onDelete={() => {
            const p = productOf(selected.productId);
            if (p) setDialog({ type: "delete", product: p });
          }}
          onClientProducts={() => {
            const c = clientOf(selected.clientId);
            if (c) void openClientProductsDialog(c);
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
          clients={dialog.allClients}
          initialIds={dialog.initialIds}
          onClose={() => setDialog(null)}
          onSubmit={(ids) => handleLinkClients(dialog.product, ids)}
        />
      )}
      {dialog?.type === "client-products" && (
        <ClientProductsDialog
          client={dialog.client}
          products={dialog.allProducts}
          initialIds={dialog.initialIds}
          onClose={() => setDialog(null)}
          onSubmit={(ids) => handleLinkProducts(dialog.client, ids)}
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
 * Painel lateral de detalhes da linha selecionada.
 *
 * Os vínculos (clientes de um produto / produtos de um cliente) são buscados
 * sob demanda quando o painel abre. Para produtos, expõe as ações de escrita
 * (editar, clientes, excluir).
 */
interface DetailsDrawerProps {
  row: Row;
  view: View;
  detail: DetailState;
  onClose: () => void;
  onEdit: () => void;
  onLinks: () => void;
  onDelete: () => void;
  onClientProducts: () => void;
}

const DetailsDrawer = ({
  row,
  view,
  detail,
  onClose,
  onEdit,
  onLinks,
  onDelete,
  onClientProducts,
}: DetailsDrawerProps) => {
  const isProduct = row.kind === "product";
  const items = detail.status === "ready" ? detail.items : [];
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
            <Button
              variant="outlined"
              size="sm"
              onClick={onLinks}
              disabled={detail.status !== "ready"}
            >
              Clientes
            </Button>
            <Button variant="outlined" size="sm" color="error" onClick={onDelete}>
              Excluir
            </Button>
          </div>
        )}

        {!isProduct && row.clientId !== undefined && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "0 16px 12px" }}>
            <Button
              variant="outlined"
              size="sm"
              onClick={onClientProducts}
              disabled={detail.status !== "ready"}
            >
              Produtos
            </Button>
          </div>
        )}

        <section className="nm-prod__drawer-section">
          <h3 className="nm-prod__drawer-section-title">
            <Users size={16} aria-hidden="true" />
            {linkedLabel}
            {detail.status === "ready" && (
              <span className="nm-prod__count">{items.length}</span>
            )}
          </h3>

          {detail.status === "loading" ? (
            <div aria-busy="true">
              <Skeleton.Table rows={3} columns={1} showHeader={false} />
            </div>
          ) : detail.status === "error" ? (
            <p className="nm-prod__muted" style={{ fontSize: 13 }}>
              Não foi possível carregar os vínculos.
            </p>
          ) : items.length === 0 ? (
            <p className="nm-prod__muted" style={{ fontSize: 13 }}>
              Nenhum vínculo.
            </p>
          ) : (
            <ul className="nm-prod__linked">
              {items.map((c) => (
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
