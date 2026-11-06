# Requirements Document

## Introduction

This feature wires the existing RBAC authorization engine of the front-end portal
(`frontend-portal-nave`) into every feature module of the Portal da Nave. The
authorization primitives already exist and are unit-tested — `RouteGuard`,
`useMenuItems`, `generatePermissionMatcher`, and the optional `permission` field on the
module contract — but the goal of this effort is to guarantee, and keep documented, that
each module/route references the correct `portal_nave` permission so the sidebar is
filtered and the routes are protected.

The permissions themselves live in the external RBAC console under the product
`portal_nave` (IDs of the form `portal_nave:<module>:<action>`, action being `read` or
`write`). Cadastro and attribution of those permissions in the RBAC console are a
back-end/operations concern and are out of scope for the front-end. What is in scope is
the binding on the front-end: declaring `permission` on each menu item and wrapping each
sensitive route in `<RouteGuard>` with the matching matcher, so that the strings in the
code match the IDs registered in the RBAC exactly.

The deliverable is a front-end where every Portal da Nave module is bound to its RBAC
permission, the admin role keeps full access, menu groups collapse when they have no
visible children, and the reference document (`docs/rbac-portal-nave.md`) stays aligned
with the permission IDs actually used by the code.

## Glossary

- **RBAC**: The external role-based access control system that stores permissions and
  assigns them to users. The front-end consumes the user's granted permissions from the
  authenticated token.
- **Permission_Id**: A permission string of the form `portal_nave:<module>:<action>`,
  where `<action>` is `read` or `write`. Comparison against granted permissions is exact
  (after wildcard expansion).
- **Product_Scope**: The RBAC product `portal_nave` that groups every Permission_Id of
  the Portal da Nave.
- **Granted_Permissions**: The list of Permission_Ids the current user holds, read from
  `auth.permissionSet.SYSTEM_MODULES`.
- **Admin_Mode**: The condition in which the authenticated user holds a role listed in
  `VITE_AUTH_ADMIN_ROLES` (e.g. `admin`), exposed as `auth.adminMode`. Admin_Mode
  bypasses all permission and flag filters.
- **Module**: A self-contained feature living in `src/features/<name>/module.tsx`,
  satisfying the `Module` contract (routes, optional menu, optional services).
- **Menu_Item**: A sidebar entry declared on a Module (`menu`) or on one of its
  `children`, optionally carrying a `permission` and/or `flag`.
- **Menu_Group**: A Menu_Item that has `children` and typically no own `permission`; it
  is shown only if at least one child is visible.
- **Route_Guard**: The `RouteGuard` component that blocks rendering of a route element
  based on a permission matcher and/or feature flag, redirecting to `/access-denied`
  when access is denied.
- **Permission_Matcher**: The predicate built by `generatePermissionMatcher(id)` that
  tests a granted permission against an expected Permission_Id, expanding a `*` wildcard
  into `read`/`write`.
- **Write_Route**: A route that performs create/edit actions and requires a `:write`
  Permission_Id (e.g. `/veiculos/novo-agendamento`).
- **Access_Denied_Route**: The `/access-denied` route a user is redirected to when a
  Route_Guard denies access.
- **Feature_Flag**: An optional Flagsmith flag (`menu.flag` / `RouteGuard flag`) that is
  independent of RBAC and must not be confused with a permission.

## Requirements

### Requirement 1: Permission binding on menu items

**User Story:** As a portal user, I want the sidebar to show only the items I am allowed
to use, so that I am not offered screens I cannot access.

#### Acceptance Criteria

1. THE Menu_Item of each Module SHALL declare the Permission_Id that governs its access,
   except for Menu_Groups and the profile entry.
2. WHERE a Menu_Item has `children`, THE Module SHALL declare the Permission_Id on each
   child Menu_Item rather than on the group.
3. WHILE Admin_Mode is false AND a Menu_Item declares a Permission_Id that is not present
   in Granted_Permissions, THE sidebar SHALL omit that Menu_Item.
4. WHILE Admin_Mode is false AND a Menu_Item declares a Permission_Id that is present in
   Granted_Permissions, THE sidebar SHALL display that Menu_Item.
5. THE Permission_Id declared on a Menu_Item SHALL be identical to the Permission_Id
   enforced by the Route_Guard of the corresponding route.

### Requirement 2: Route protection with RouteGuard

**User Story:** As a security owner, I want sensitive routes to be protected, so that a
user cannot reach a screen by typing its URL directly.

#### Acceptance Criteria

1. THE Module SHALL wrap each sensitive route element in a Route_Guard configured with
   the Permission_Matcher for that route's Permission_Id.
