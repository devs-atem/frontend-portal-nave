# Requirements Document

## Introduction

This feature moves the existing client registration (Cadastro de clientes) functionality into the Administração (Admin) page as a new tab, and removes its standalone navigation. Today the client registration lives in its own module (`src/features/client-registration/`) with a dedicated sidebar menu item ("Cadastro de clientes") and a dedicated route (`/registrations/clients`) guarded by the permission `portal_nave:client_registry:read`.

After this change:

- Client registration CRUD appears as a new tab inside the Admin page (`/admin`), alongside the existing tabs (Usuários e perfis, Pátios e janelas, Produtos, Tanques, Tolerâncias e parâmetros, Log de auditoria).
- The standalone sidebar menu item and the `/registrations/clients` route are removed, so the only way to reach client registration is through the Admin tab.
- All existing CRUD behavior (list, create, edit, remove) and field validation (CNPJ mask + 14-digit check, required Nome, required BPID, Situação status) are preserved.
- The `clientRegistration` IoC service registration is preserved so the tab keeps resolving it via `useIoC("clientRegistration")`.
- Access remains admin-only, now gated at the Admin page/route level.

The functionality is a mock in-memory CRUD (no backend integration is in scope). This is a front-end reorganization of existing capabilities within a React 19 + Vite + TypeScript modular feature architecture using `iti` IoC and the `@devs-atem/design-system` component library.

## Glossary

- **Admin_Page**: The React page component at `src/features/admin/pages/AdminPage.tsx` rendered at route `/admin`, titled "Administração", which hosts the section tabs using the `CustomTabs` design-system component.
- **Admin_Module**: The module manifest at `src/features/admin/module.tsx` that declares the `/admin` route and the "Administração" sidebar menu item.
- **Client_Registration_Module**: The module manifest at `src/features/client-registration/module.tsx` that currently declares the standalone route, the standalone menu item, and the `clientRegistration` IoC service registration.
- **Client_Registration_Tab**: The new tab inside the Admin_Page that renders the client registration CRUD user interface.
- **Client_Registration_Service**: The in-memory CRUD service class `ClientRegistrationService` (`src/features/client-registration/services/ClientRegistrationService.ts`), registered in the IoC container under the key `clientRegistration`, exposing `list`, `create`, `update`, and `remove`.
- **Client_Record**: A client data object of shape `{ id: string, cnpj: string, name: string, bpid: string, active: boolean }`.
- **CNPJ**: The Brazilian company tax identifier, displayed with the mask `00.000.000/0000-00` and consisting of exactly 14 numeric digits.
- **BPID**: Business Partner ID, the client identifier in the SAP/ERP system.
- **Situação**: The client status field, displayed as "Ativo" when `active` is true and "Inativo" when `active` is false.
- **Route_Guard**: The `RouteGuard` component (`src/core/router/RouteGuard.tsx`) that blocks route rendering based on permission rules and/or feature flags, redirecting to `/access-denied` on failure, and bypassing all checks when `auth.adminMode` is true.
- **Admin_Role**: A role listed in the `VITE_AUTH_ADMIN_ROLES` environment variable. A user holding an Admin_Role has `auth.adminMode` true and bypasses all permission checks.
- **Client_Registry_Permission**: The RBAC permission string `portal_nave:client_registry:read`.
- **Module_Discovery**: The automatic module loading mechanism that collects every `src/features/*/module.tsx` via `import.meta.glob`.
- **Sidebar_Menu**: The application navigation menu built from the `menu` entries of discovered modules.

## Requirements

### Requirement 1: Client registration available as an Admin tab

**User Story:** As an administrator, I want client registration to appear as a tab within the Administração page, so that I manage clients in the same place as other administrative data.

#### Acceptance Criteria

1. THE Admin_Page SHALL render the Client_Registration_Tab within the existing `CustomTabs` component as the seventh tab, positioned immediately after the "Log de auditoria" tab, so that the left-to-right tab order is "Usuários e perfis", "Pátios e janelas", "Produtos", "Tanques", "Tolerâncias e parâmetros", "Log de auditoria", then the Client_Registration_Tab.
2. THE Client_Registration_Tab SHALL display a tab label of exactly "Cadastro de clientes".
3. WHEN the administrator selects the Client_Registration_Tab, THE Admin_Page SHALL display the client registration user interface in the Client_Registration_Tab panel and SHALL hide the panels of all other tabs.
4. THE Admin_Page SHALL preserve the six existing tabs and their content, keeping them in the left-to-right order "Usuários e perfis", "Pátios e janelas", "Produtos", "Tanques", "Tolerâncias e parâmetros", "Log de auditoria", without removing, renaming, or reordering any of them.
5. WHEN the Admin_Page is first loaded, THE Admin_Page SHALL display the "Usuários e perfis" tab as the active tab with only its panel visible.

