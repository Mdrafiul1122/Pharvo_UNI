# PHARVO

PHARVO is a pharmacy management system built as a university project. The
repository contains a Django REST backend that implements the core business
logic (inventory, point-of-sale, CRM, notifications and reporting) and a
React frontend that currently provides authentication, the application shell,
a settings page and the API service layer.

> The project is in an early development stage. The backend API is fully
> scaffolded and implemented, while the frontend is being assembled module by
> module (see [Current Project Status](#current-project-status)).

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Frontend](#frontend)
- [Backend](#backend)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API / Services](#api--services)
- [Database](#database)
- [Authentication](#authentication)
- [Usage](#usage)
- [Development](#development)
- [Current Project Status](#current-project-status)
- [Team / Contributors](#team--contributors)
- [License](#license)

## Overview

PHARVO targets the day-to-day operations of a pharmacy:

- manage medicines and stock (quantities, pricing, expiry, suppliers,
  categories, pack sizes);
- record sales at the counter and purchases from suppliers;
- maintain customer profiles and membership tiers;
- track customer–medicine recommendations (CRM) and apply automatic discounts
  at checkout;
- generate dashboard summaries and sales/purchases/stock/customer reports;
- surface low-stock, expired and near-expiry notifications;
- keep an audit trail of meaningful actions.

The backend exposes a JWT-protected REST API under `/api/`. The frontend is a
single-page React application that communicates with that API; during
development Vite proxies `/api` requests to the Django dev server.

## Key Features

Account & Authentication

- Custom user model with roles (`admin`, `pharmacist`, `customer`).
- JWT sign-in, token refresh and profile retrieval.
- Self-service sign-up for pharmacist and customer accounts (admin is never
  sign-up-able).
- Role-aware frontend routing once signed in.

Inventory

- Medicine products with unit/cost price, stock quantity, reorder level,
  expiry date, barcode and optional category/supplier/medicine group.
- Pack-size conversions for PC / Strip / Box units.
- Sensitive-drug flag.
- Drug interaction records and a multi-product interaction check endpoint.

Sales (POS)

- Checkout endpoint that records a sale and its sale items, validates stock
  and product price, and applies a CRM discount when eligible.
- Concurrency-safe stock updates using PostgreSQL advisory locks.
- Discount preview endpoint used by the POS UI.

Purchases

- Create and list purchase orders (with supplier-aware, locked quantity
  handling during purchase recording).

CRM

- Customer reminders (recommendations linking a customer to a medicine).
- Automatic discount calculation based on membership tier and purchase
  history, feeding the checkout flow.

Notifications

- Low-stock, expired and near-expiry notifications derived from inventory.
- Deduplicated creation (unique `dedup_key`), unread count.

Reports & Dashboard

- Dashboard summary endpoint.
- Sales, purchases, stock and customer reports.

Audit

- Read-only audit log with a reusable `audit/services.py` helper used to
  record actor/action/entity details.

Frontend (current scaffold)

- Branded login and sign-up pages (with a built-in demo-login helper).
- Application shell with sidebar navigation across all planned modules.
- Settings / account page (profile info, sign out).
- Ready-to-use API service modules for every backend resource.

## Technology Stack

Frontend (`Frontend/`)

- React 19 + Vite 8
- Tailwind CSS 4 (`@tailwindcss/vite`)
- lucide-react (icons)
- recharts (charts)
- ESLint 10

Backend (`Backend/`)

- Django 6.0.7
- Django REST Framework
- djangorestframework-simplejwt (JWT authentication)
- django-cors-headers
- PostgreSQL (Psycopg driver) — Python 3.13/3.14 (the project's bytecode is
  built for CPython 3.13/3.14)

> The backend has **no `requirements.txt` yet**. The packages required by the
> code are the ones imported across `Backend/**`: `django`,
> `djangorestframework`, `djangorestframework-simplejwt`,
> `django-cors-headers` and a PostgreSQL driver (`psycopg`). See
> [Installation & Setup](#installation--setup).

## Project Structure

```
pharvo-uni/
├── Backend/                      # Django project
│   ├── manage.py
│   ├── config/                   # Project package (settings, urls, exceptions)
│   ├── accounts/                 # Custom user + authentication
│   ├── audit/                    # Audit log
│   ├── crm/                      # CRM reminders + discount service
│   ├── customers/                # Customer management
│   ├── dashboard/                # Dashboard + report views
│   ├── inventory/                # Products, categories, interactions
│   ├── notifications/            # Notifications + generators
│   ├── purchases/                # Purchase orders
│   └── sales/                    # POS checkout, sales
└── Frontend/                     # React + Vite single-page app
    ├── index.html
    ├── package.json
    ├── vite.config.js            # dev server + /api proxy to :8000
    ├── eslint.config.js
    └── src/
        ├── main.jsx
        ├── App.jsx               # session check, auth gate, role routing
        ├── App.css
        ├── components/           # AppShell, StaffApp, Logo, auth inputs, icons
        ├── pages/auth/           # login.jsx, signup.jsx
        ├── settings/             # SettingsPage.jsx
        ├── services/             # api, auth + per-module API clients
        ├── styles/               # index.css, login.css, dashboard.css
        └── utils/units.js        # PC/Strip/Box conversion helpers
```

Not currently present (referenced but not yet committed):

- `README.md` at the repository root (created by this update; `Frontend/README.md`
  is still the Vite starter template).
- `Backend/requirements.txt` and a committed `.env.example` (only a local,
  untracked root `.env` exists).
- Frontend module screens under `src/Dashboard`, `src/pos`, `src/crm`,
  `src/customers`, `src/medicines`, `src/orders`, `src/reports`,
  `src/notifications` — these are imported by `StaffApp.jsx` / `App.jsx` but
  their components are not in the repository yet.
- The Django `supplier` app: listed in `INSTALLED_APPS` and included in
  `config/urls.py`, but only leftover `migrations/`/`__pycache__/` artifacts
  exist on disk — the app's source modules are missing.

## Frontend

The React app is structured as follows.

- `src/App.jsx` — the entry gate. It checks for a stored JWT, validates it
  against `GET /api/auth/me/`, and then either shows the login page, the
  sign-up page, the customer portal, or the staff application depending on the
  resolved role.
- `src/components/StaffApp.jsx` — holds the active module state and the
  per-module page metadata, loads the notifications unread count and renders
  the active screen inside the shell.
- `src/components/AppShell.jsx` — the persistent sidebar/navigation layout
  shared by the staff screens (Dashboard, POS / Sales, Medicines & Inventory,
  Customers, CRM, Orders, Reports, Notifications, Settings) with the user's
  name/role and an unread-notifications badge.
- `src/components/` — `Logo`, `BrandPanel`, `LoginButton`, `LoginInput`,
  `PasswordInput`, `Icons`, and shared UI blocks (`ui/Blocks.jsx`).
- `src/pages/auth/` — `login.jsx` (with a demo-login helper) and `signup.jsx`.
- `src/settings/SettingsPage.jsx` — account details plus sign out.
- `src/services/` — `api.js` is the shared HTTP client (base URL from
  `VITE_API_URL`/`VITE_API_BASE_URL`, JWT attachment, 401 handling, timeout and
  error normalisation to `ApiError`); `auth.js` implements login, sign-up
  (which signs in automatically because sign-up returns no tokens) and session
  helpers. Per-module clients: `crm.js`, `customer.js`, `dashboard.js`,
  `medicine.js`, `notifications.js`, `pos.js`, `reports.js`.
- `src/utils/units.js` — converts between PC / Strip / Box quantities using
  each product's `pcs_per_strip`, `strips_per_box` and `pcs_per_box`, and
  formats pack breakdowns for display.
- `src/styles/` — `index.css`, `login.css`, and `dashboard.css` (Tailwind
  entry plus page-specific styles).

> Build note: the module screens imported by `StaffApp.jsx` and `App.jsx` are
> not yet present, so a production `npm run build` will fail to resolve those
> imports until the components are added. Development imports on Windows also
> depend on file-name case (`./pages/auth/Login` vs the actual lowercase
> `login.jsx`), which works only on case-insensitive filesystems.

## Backend

The Django project `config` wires a set of focused apps through `config/urls.py`
(project-level exception handler in `config/exceptions.py`, settings that load
the root `.env` in `config/settings.py`).

| App            | Responsibility                                                     |
| -------------- | ------------------------------------------------------------------ |
| `accounts`     | Custom `User` (roles), Login, Signup, Me, JWT refresh              |
| `inventory`    | Products, categories, suppliers, medicine groups, drug interactions|
| `customers`    | Customer list/create/detail with search                            |
| `sales`        | POS checkout, CRM discount preview, sale listing                   |
| `purchases`    | Purchase order create/list with locked stock handling              |
| `crm`          | Reminders (customer–medicine) and the discount service             |
| `dashboard`    | Dashboard summary + reports (sales, purchases, stock, customers)   |
| `notifications`| Notification CRUD, unread count, low-stock/expiry generators       |
| `audit`        | Audit log list/detail + reusable write service                     |
| `supplier`     | Referenced in settings/urls but not implemented yet                |

Key conventions

- Authentication is JWT-only (`rest_framework_simplejwt`); the default
  permission is `IsAuthenticated`.
- All business APIs live under `/api/`.
- `sales` uses PostgreSQL advisory locks (`pg_advisory_xact_lock`) to keep
  stock updates concurrency-safe; `purchases` does the same for purchase
  recording.
- Audit entries are JSONB records written through `audit/services.py`.

## Installation & Setup

Prerequisites

- Python 3.13+ (CPython)
- Node.js 20+ (npm)
- PostgreSQL (a database named `pharvo_db` by default)

Backend

```bash
# 1. Move into the backend
cd Backend

# 2. Create and activate a virtual environment (optional but recommended)
python -m venv .venv
# Windows (PowerShell): .venv\Scripts\Activate.ps1
# macOS/Linux:         source .venv/bin/activate

# 3. Install dependencies.
#    NOTE: the repository has no requirements.txt yet, so install the
#    packages imported by the code:
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers psycopg[binary]

# 4. Create the root .env file (see Environment Variables). Django refuses to
#    start without DB_PASSWORD.

# 5. Apply migrations and start the server
python manage.py migrate
python manage.py runserver   # http://127.0.0.1:8000
```

Frontend

```bash
cd Frontend
npm install
npm run dev                  # http://localhost:5173 (proxies /api to :8000)
```

## Environment Variables

The Django backend reads configuration from a `.env` file at the repository
root (loaded by a small built-in loader in `config/settings.py` — no
third-party dependency). There is currently **no committed `.env.example`**;
create a root `.env` yourself using the keys below (actual values are kept
secret and not committed).

| Variable             | Description                                        | Default          |
| -------------------- | -------------------------------------------------- | ---------------- |
| `DB_NAME`            | PostgreSQL database name                           | `pharvo_db`      |
| `DB_USER`            | PostgreSQL user                                    | `postgres`       |
| `DB_PASSWORD`        | PostgreSQL password (required; backend errors without it) | *(none)*   |
| `DB_HOST`            | PostgreSQL host                                    | `localhost`      |
| `DB_PORT`            | PostgreSQL port                                    | `5432`           |
| `DJANGO_SECRET_KEY`  | Secret key; if unset a random one is generated (sessions/JWT do not survive a restart) | *(random)* |
| `DJANGO_DEBUG`       | `true`/`false` debug mode                           | `true`           |
| `DJANGO_ALLOWED_HOSTS`| Comma-separated hosts (ignored when DEBUG is on)  | *(empty)*        |
| `VITE_API_URL` / `VITE_API_BASE_URL` | Frontend API base override            | `/api`           |

## API / Services

All endpoints below are mounted under `/api/` and require a JWT (Bearer) unless
marked otherwise. Errors are normalised by `config/exceptions.py` and include
an `error_type` where relevant.

Authentication (`accounts`)

| Method | Endpoint             | Description                            |
| ------ | -------------------- | -------------------------------------- |
| POST   | `/auth/login/`       | Sign in, returns access + refresh + user |
| POST   | `/auth/refresh/`     | Refresh the access token (public)      |
| POST   | `/auth/signup/`      | Create user (no tokens; then log in)   |
| GET    | `/auth/me/`          | Current user / session validation      |

Customers (`customers`)

| Method | Endpoint               | Description                      |
| ------ | ---------------------- | -------------------------------- |
| GET/POST | `/customers/`        | List (search by name/phone/email) / create |
| GET/PUT/PATCH/DELETE | `/customers/<pk>/` | Retrieve/update/delete    |

Inventory (`inventory`)

| Method | Endpoint                  | Description                        |
| ------ | ------------------------- | ---------------------------------- |
| GET/POST | `/inventory/`           | List / create products             |
| GET/PUT/PATCH/DELETE | `/inventory/<pk>/` | Product detail/update/delete |
| GET    | `/interactions/`          | List drug interactions             |
| POST   | `/interactions/check/`    | Check a list of product IDs for interactions |

Sales / POS (`sales`)

| Method | Endpoint                  | Description                            |
| ------ | ------------------------- | --------------------------------------- |
| POST   | `/pos/checkout/`          | Record a sale (advisory-locked stock)   |
| POST   | `/pos/discount-preview/`  | Preview pricing including CRM discount  |
| GET    | `/sales/`                 | List sales                             |

Purchases (`purchases`)

| Method | Endpoint            | Description                        |
| ------ | ------------------- | ---------------------------------- |
| POST   | `/purchases/create/`| Create a purchase order            |
| GET    | `/purchases/`       | List purchases                     |

CRM (`crm`)

| Method | Endpoint                                            | Description                 |
| ------ | --------------------------------------------------- | --------------------------- |
| GET/POST | `/crm/reminders/`                                 | List / create reminders     |
| GET/PUT/PATCH/DELETE | `/crm/reminders/<pk>/`                 | Reminder detail/update/delete |
| GET    | `/crm/customers/<customer_id>/reminders/`           | Reminders for one customer  |

Dashboard & Reports (`dashboard`)

| Method | Endpoint                 | Description             |
| ------ | ------------------------ | ----------------------- |
| GET    | `/dashboard/`            | Dashboard summary       |
| GET    | `/reports/sales/`        | Sales report            |
| GET    | `/reports/purchases/`    | Purchases report        |
| GET    | `/reports/stock/`        | Stock report            |
| GET    | `/reports/customers/`    | Customers report        |

Notifications (`notifications`)

| Method | Endpoint                     | Description              |
| ------ | ---------------------------- | ------------------------ |
| GET    | `/notifications/`            | List notifications       |
| GET    | `/notifications/<pk>/`       | Notification detail      |
| GET    | `/notifications/unread-count/`| Unread notification count |

Audit (`audit`)

| Method | Endpoint            | Description          |
| ------ | ------------------- | -------------------- |
| GET    | `/audit/`           | List audit entries   |
| GET    | `/audit/<pk>/`      | Audit entry detail   |

## Database

- Engine: PostgreSQL (`django.db.backends.postgresql`), configured from the
  root `.env`. Default database name is `pharvo_db`.
- Migrations: each app ships a `migrations/0001_initial.py`; run
  `python manage.py migrate` from `Backend/`.
- Key tables include the custom `accounts_user`, `inventory_inventoryproduct`,
  `sales_sale` / `sales_saleitem`, `purchases_*`, `customers_customer`,
  `crm_reminder`, `notifications_notification` (with a unique `dedup_key`)
  and `audit_*`.
- Concurrency: stock writes during checkout and purchase recording are guarded
  by PostgreSQL advisory transaction locks.
- Local backups (`backup_pharvo_db_*.backup`) may exist at the repository root
  but are not tracked.

## Authentication

1. The frontend stores the JWT pair and the user object in `localStorage`
   (`pharvo_access_token`, `pharvo_refresh_token`, `pharvo_user`).
2. `POST /api/auth/login/` exchanges credentials for `{ access, refresh, user }`.
3. `POST /api/auth/signup/` creates the account only — the frontend then signs
   in to obtain the token pair.
4. `GET /api/auth/me/` is the server-side source of truth for the session;
   `App.jsx` clears any session whose role is unknown or that fails validation.
5. Role-based redirects map to `/admin/dashboard`, `/pharmacist/dashboard` and
   `/customer/portal` after login (in-app navigation is state-based via the
   shell, not URL routing).
6. On a `401`, the shared API client clears the session and returns to the
   login screen.

## Usage

1. Start the backend (`python manage.py runserver`) and frontend
   (`npm run dev`), then open `http://localhost:5173`.
2. Sign in using the pre-filled demo account on the login page (the page
   exposes a "Copy" button for the demo credentials) or create a new account
   via the sign-up page.
3. Once signed in, use the sidebar to switch between modules. Dashboard,
   POS/Sales, Medicines & Inventory, Customers, CRM, Orders, Reports and
   Notifications are wired in the shell and backed by their API services;
   the Settings page is live.
4. The API can also be exercised directly through `http://localhost:8000/api/…`
   with a Bearer token.

## Development

Frontend

```bash
cd Frontend
npm run dev       # start Vite dev server (port 5173, /api proxied to :8000)
npm run build     # production build
npm run preview   # preview production build
npm run lint      # ESLint
```

Backend

```bash
cd Backend
python manage.py runserver      # dev server on :8000
python manage.py test           # run the Django test suite
python manage.py makemigrations # generate migrations after model changes
python manage.py migrate        # apply migrations
```

The backend ships tests across the apps (e.g. `crm/test_crm.py`,
`crm/test_discount.py`, `customers/test_customers.py`,
`inventory/test_interactions.py`, `test_notifications.py`,
`test_dashboard.py`, plus per-app `tests.py`).

## Current Project Status

Implemented (backend)

- Authentication, inventory, customers, sales/POS (with advisory-locked stock
  and CRM discounting), purchases, CRM reminders + discount service, dashboard
  and reports, notifications, and the audit log — all with API endpoints,
  models, serializers and tests.

Implemented (frontend)

- App shell and sidebar navigation, login / sign-up pages, settings/account
  page, shared API client + per-module service modules, and PC/Strip/Box unit
  helpers.

In progress / missing

- Frontend module screens (dashboard, POS, medicines & inventory, customers,
  CRM, orders, reports, notifications, customer portal) are referenced by
  `StaffApp.jsx` / `App.jsx` but are **not yet committed**, so the frontend
  does not currently produce a complete production build.
- The `supplier` Django app is listed in `INSTALLED_APPS`/`config/urls.py`
  but has no source modules in the repository.
- `Backend/requirements.txt`, a committed `.env.example`, and an explicit
  license file are not yet present.

## Team / Contributors

_To be completed by the project team._ No contributor information is currently
recorded in the repository.

## License

_No license file is present in the repository._ PHARVO is a university project;
a license will be added by the maintainers if required.Minor update by Mahin
