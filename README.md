# MDI Data Explorer

A SAPUI5 TypeScript application for dynamically browsing and exploring **SAP Master Data Integration (MDI)** objects. It authenticates against Cloud Foundry, discovers MDI service instances, and renders log data for any configured object type — all without requiring view changes when new objects are added.

## Table of Contents

- [How It Works](#how-it-works)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [Adding a New MDI Object Type](#adding-a-new-mdi-object-type)
- [Configuring Existing Object Types](#configuring-existing-object-types)
- [Development](#development)
- [Build](#build)

---

## How It Works

The app follows a **configuration-driven rendering** pattern. Each MDI object type (e.g. Cost Center, Company Code) is described by a plain TypeScript config object that defines:

- The MDI log API endpoint path
- Which columns to show in the list table (with their data paths)
- Which fields and sections to show in the detail dialog

The `DataExplorer` controller reads the active config at runtime and builds the table columns, row templates, and detail form **programmatically** — there are no per-object views. Adding a new object type requires no changes to any controller or view.

```
webapp/
├── config/
│   ├── types.ts                  ← TypeScript interfaces for configs
│   ├── MdiObjectRegistry.ts      ← Central registry (add new types here)
│   ├── CostCenterConfig.ts       ← Config for sap.odm.finance.costobject.CostCenter
│   ├── CompanyCodeConfig.ts      ← Config for sap.odm.orgunit.CompanyCode
│   └── BankConfig.ts             ← Config for sap.odm.finance.bank.Bank
├── model/
│   ├── AuthService.ts            ← CF OAuth + UAA client_credentials auth
│   ├── CfApiService.ts           ← CF API (service instances, bindings, credentials)
│   └── MdiApiService.ts          ← MDI log endpoint calls + delta token pagination
├── controller/
│   ├── Login.controller.ts
│   ├── ServiceSelection.controller.ts
│   └── DataExplorer.controller.ts
└── view/ / fragment/             ← Views and dialog fragments
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A BTP account with at least one MDI service instance

### Install dependencies

```sh
npm install
```

### Start the development server

```sh
npm start
```

The app opens at **http://localhost:8080/index.html**.

> **Note:** The dev server includes a CORS proxy at `/proxy/*` that forwards requests to external CF and MDI APIs. This is required for local development — the browser cannot call those APIs directly.

---

## Usage

1. **Login** — Enter your BTP email, password, and select your CF region.
2. **Select Service Instance** — The app lists all MDI service instances in your account. Click one to continue.
3. **Select Service Key** — Pick a service key (credential binding) from the dialog.
4. **Select Object Type** — Choose which MDI object to explore (Cost Center, Company Code, Bank, or any custom type you have added).
5. **Explore** — Browse the log records in the table. Use the search field to filter, click a row to see the full detail, and use **Load More** to fetch the next page via the delta token.

---

## Adding a New MDI Object Type

It takes **three steps** and no view or controller changes.

### Step 1 — Create a config file

Create `webapp/config/MyObjectConfig.ts`:

```typescript
import type { MdiObjectConfig } from "./types";

export const MyObjectConfig: MdiObjectConfig = {
    // Unique key used in the URL route and registry lookup
    key: "MyObject",

    // Label shown in the object type selection dialog
    displayName: "My Object",

    // MDI log API path (version + fully qualified object name)
    apiPath: "/v0/odm/1.0.0/log/sap.odm.mypackage.MyObject",

    // Columns shown in the list table.
    // "path" is a slash-separated path into each log record
    // (e.g. "instance/someField" resolves record.instance.someField)
    listColumns: [
        { path: "instance/id",          label: "ID",          width: "10em" },
        { path: "instance/displayName", label: "Display Name", width: "16em" },
        { path: "event",                label: "Event",        width: "8em"  }
    ],

    // Sections and fields shown in the detail dialog
    detailSections: [
        {
            title: "General Information",
            fields: [
                { path: "instance/id",          label: "ID"           },
                { path: "instance/displayName", label: "Display Name" },
                { path: "event",                label: "Event"        },
                { path: "versionId",            label: "Version ID"   }
            ]
        },
        {
            title: "Details",
            fields: [
                { path: "instance/someBoolean", label: "Is Active",    type: "boolean" },
                { path: "instance/someDate",    label: "Valid From",   type: "date"    },
                { path: "instance/nestedArray", label: "Items",        type: "json"    }
            ]
        }
    ],

    // Used as the detail dialog title. Return any meaningful string from the record.
    titleExtractor: (record) => {
        const inst = record.instance as Record<string, unknown>;
        return (inst?.displayName as string) || (inst?.id as string) || "My Object";
    }
};
```

### Step 2 — Register the config

Open `webapp/config/MdiObjectRegistry.ts` and add two lines:

```typescript
import { MyObjectConfig } from "./MyObjectConfig";   // ← add this import

registry.set(MyObjectConfig.key, MyObjectConfig);    // ← add this line
```

### Step 3 — Done

Restart the dev server (`npm start`). The new object type appears automatically in the selection dialog.

---

## Configuring Existing Object Types

Open the corresponding config file in `webapp/config/` and edit it directly.

### Adding a column to the list table

```typescript
listColumns: [
    { path: "instance/id",           label: "ID",          width: "10em" },
    { path: "instance/displayName",  label: "Display Name", width: "16em" },
    { path: "instance/country/code", label: "Country",      width: "8em"  }, // ← new column
    { path: "event",                 label: "Event",        width: "8em"  }
]
```

### Adding a field to the detail dialog

Add a new entry to any `fields` array inside `detailSections`:

```typescript
{ path: "instance/currency/code", label: "Currency" }
```

Or add a completely new section:

```typescript
{
    title: "Financial Settings",
    fields: [
        { path: "instance/currency/code",    label: "Currency"      },
        { path: "instance/vatRegistrationId", label: "VAT Reg. ID"  }
    ]
}
```

### Field types

| `type`    | Rendered as                              |
|-----------|------------------------------------------|
| *(omit)*  | Plain text (`String(value)`)             |
| `boolean` | Checkbox (read-only)                     |
| `date`    | Plain text (raw date string from API)    |
| `json`    | Pretty-printed JSON (`renderWhitespace`) |
| `array`   | Same as `json`                           |

### Data paths

Paths use `/` as a separator and map directly to the JSON structure of each log record returned by the MDI API. Array indices can be used:

| Path                                     | Resolves to                                     |
|------------------------------------------|-------------------------------------------------|
| `instance/displayName`                   | `record.instance.displayName`                   |
| `instance/localIdS4/costCenterId`        | `record.instance.localIdS4.costCenterId`        |
| `instance/attributes/0/content/name`     | `record.instance.attributes[0].content.name`    |
| `event`                                  | `record.event`                                  |

---

## Development

```sh
npm run ts-typecheck   # TypeScript type check (no emit)
npm run lint           # ESLint
npm run ui5lint        # UI5-specific linter (deprecated API, accessibility)
```

To debug in the browser, open DevTools — the original TypeScript source is available via sourcemaps. Use `Ctrl`/`Cmd` + `P` in Chrome to open a specific `.ts` file.

---

## Build

```sh
npm run build          # Standard build → dist/
npm run start:dist     # Serve the built app
```

For a fully self-contained build (includes all UI5 resources, deployable to any static server):

```sh
npm run build:opt
npm run start:dist
```

---

## License

Apache Software License, version 2.0 — see [LICENSE](LICENSE).
