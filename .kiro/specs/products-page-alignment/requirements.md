# Requirements Document

## Introduction

This feature aligns the Products page of the front-end portal (`frontend-portal-nave`) with the data structure that the `mw-nave` back-end is expected to expose for products and their client relationships. The Products page presents master data (products and clients) through an expandable table that supports two complementary views: "Por produto" (clients nested under each product) and "Por cliente" (products nested under each client). The page offers text search, group and status filters, and view switching.

The scope of this effort is documentation and front-end alignment only. The `mw-nave` back-end does not yet implement a products module (only `animal` and `vaccine` modules exist). Therefore this document captures two distinct concerns:

1. **Front-end behavior**: how the Products page should behave, render the two views, filter data, display counts, and handle empty states, while abstracting its data source so a mock implementation can be replaced by a real API client without changing the page component.
2. **Expected API contract**: the endpoints and response shapes the `mw-nave` products back-end is expected to implement so the front-end can consume products-with-clients and clients-with-products. This contract aligns with existing `mw-nave` conventions (`/rest` routes, UUID identifiers, Zod/OpenAPI DTOs, and nested related resources). The back-end implementation itself is out of scope for this feature.

The deliverable is a documented front-end plus the expected API contract that the front-end depends on.

## Glossary

- **Products_Page**: The front-end page component (`ProductsPage.tsx`) that renders the products catalog and client relationships in the portal.
- **Products_Data_Source**: The abstraction (interface/service) that supplies products, clients, and their N:N relationships to the Products_Page. Has a mock implementation and an intended real-API implementation.
- **Mock_Products_Data_Source**: The current in-memory implementation of the Products_Data_Source backed by fixed seed data.
- **Api_Products_Data_Source**: The intended implementation of the Products_Data_Source that consumes the Products_API over HTTP.
- **Products_API**: The expected `mw-nave` back-end REST interface that serves product and client relationship data. Not yet implemented; this document specifies its expected contract.
- **Product**: A catalog product (master data) with identity, grouping, color, and active status. Front-end shape is `CatalogProduct` (id, name, abbreviation, sapCode, color, group, active).
- **Client**: A customer (master data) linked to products. Front-end shape is `Cliente` (id, codigo, razao, cnpj).
- **Product_Client_Link**: An N:N association between a Product and a Client.
- **Product_View**: The "Por produto" view where each parent row is a Product and its child rows are the linked Clients.
- **Client_View**: The "Por cliente" view where each parent row is a Client and its child rows are the linked Products.
- **Active_View**: The view currently selected by the user (either Product_View or Client_View).
- **Search_Term**: The text entered by the user in the search Input, trimmed and compared case-insensitively.
- **Group_Filter**: The selected product group value, or "all" meaning no group restriction.
- **Status_Filter**: The selected product status value, one of "all", "active", or "inactive".
- **Parent_Row**: A top-level expandable row in the table (a Product in Product_View, a Client in Client_View).
- **Child_Row**: A nested row shown when a Parent_Row is expanded.
- **Link_Count**: The number of child entities associated with a Parent_Row (client count for a product, product count for a client).

## Requirements

### Requirement 1: View selection and switching

**User Story:** As a portal user, I want to switch between a product-centric and a client-centric view, so that I can explore product-client relationships from either direction.

#### Acceptance Criteria

1. WHEN the Products_Page is first rendered, THE Products_Page SHALL set the Active_View to Product_View.
2. WHEN the user selects the "Por produto" control, THE Products_Page SHALL set the Active_View to Product_View.
3. WHEN the user selects the "Por cliente" control, THE Products_Page SHALL set the Active_View to Client_View.
4. WHILE the Active_View is Product_View, THE Products_Page SHALL render each Product as a Parent_Row and each linked Client as a Child_Row.
5. WHILE the Active_View is Client_View, THE Products_Page SHALL render each Client as a Parent_Row and each linked Product as a Child_Row.
6. WHEN the Active_View changes, THE Products_Page SHALL visually indicate which view control is currently selected.

### Requirement 2: Expandable parent/child table structure

**User Story:** As a portal user, I want to expand a row to reveal its related records, so that I can see the nested relationships without leaving the page.

#### Acceptance Criteria

