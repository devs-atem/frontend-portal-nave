# Design — Products Page Alignment

## Overview

This design aligns the front-end Products page (`frontend-portal-nave`) with the data
structure that the `mw-nave` back-end is expected to expose for products and their
client relationships. It has two concerns, matching the requirements:

1. **Front-end alignment** — introduce a `Products_Data_Source` abstraction resolved
   from the IoC container so the current in-memory mock can be swapped for a real API
   client without changing `ProductsPage.tsx` (Requirement 9). All existing page
   behavior — the two views, text search, group/status filters, clear-filters, link
   counts, and empty states (Requirements 1–8) — is preserved and defined against that
   abstraction.
2. **Expected API contract** — specify the `mw-nave` Products_API endpoints and
   response shapes the front-end depends on (Requirements 10–11), aligned with existing
   `mw-nave` conventions (`/rest` routes, UUID ids, Zod/nestjs-zod DTOs, OpenAPI
   contract, optional nested related resources), plus the mapping between the contract
   and the front-end model (Requirement 12).

**Scope boundary:** The back-end implementation of the Products_API is out of scope.
This document specifies only the expected contract and the front-end code that consumes
it. No source code is changed by this document.

**Non-goals:** Implementing the `Api_Products_Data_Source` against a live back-end,
building the `mw-nave` products module, and altering the visual design of the page.

### Verified current state

- `ProductsPage.tsx` resolves its service synchronously via `const svc = useIoC("products")`
  and reads `svc.products`, `svc.clients`, and the four relationship methods inside a
  `useMemo`. All filtering/matching logic lives in the page component.
- `ProductsService` holds in-memory `CATALOG` (`CatalogProduct`) and `LINKS`
  (`ProductClientLink`, `clientId: number`), and reuses `CLIENTES`/`Cliente`
  (`id: number`) from `@shared/domain`.
- `module.tsx` registers the service with `c.add({ products: new ProductsService() })`
  and augments `AppServices` via declaration merging.
- `AxiosHttpService` implements `IHttpService` and is registered in the container as
  `http`; features inject it via `c.get("http")`.

## Architecture

The key move is to make `ProductsPage` depend on an **interface**
(`Products_Data_Source`) instead of the concrete `ProductsService`. Two
implementations satisfy that interface and are interchangeable at the IoC
registration point (Requirements 9.3, 9.4):

- **`MockProductsDataSource`** — wraps the existing in-memory seed data (today's
  `ProductsService` logic). Default implementation; keeps the app working out of the box.
- **`ApiProductsDataSource`** — consumes the Products_API over HTTP via the core
  `http` service resolved from the container (Requirement 9.5), and maps contract
  responses to the front-end model (Requirement 12).

```mermaid
graph TD
  Page[ProductsPage.tsx] -->|useIoC\x28"products"\x29| DS[Products_Data_Source interface]
  DS -.implemented by.-> Mock[MockProductsDataSource]
  DS -.implemented by.-> Api[ApiProductsDataSource]
  Mock --> Seed[(In-memory seed:\nCATALOG + LINKS + CLIENTES)]
  Api --> Http[core http: IHttpService]
  Http -->|GET /rest/products ...| ProductsAPI[(Products_API\nmw-nave — out of scope)]
  Module[products/module.tsx] -->|c.add\x28{ products: ... }\x29| DS
  Module -->|c.get\x28"http"\x29| Http
```

### Swapping implementations without touching the page

The page resolves the data source by its registry key `products`. Swapping
implementations is a one-line change in `module.tsx`, invisible to the page:

```tsx
// Mock (default, today)
services: (c) => c.add({ products: new MockProductsDataSource() }),

// Real API (future) — page component unchanged (Req 9.4)
services: (c) => c.add({ products: new ApiProductsDataSource(c.get("http")) }),
```

For this to hold, the registry type for `products` must be the **interface**, not the
concrete class:

```tsx
declare module "@core/ioc/registry" {
  interface AppServices {
    products: Products_Data_Source;
  }
}
```

### Synchronous vs asynchronous data access

The current page reads data **synchronously** inside `useMemo` (`svc.products`,
`svc.clientsOfProduct(id)`, …). An HTTP-backed source is inherently **asynchronous**.
To introduce async without breaking the page's data contract, the interface exposes
async loading plus synchronous accessors over an already-loaded snapshot:

- A single async `load()` (or React Query hook) fetches products-with-clients and
  clients-with-products once, populating an in-memory snapshot inside the data source.
- The existing synchronous accessors (`products`, `clients`, `clientsOfProduct`,
  `productsOfClient`, counts) read from that snapshot and keep today's exact signatures,
  so the page's `useMemo` filtering logic is unchanged.
- The mock's `load()` resolves immediately (snapshot is the seed data), so the mock
  path incurs no behavioral change.

This keeps all matching/filtering/counting logic (Requirements 1–8) operating on a
synchronous snapshot regardless of whether the snapshot came from seed data or HTTP.
The page gains `loading`/`error` handling only at the data-fetch boundary (see
[Loading and error handling](#loading-and-error-handling)).

## Components and Interfaces

### `Products_Data_Source` interface

Derived directly from Requirement 9.2, preserving the method names and signatures the
page already calls. A new `load()` method and `loading`/`error` state cover the async
boundary (Requirement 9.4 — the page must render unchanged across implementations, so
the mock also exposes these, resolving trivially).

```ts
// src/features/products/services/Products_Data_Source.ts
import type { Cliente } from "@shared/domain";
import type { CatalogProduct } from "./ProductsService";

export interface Products_Data_Source {
  /** Loaded product catalog snapshot (Req 9.2). */
  readonly products: CatalogProduct[];
  /** Loaded client snapshot (Req 9.2). */
  readonly clients: Cliente[];

  /** Clients linked to a product (Req 9.2, 12.3). */
  clientsOfProduct(productId: string): Cliente[];
  /** Products linked to a client (Req 9.2, 12.4). */
  productsOfClient(clientId: number): CatalogProduct[];
  /** Count of clients linked to a product (Req 9.2, 7.1). */
  clientCountOfProduct(productId: string): number;
  /** Count of products linked to a client (Req 9.2, 7.2). */
  productCountOfClient(clientId: number): number;

  /**
   * Hydrate the snapshot. Mock resolves immediately; Api fetches over HTTP.
   * Idempotent: calling twice yields the same snapshot (Req 9.4).
   */
  load(): Promise<void>;
}
```

The current `ProductsService` already satisfies the synchronous portion of this
interface; `MockProductsDataSource` is `ProductsService` plus a no-op async `load()`.

### `MockProductsDataSource`

- Backed by the existing in-memory `CATALOG`, `LINKS`, and `CLIENTES` seed data
  (Requirement 9.3).
- `load()` resolves immediately (snapshot is already present).
- Behavior is byte-for-byte identical to today's `ProductsService`, so the page renders
  identically in the default configuration.

### `ApiProductsDataSource`

- Constructed with the core `http: IHttpService` from the container (Requirement 9.5):
  `new ApiProductsDataSource(c.get("http"))`.
- `load()` issues two collection calls — `GET /rest/products` (products with nested
  clients) and `GET /rest/clients` (clients with nested products) — validates the
  responses with the generated Zod DTOs, maps them to the front-end model
  (Requirement 12), builds the same `products`/`clients`/links snapshot the mock holds,
  and reconciles client UUIDs to numeric ids (see
  [Identifier reconciliation](#identifier-reconciliation)).
- After `load()`, the synchronous accessors read from the mapped snapshot, so the page's
  filtering logic (Requirements 1–8) is unchanged.
- Single-item endpoints (`GET /rest/products/{id}`, `GET /rest/clients/{id}`) and
  `GET /rest/products/search?name=` are available on the contract for future
  server-side search/detail, but the snapshot model satisfies the current page's needs.

### `ProductsPage` (unchanged component)

The page keeps resolving `useIoC("products")` and its current `useMemo` logic. The only
additions are at the fetch boundary: trigger `load()` and render loading/error/empty
states. In the mock configuration these are inert. The matching helpers
(`matchesProduct`, the client-view search/filter composition) stay exactly as they are
today, satisfying Requirements 1–8.

## Data Models

### Front-end models (existing, unchanged)

```ts
// CatalogProduct — src/features/products/services/ProductsService.ts
interface CatalogProduct {
  id: string;          // UUID string already
  name: string;        // "ÓLEO DIESEL A S10"
  abbreviation: string;// "AS-10"
  sapCode: string;     // "10460"
  color: string;       // "#a18a9f"
  group: string;       // "Diesel"
  active: boolean;
}

// Cliente — src/shared/domain/types.ts
interface Cliente {
  id: number;          // numeric in the front-end model
  codigo: string;
  razao: string;
  cnpj: string;
}

// ProductClientLink — N:N
interface ProductClientLink { productId: string; clientId: number; }
```

Note the product `id` is already a UUID string on the front-end, so it maps directly to
the contract's UUID (Requirement 12.1). Only the **client** identifier needs
reconciliation (Requirement 12.5).

### Expected Products_API contract (Requirements 10, 11)

All endpoints live under the `/rest` prefix (Requirement 10.1), use UUID identifiers
(Requirements 11.2, 11.3), and expose response shapes as Zod schemas published via
nestjs-zod DTOs in the OpenAPI contract (Requirement 11.1). Nested related resources are
**optional arrays**, matching the `mw-nave` `AnimalResponse.vaccines?` pattern
(Requirements 11.6, 11.7).

#### Endpoints

| Method | Path | Returns | Requirement |
| --- | --- | --- | --- |
| GET | `/rest/products` | Collection of products, each with nested clients | 10.2 |
| GET | `/rest/products/{id}` | Single product by UUID, with nested clients; 404 if absent | 10.4, 10.6 |
| GET | `/rest/products/search?name=` | Products filtered by text term | 10.7 |
| GET | `/rest/clients` | Collection of clients, each with nested products | 10.3 |
| GET | `/rest/clients/{id}` | Single client by UUID, with nested products; 404 if absent | 10.5, 10.6 |

#### Response schemas (Zod / nestjs-zod)

```ts
import { createZodDto } from "nestjs-zod";
import { z } from "nestjs-zod/z";

// Client response (código, razão social, CNPJ) — Req 11.3, 11.5
export const ClientResponseSchema = z.object({
  id: z.string().uuid(),                 // Req 11.3
  codigo: z.string(),                    // Req 11.5
  razaoSocial: z.string(),               // Req 11.5 (maps to front-end `razao`)
  cnpj: z.string(),                      // Req 11.5
  createdAt: z.string().datetime().optional(), // ISO 8601 — Req 11.8
  updatedAt: z.string().datetime().optional(), // ISO 8601 — Req 11.8
  // Nested products as OPTIONAL relation — Req 11.7
  products: z.lazy(() => ProductResponseSchema.array()).optional(),
});

// Product response (name, abbreviation, SAP code, color, group, active) — Req 11.4
export const ProductResponseSchema = z.object({
  id: z.string().uuid(),                 // Req 11.2
  name: z.string(),                      // Req 11.4
  abbreviation: z.string(),              // Req 11.4
  sapCode: z.string(),                   // Req 11.4
  color: z.string(),                     // Req 11.4
  group: z.string(),                     // Req 11.4
  active: z.boolean(),                   // Req 11.4
  createdAt: z.string().datetime().optional(), // ISO 8601 — Req 11.8
  updatedAt: z.string().datetime().optional(), // ISO 8601 — Req 11.8
  // Nested clients as OPTIONAL relation — Req 11.6
  clients: z.lazy(() => ClientResponseSchema.array()).optional(),
});

export class ProductResponseDto extends createZodDto(ProductResponseSchema) {}
export class ClientResponseDto extends createZodDto(ClientResponseSchema) {}
```

The two schemas reference each other through optional nested relations. To avoid
unbounded recursion in the generated contract, each top-level resource nests the *other*
resource one level deep and omits the back-reference (a product's nested clients do not
re-nest their products). This mirrors `mw-nave`'s shallow nested-relation convention.

#### Example request/response shapes

`GET /rest/products` →

```json
[
  {
    "id": "e9204631-a012-4340-a07c-d2ceae2a4e8c",
    "name": "ÓLEO DIESEL A S10",
    "abbreviation": "AS-10",
    "sapCode": "10460",
    "color": "#a18a9f",
    "group": "Diesel",
    "active": true,
    "createdAt": "2026-01-15T12:00:00.000Z",
    "updatedAt": "2026-01-15T12:00:00.000Z",
    "clients": [
      {
        "id": "7c3f9b22-1d4e-4a8b-9f10-2a6b5c8d4e01",
        "codigo": "CLI-001",
        "razaoSocial": "Rio Negro Combustíveis LTDA",
        "cnpj": "12.345.678/0001-90"
      }
    ]
  }
]
```

`GET /rest/clients` →

```json
[
  {
    "id": "7c3f9b22-1d4e-4a8b-9f10-2a6b5c8d4e01",
    "codigo": "CLI-001",
    "razaoSocial": "Rio Negro Combustíveis LTDA",
    "cnpj": "12.345.678/0001-90",
    "products": [
      {
        "id": "e9204631-a012-4340-a07c-d2ceae2a4e8c",
        "name": "ÓLEO DIESEL A S10",
        "abbreviation": "AS-10",
        "sapCode": "10460",
        "color": "#a18a9f",
        "group": "Diesel",
        "active": true
      }
    ]
  }
]
```

`GET /rest/products/{id}` with an unknown UUID → `404 Not Found` (Requirement 10.6),
using the standard `mw-nave` error payload consumed by `AxiosHttpService`
(`{ message, name, status, errors }`).

### Field mapping: Products_API ↔ front-end (Requirement 12)

| Products_API field | Front-end field | Model | Requirement |
| --- | --- | --- | --- |
| `ProductResponse.id` (UUID) | `CatalogProduct.id` (string) | Product | 12.1 |
| `ProductResponse.name` | `CatalogProduct.name` | Product | 12.1 |
| `ProductResponse.abbreviation` | `CatalogProduct.abbreviation` | Product | 12.1 |
| `ProductResponse.sapCode` | `CatalogProduct.sapCode` | Product | 12.1 |
| `ProductResponse.color` | `CatalogProduct.color` | Product | 12.1 |
| `ProductResponse.group` | `CatalogProduct.group` | Product | 12.1 |
| `ProductResponse.active` | `CatalogProduct.active` | Product | 12.1 |
| `ClientResponse.codigo` | `Cliente.codigo` | Client | 12.2 |
| `ClientResponse.razaoSocial` | `Cliente.razao` | Client | 12.2 |
| `ClientResponse.cnpj` | `Cliente.cnpj` | Client | 12.2 |
| `ClientResponse.id` (UUID) | `Cliente.id` (number) via reconciliation map | Client | 12.5 |
| `ProductResponse.clients[]` | `clientsOfProduct(productId)` | Link | 12.3 |
| `ClientResponse.products[]` | `productsOfClient(clientId)` | Link | 12.4 |

### Identifier reconciliation

The front-end `Cliente.id` is a `number`; the contract's client id is a `string` UUID
(Requirement 12.5). The page uses `clientId` only as an opaque key — for row keys
(`` `c-${c.id}` ``), for lookups (`client(id)`), and in `ProductClientLink.clientId`. It
never performs arithmetic on it. Reconciliation strategy, confined entirely to
`ApiProductsDataSource` so the page is untouched:

1. During `load()`, assign each distinct client UUID a stable local numeric surrogate id
   by insertion order, held in a `Map<string /* uuid */, number>` (and its inverse
   `Map<number, string>`).
2. Map every `ClientResponse` to a `Cliente` whose `id` is the surrogate number; build
   the `ProductClientLink.clientId` list from the nested relations using the same map.
3. Because the mapping is a bijection within a loaded snapshot, every synchronous
   accessor (`client`, `productsOfClient`, `productCountOfClient`) behaves exactly as
   with the mock, and the rendered row keys stay stable and unique.
4. The inverse map lets the data source translate a numeric id back to a UUID when
   calling single-item endpoints (`/rest/clients/{uuid}`), should that be needed.

This keeps the surrogate assignment an internal detail: the page continues to treat
`Cliente.id` as an opaque numeric key, satisfying "without requiring changes to the
Products_Page rendering logic" (Requirement 12.5).

### Loading and error handling

Because `ApiProductsDataSource.load()` is async while the mock is synchronous, the page
handles three fetch-boundary states (all inert for the mock, which resolves
immediately):

- **Loading** — while `load()` is pending, render the design-system table/page in a
  loading state; the filter controls may be disabled.
- **Error** — if `load()` rejects (network/HTTP error surfaced as `AppError` by
  `AxiosHttpService`), render an error state and allow retry. A toast via the existing
  `ToastProvider` may surface the message.
- **Empty** — once loaded, the existing empty-state message
  "Nenhum registro encontrado para os filtros aplicados" (Requirement 8.1) continues to
  come from the table's `emptyMessage`; it is a filtered-result state, distinct from the
  not-yet-loaded and error states.