### Requirement 2: Preserve client listing

**User Story:** As an administrator, I want to see the list of registered clients in the tab, so that I can review existing clients.

#### Acceptance Criteria

1. WHEN the Client_Registration_Tab panel becomes active, THE Client_Registration_Tab SHALL retrieve the client list from the Client_Registration_Service via `list`.
2. WHEN the Client_Registration_Service `list` returns one or more Client_Records, THE Client_Registration_Tab SHALL display each Client_Record in a table with exactly four columns in left-to-right order: Nome, CNPJ, BPID, and Situação.
3. THE Client_Registration_Tab SHALL display the CNPJ column value with the mask `00.000.000/0000-00`.
4. WHERE a Client_Record has `active` equal to true, THE Client_Registration_Tab SHALL display the Situação as "Ativo".
5. WHERE a Client_Record has `active` equal to false, THE Client_Registration_Tab SHALL display the Situação as "Inativo".
6. IF the Client_Registration_Service `list` returns an empty list, THEN THE Client_Registration_Tab SHALL display the message "Nenhum cliente cadastrado" and no data rows.
7. IF the Client_Registration_Service `list` fails, THEN THE Client_Registration_Tab SHALL display an error notification indicating the client list could not be loaded and SHALL display no data rows.

### Requirement 3: Create a client

**User Story:** As an administrator, I want to create a new client, so that the client becomes available in the portal.

#### Acceptance Criteria

1. WHEN the administrator activates the "Novo cliente" control, THE Client_Registration_Tab SHALL open a modal form with empty CNPJ, Nome, and BPID fields.
2. WHILE the administrator types in the CNPJ field, THE Client_Registration_Tab SHALL apply the CNPJ mask `00.000.000/0000-00` and accept a maximum of 14 numeric digits, ignoring any further typed characters.
3. WHEN the administrator submits the create form with all fields satisfying the validation rules in Requirement 6, THE Client_Registration_Tab SHALL call the Client_Registration_Service `create` with the entered CNPJ, Nome, and BPID values.
4. WHEN the Client_Registration_Service `create` completes successfully, THE Client_Registration_Tab SHALL close the modal, refresh the displayed list by retrieving it from the Client_Registration_Service `list`, and show the success confirmation "Cliente cadastrado" together as a single coupled outcome.
5. IF the administrator submits the create form while any field violates the validation rules in Requirement 6, THEN THE Client_Registration_Tab SHALL display the field-level error messages and show the error notification "Corrija os campos destacados" without calling the Client_Registration_Service `create`.
6. IF the Client_Registration_Service `create` fails, THEN THE Client_Registration_Tab SHALL keep the modal open, retain the entered field values, and show an error notification indicating the client was not created.

### Requirement 4: Edit a client

**User Story:** As an administrator, I want to edit an existing client, so that I can correct or update client data.

#### Acceptance Criteria

1. WHEN the administrator activates the "Editar" action on a Client_Record, THE Client_Registration_Tab SHALL open the modal form pre-filled with the selected Client_Record Nome and BPID values and the CNPJ value rendered with the mask `00.000.000/0000-00`.
2. WHILE the administrator types in the CNPJ field of the edit form, THE Client_Registration_Tab SHALL apply the CNPJ mask `00.000.000/0000-00` and accept a maximum of 14 numeric digits, ignoring any further typed characters.
3. WHEN the administrator submits the edit form with all fields satisfying the validation rules in Requirement 6, THE Client_Registration_Tab SHALL call the Client_Registration_Service `update` with the selected Client_Record `id` and the entered CNPJ, Nome, and BPID values.
4. WHEN the Client_Registration_Service `update` completes successfully, THE Client_Registration_Tab SHALL close the modal, refresh the displayed list by retrieving it from the Client_Registration_Service `list`, and show the success confirmation "Cliente atualizado" together as a single coupled outcome.
5. IF the administrator submits the edit form while any field violates the validation rules in Requirement 6, THEN THE Client_Registration_Tab SHALL display the field-level error messages, keep the modal open with the entered values retained, and show the error notification "Corrija os campos destacados" without calling the Client_Registration_Service `update`.

### Requirement 5: Remove a client

**User Story:** As an administrator, I want to remove a client, so that obsolete clients no longer appear in the portal.

#### Acceptance Criteria

1. WHEN the administrator activates the "Remover" action on a Client_Record, THE Client_Registration_Tab SHALL call the Client_Registration_Service `remove` with the selected Client_Record identifier.
2. WHEN the Client_Registration_Service `remove` completes successfully, THE Client_Registration_Tab SHALL refresh the displayed list and show a success confirmation containing the removed Client_Record Nome together as a single coupled outcome.
3. IF the Client_Registration_Service `remove` fails, THEN THE Client_Registration_Tab SHALL retain the selected Client_Record in the displayed list and show an error notification indicating the removal did not complete.