1. WHERE a Parent_Row has at least one Child_Row, THE Products_Page SHALL render an expand affordance on that Parent_Row.
2. WHERE a Parent_Row has no Child_Row, THE Products_Page SHALL render that Parent_Row without an expand affordance.
3. WHEN the user expands a Parent_Row, THE Products_Page SHALL display the Child_Rows associated with that Parent_Row.
4. WHILE the Active_View is Product_View, THE Products_Page SHALL render each Product Parent_Row with its name, abbreviation, SAP code, group, and active status.
5. WHILE the Active_View is Product_View, THE Products_Page SHALL render each Client Child_Row with the client razão, CNPJ, and código.
6. WHILE the Active_View is Client_View, THE Products_Page SHALL render each Client Parent_Row with the client razão, CNPJ, and código.
7. WHILE the Active_View is Client_View, THE Products_Page SHALL render each Product Child_Row with its name, abbreviation, SAP code, group, and active status.
8. THE Products_Page SHALL provide a control to expand all Parent_Rows at once.

### Requirement 3: Text search

**User Story:** As a portal user, I want to search by text, so that I can quickly locate a product or client.

#### Acceptance Criteria

1. THE Products_Page SHALL compare the Search_Term case-insensitively after trimming leading and trailing whitespace.
2. WHILE the Active_View is Product_View AND the Search_Term is non-empty, THE Products_Page SHALL retain a Product Parent_Row WHERE the Product name, abbreviation, or SAP code contains the Search_Term.
3. WHILE the Active_View is Client_View AND the Search_Term is non-empty, THE Products_Page SHALL retain a Client Parent_Row WHERE the client razão, CNPJ, or código contains the Search_Term, including all Products linked to that Client that satisfy the Group_Filter and Status_Filter.
4. WHILE the Active_View is Client_View AND the Search_Term is non-empty AND the Client does not match the Search_Term, THE Products_Page SHALL retain the Client Parent_Row only WHERE at least one linked Product satisfies the Search_Term together with the Group_Filter and Status_Filter.
5. WHEN the Search_Term is empty, THE Products_Page SHALL apply no text restriction to the displayed rows.

### Requirement 4: Group filter

**User Story:** As a portal user, I want to filter products by group, so that I can focus on a product category.

#### Acceptance Criteria

1. THE Products_Page SHALL derive the available group options from the distinct group values of the Products plus an "all" option.
2. WHILE the Active_View is Product_View, THE Products_Page SHALL display the Group_Filter control.
3. WHILE the Active_View is Client_View, THE Products_Page SHALL hide the Group_Filter control.
4. WHERE the Group_Filter is set to a specific group, THE Products_Page SHALL retain only Products whose group equals the selected group.
5. WHERE the Group_Filter is set to "all", THE Products_Page SHALL apply no group restriction to the Products.

### Requirement 5: Status filter

**User Story:** As a portal user, I want to filter products by active status, so that I can review only active or only inactive products.

#### Acceptance Criteria

1. THE Products_Page SHALL provide Status_Filter options of "all", "active", and "inactive".
2. WHERE the Status_Filter is set to "active", THE Products_Page SHALL retain only Products whose active status is true.
3. WHERE the Status_Filter is set to "inactive", THE Products_Page SHALL retain only Products whose active status is false.
4. WHERE the Status_Filter is set to "all", THE Products_Page SHALL apply no status restriction to the Products.
5. WHILE the Active_View is Product_View, THE Products_Page SHALL display the active status of each Product Parent_Row as a status indicator labeled "Ativo" or "Inativo".
6. WHILE the Active_View is Client_View, THE Products_Page SHALL display the active status of each Product Child_Row as a status indicator labeled "Ativo" or "Inativo".

### Requirement 6: Clearing filters

**User Story:** As a portal user, I want to clear all filters at once, so that I can return to the full listing quickly.

#### Acceptance Criteria

1. WHERE the Search_Term is non-empty OR the Group_Filter is not "all" OR the Status_Filter is not "all", THE Products_Page SHALL display the clear-filters control.
2. WHERE the Search_Term is empty AND the Group_Filter is "all" AND the Status_Filter is "all", THE Products_Page SHALL hide the clear-filters control.
3. WHEN the user activates the clear-filters control, THE Products_Page SHALL reset the Search_Term to empty, the Group_Filter to "all", and the Status_Filter to "all".

### Requirement 7: Link counts

**User Story:** As a portal user, I want to see how many related records each row has, so that I can gauge the breadth of each relationship at a glance.

#### Acceptance Criteria

1. WHILE the Active_View is Product_View, THE Products_Page SHALL display on each Product Parent_Row the Link_Count of linked Clients labeled as "cliente(s)".
2. WHILE the Active_View is Client_View, THE Products_Page SHALL display on each Client Parent_Row the Link_Count of linked Products that satisfy the active filters, labeled as "produto(s)".

