# UX design notes — Cluster add-on operators

## Catalog publish (Provider Admin)

When creating a **Cluster as a Service** catalog item, Provider Admin can attach platform operators on the **Add-on operators** step.

### Tenant access (step-level)

Same **Locked / Editable** cards as Cluster version and Node topology:

| Mode | Behavior |
| --- | --- |
| **Locked** (default) | Selected operators are fixed for every order. Tenants cannot deselect them or add extras at launch. Per-operator Mandatory / Optional Default is hidden; selections are stored as mandatory. |
| **Editable** | Tenants may add operators at launch. Per-operator **Mandatory** / **Optional Default** controls what they can remove from the template set. |

- Selecting NVIDIA GPU Operator auto-bundles Node Feature Discovery.
- Category filter precedes search on the catalog step.

## Cluster launch (Tenant User)

### Stepper

`General` → `Cluster version` → `Node topology` → `Networking` → **`Add-on operators`** → `Review`

### Pre-configured banner (General)

Fifth card: **Add-on operators** — e.g. `2 Pre-configured` with short names `(NVIDIA GPU, NFD)`.

### Add-on operators step

1. **Included operators** — operators from the catalog item.
2. **Additional Available Operators** — only when catalog access is **Editable**. Searchable catalog of optional operators (Service Mesh, ACM, KServe, and any catalog operators not already bundled).

### Interaction & validation

| Rule | Behavior |
| --- | --- |
| **Catalog Locked** | All included operators behave as locked (disabled checkbox + padlock). **Additional Available Operators** is hidden — tenants cannot add extras. |
| **Locked operator protection** | Mandatory template operators use a disabled checkbox plus padlock + tooltip: *Included by catalog template. Cannot be deselected.* Badge: **Locked by Catalog Item** (or **Required Dependency** when auto-bundled for another template operator). |
| **Optional Default** | Only when catalog access is Editable. Tenants may unselect. |
| **Dynamic dependency tree** | Selecting an optional operator (e.g. KServe) auto-checks dependencies (e.g. Service Mesh), indents them, and labels **Auto-included dependency**. |
| **OpenShift compatibility** | Operators that do not support the version from Cluster version are disabled with an inline warning badge (e.g. `Needs OpenShift 4.18 or earlier` with **Change cluster version**). |
| **Resolved operator version** | Card version is derived from the selected cluster version (platform-aligned operators track the OCP minor; independent operators show the channel release for that minor). Not a separate version picker. |

### Review summary

- **Template operators** — names from the catalog template (minus deselected optional-defaults when Editable).
- **User added operators** — only when Editable; names chosen in Additional Available Operators.
- Note: *Operators will be deployed and verified during cluster initialization.*