### Requirement 6: Field validation

**User Story:** As an administrator, I want the form to validate my input, so that clients are created with complete and well-formed data.

#### Acceptance Criteria

1. IF the CNPJ field contains zero numeric digits (after mask characters are removed) on submission, THEN THE Client_Registration_Tab SHALL display, adjacent to the CNPJ field, the validation message "Informe o CNPJ.".
2. IF the CNPJ field contains one or more numeric digits but a total number of digits other than 14 on submission, THEN THE Client_Registration_Tab SHALL display, adjacent to the CNPJ field, the validation message "CNPJ deve ter 14 dígitos.".
3. IF the CNPJ field contains zero numeric digits on submission, THEN THE Client_Registration_Tab SHALL display only the message "Informe o CNPJ." for the CNPJ field and SHALL suppress the message "CNPJ deve ter 14 dígitos.".
4. IF the Nome field is empty or contains only whitespace on submission, THEN THE Client_Registration_Tab SHALL display, adjacent to the Nome field, the validation message "Informe o nome do cliente.".
5. IF the BPID field is empty or contains only whitespace on submission, THEN THE Client_Registration_Tab SHALL display, adjacent to the BPID field, the validation message "Informe o BPID.".
6. WHEN the administrator changes the value of a field that currently displays a validation error, THE Client_Registration_Tab SHALL clear the validation error for that field only, leaving any validation errors on other fields unchanged.

### Requirement 7: Remove standalone navigation

**User Story:** As an administrator, I want client registration reachable only through the Admin tab, so that navigation is consolidated and not duplicated.

#### Acceptance Criteria

1. WHEN Module_Discovery completes, THE Sidebar_Menu SHALL NOT display a "Cadastro de clientes" menu item nor any link targeting `/registrations/clients`.
2. THE application router SHALL NOT register the route `/registrations/clients`.
3. WHEN a user navigates to the path `/registrations/clients`, THE application SHALL render a not-found indication and SHALL NOT render the client registration list table, the create/edit modal, or the "Novo cliente" control.
4. THE application SHALL expose the client registration user interface only within the Client_Registration_Tab, reachable solely via the `/admin` route.

### Requirement 8: Preserve IoC service registration

**User Story:** As a developer, I want the client registration service to remain registered in the IoC container, so that the Admin tab keeps resolving it after the standalone module is removed.

#### Acceptance Criteria

1. WHEN Module_Discovery completes and before the first render, THE application SHALL have registered the Client_Registration_Service in the IoC container under the key `clientRegistration`, exposing the `list`, `create`, `update`, and `remove` operations.
2. WHEN the Client_Registration_Tab calls `useIoC("clientRegistration")`, THE IoC container SHALL return a non-null Client_Registration_Service instance.
3. WHEN the Client_Registration_Tab calls `useIoC("clientRegistration")` more than once within the same application session, THE IoC container SHALL return the same Client_Registration_Service instance on every call.
4. THE application SHALL retain the `clientRegistration` service type declaration so that `useIoC("clientRegistration")` is typed as Client_Registration_Service and the project compiles under TypeScript without type errors for that call.
5. IF `useIoC("clientRegistration")` is called while no service is registered under the key `clientRegistration`, THEN THE IoC container SHALL raise a resolution error identifying the unregistered key instead of returning an undefined value.

### Requirement 9: Admin-only access control

**User Story:** As a security owner, I want client registration gated to administrators, so that only authorized users manage client master data.

#### Acceptance Criteria

1. WHILE a user holds an Admin_Role, THE application SHALL grant access to the Admin_Page and the Client_Registration_Tab without evaluating the Client_Registry_Permission.
2. THE Admin_Module route `/admin` SHALL be wrapped in a Route_Guard that enforces the Client_Registry_Permission.
3. WHEN a user without an Admin_Role but holding the Client_Registry_Permission navigates to `/admin`, THE Route_Guard SHALL render the Admin_Page including the Client_Registration_Tab.
4. IF a user without an Admin_Role and without the Client_Registry_Permission navigates to `/admin`, THEN THE Route_Guard SHALL redirect the user to `/access-denied` without rendering any Admin_Page content.
5. WHERE a user holds an Admin_Role or the Client_Registry_Permission, THE Admin_Module menu item "Administração" SHALL be visible in the Sidebar_Menu.
6. IF a user holds neither an Admin_Role nor the Client_Registry_Permission, THEN THE Sidebar_Menu SHALL NOT display the Admin_Module menu item "Administração".