2. WHILE Admin_Mode is false AND the Granted_Permissions do not satisfy the route's
   Permission_Matcher, THE Route_Guard SHALL redirect to the Access_Denied_Route.
3. WHILE Admin_Mode is false AND the Granted_Permissions satisfy the route's
   Permission_Matcher, THE Route_Guard SHALL render the route element.
4. WHERE a route is a Write_Route, THE Route_Guard SHALL require a `:write` Permission_Id
   (either the `:write` key directly or a `*` matcher together with `requireWrite`).
5. THE profile route (`/perfil`) SHALL remain without a Route_Guard and accessible to any
   authenticated user.

### Requirement 3: Admin full access

**User Story:** As an administrator, I want full access regardless of individual
permissions, so that I can operate the portal without per-permission grants.

#### Acceptance Criteria

1. WHILE Admin_Mode is true, THE sidebar SHALL display every Menu_Item regardless of its
   Permission_Id.
2. WHILE Admin_Mode is true, THE Route_Guard SHALL render every route element regardless
   of the Granted_Permissions.
3. THE Admin_Mode access SHALL be granted solely by holding a role in
   `VITE_AUTH_ADMIN_ROLES` and SHALL NOT require any individual Permission_Id.

### Requirement 4: Menu group collapsing

**User Story:** As a portal user, I want empty menu groups to disappear, so that the
sidebar does not show categories I cannot enter.

#### Acceptance Criteria

1. WHILE Admin_Mode is false AND a Menu_Group has no child Menu_Item visible under the
   current Granted_Permissions, THE sidebar SHALL omit that Menu_Group.
2. WHILE Admin_Mode is false AND a Menu_Group has at least one visible child Menu_Item,
   THE sidebar SHALL display that Menu_Group with only its visible children.
3. THE Menu_Group SHALL NOT require a Permission_Id of its own.

### Requirement 5: Exact permission identifiers

**User Story:** As a developer, I want the permission strings in the code to match the
RBAC IDs exactly, so that a user granted a permission actually sees the corresponding
screen.

#### Acceptance Criteria

1. THE Permission_Id strings referenced in the code SHALL match the IDs registered in the
   RBAC Product_Scope `portal_nave` character-for-character.
2. THE Permission_Matcher SHALL treat comparison as exact, expanding only a `*` wildcard
   into `read`/`write`.
3. WHERE a Permission_Id in the code diverges from the registered RBAC ID, THE binding
   SHALL be treated as broken and corrected in the code (not papered over in the RBAC).
4. THE set of Permission_Ids referenced by the code SHALL be the authoritative list that
   `docs/rbac-portal-nave.md` documents.

### Requirement 6: Documentation alignment

**User Story:** As a maintainer, I want the RBAC reference document to reflect the
permissions actually enforced, so that whoever registers permissions in the RBAC has an
accurate list.

#### Acceptance Criteria

1. THE `docs/rbac-portal-nave.md` document SHALL list every Permission_Id enforced by the
   code under the Product_Scope `portal_nave`.
2. THE `docs/rbac-portal-nave.md` menu→route→permission map SHALL include one row per
   bound route, including the Produtos route (`/products` →
   `portal_nave:products:read`).
3. WHERE a Permission_Id is reserved (registered but not yet backing any screen), THE
   document SHALL mark it as reserved and SHALL NOT imply it changes the menu today.
4. WHERE the code adds, removes, or renames a Permission_Id, THE document SHALL be updated
   in the same change so the two stay aligned.

### Requirement 7: Feature flags independent of RBAC

**User Story:** As a developer, I want feature flags to remain separate from permissions,
so that toggling a flag does not get mistaken for granting access.

#### Acceptance Criteria

1. THE Feature_Flag of a Menu_Item or Route_Guard SHALL be evaluated independently of the
   Permission_Id.
2. WHILE Admin_Mode is true, THE Feature_Flag and Permission_Id filters SHALL both be
   bypassed.
3. WHERE the Flagsmith integration is disabled via configuration, THE Feature_Flag SHALL
   be treated as enabled and SHALL NOT affect permission evaluation.

### Requirement 8: Rollout safety

**User Story:** As a release owner, I want the RBAC binding to be enabled only after the
permissions exist in the RBAC, so that users and developers are not locked out.

#### Acceptance Criteria

1. THE RBAC binding SHALL be activated only after the Product_Scope `portal_nave`
   permissions are registered and assigned to the test profiles.
2. IF the permissions are not yet registered and assigned, THEN enabling the binding
   SHALL be understood to risk locking users out of the bound screens.
3. THE validation SHALL confirm that a non-admin user without a permission neither sees
   the Menu_Item nor can reach the route by direct URL, while the same user with the
   permission granted sees the item and reaches the route.