### Requirement 8: Empty states

**User Story:** As a portal user, I want clear feedback when no records match, so that I understand the result is empty rather than broken.

#### Acceptance Criteria

1. IF no Parent_Row matches the active filters, THEN THE Products_Page SHALL display the message "Nenhum registro encontrado para os filtros aplicados".
2. WHILE the Active_View is Client_View, IF a Client has no linked Product that satisfies the active filters, THEN THE Products_Page SHALL exclude that Client from the displayed rows.

### Requirement 9: Data source abstraction

**User Story:** As a developer, I want the Products page to depend on a data-source abstraction, so that the mock data can be replaced with the real API without changing the page component.

#### Acceptance Criteria

1. THE Products_Page SHALL obtain its data exclusively through the Products_Data_Source resolved from the IoC container.
2. THE Products_Data_Source SHALL expose the list of Products, the list of Clients, the Clients linked to a given Product, the Products linked to a given Client, the client Link_Count of a given Product, and the product Link_Count of a given Client.
3. THE Mock_Products_Data_Source SHALL implement the Products_Data_Source interface using in-memory seed data.
4. WHERE the Api_Products_Data_Source is registered in place of the Mock_Products_Data_Source, THE Products_Page SHALL render without modification to the page component.
5. THE Api_Products_Data_Source SHALL depend on the core HTTP service obtained from the IoC container to call the Products_API.

### Requirement 10: Expected Products_API endpoints

**User Story:** As a front-end developer, I want a documented API contract for products and client relationships, so that the mw-nave back-end can implement it and the front-end can consume it consistently.

#### Acceptance Criteria

1. THE Products_API SHALL expose endpoints under the `/rest` route prefix, consistent with existing mw-nave controllers.
2. THE Products_API SHALL provide an endpoint that returns the collection of Products, each Product including its linked Clients.
3. THE Products_API SHALL provide an endpoint that returns the collection of Clients, each Client including its linked Products.
4. THE Products_API SHALL provide an endpoint that returns a single Product identified by a UUID, including its linked Clients.
5. THE Products_API SHALL provide an endpoint that returns a single Client identified by a UUID, including its linked Products.
6. WHERE a requested Product or Client identifier does not exist, THE Products_API SHALL respond with a not-found error status.
7. THE Products_API SHALL support a product search parameter that filters Products by a text term, consistent with the existing mw-nave search convention (for example `/rest/products/search?name=`).

### Requirement 11: Expected Products_API response shapes

**User Story:** As a front-end developer, I want well-defined response shapes for the products contract, so that the generated client types map cleanly to the front-end data-source abstraction.

#### Acceptance Criteria

1. THE Products_API SHALL define response shapes using Zod schemas exposed through nestjs-zod DTOs and published in the OpenAPI contract, consistent with existing mw-nave DTOs.
2. THE Products_API SHALL represent each Product identifier as a UUID.
3. THE Products_API SHALL represent each Client identifier as a UUID.
4. THE Products_API SHALL include in each Product response the fields name, abbreviation, SAP code, color, group, and active status.
5. THE Products_API SHALL include in each Client response the fields código, razão social, and CNPJ.
6. THE Products_API product response SHALL include an array of linked Client responses as an optional nested relation, consistent with the mw-nave pattern of nesting related resources.
7. THE Products_API client response SHALL include an array of linked Product responses as an optional nested relation.
8. THE Products_API SHALL represent timestamp fields, where present, as ISO 8601 datetime strings.

### Requirement 12: Alignment between the front-end model and the contract

**User Story:** As a developer, I want the front-end product and client models to map cleanly to the API contract, so that adopting the real API requires no reshaping of page logic.

#### Acceptance Criteria

1. THE Api_Products_Data_Source SHALL map each Products_API Product response field to the corresponding front-end Product field (name, abbreviation, SAP code, color, group, active).
2. THE Api_Products_Data_Source SHALL map each Products_API Client response field to the corresponding front-end Client field (código, razão, CNPJ).
3. THE Api_Products_Data_Source SHALL derive the Clients linked to a Product from the nested client relation of the Product response.
4. THE Api_Products_Data_Source SHALL derive the Products linked to a Client from the nested product relation of the Client response.
5. WHERE the Products_API represents a Client identifier as a UUID AND the front-end Client model currently represents the identifier as a number, THE Api_Products_Data_Source SHALL reconcile the identifier representation without requiring changes to the Products_Page rendering logic.
