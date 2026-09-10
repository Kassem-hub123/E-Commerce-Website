# Shop

A small e-commerce site. Customers browse the catalog and message the owner on
WhatsApp; the owner signs in to an admin dashboard to manage products, photos
and stock.

Built with Node.js, Express, PostgreSQL and plain HTML/CSS/JavaScript.

## What it does

**Storefront**

- Product list with search and category filters, both kept in the URL.
- Product page with a photo gallery, price, stock and a WhatsApp link that
  opens a message about that product.

**Admin dashboard** (`/admin.html`)

- Log in with a username and password. Sessions use a JWT that expires after
  8 hours.
- Add, edit and delete products, including price and stock.
- Upload up to 8 photos per product, and keep or replace the existing ones
  when editing.
- Search the product list.
- Add, rename and delete categories (`/categories.html`). A category that
  still has products cannot be deleted.

## Requirements

- Node.js 20 or newer
- PostgreSQL 14 or newer

## Setup

1. Install the dependencies:

   ```
   npm install
   ```

2. Create the database:

   ```
   createdb ecommerce_store
   ```

3. Copy `.env.example` to `.env` and fill it in. At minimum set `DATABASE_URL`,
   `JWT_SECRET` and `WHATSAPP_NUMBER`.

4. Start the server:

   ```
   npm start
   ```

The tables are created on the first start, along with an admin account using
`ADMIN_USERNAME` and `ADMIN_PASSWORD` from `.env`. Change that password before
putting the site online.

Open http://localhost:3000 for the shop and http://localhost:3000/admin.html
for the dashboard.

## Photo storage

If the ImageKit keys are set in `.env`, uploaded photos go to ImageKit and the
CDN URL is stored in the database. If they are not set, photos are written to
`public/uploads/` instead, so the site runs without an ImageKit account.

## Environment variables

| Name | Purpose |
| --- | --- |
| `PORT` | Port to listen on. Defaults to 3000. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Signs admin tokens. Required in production. |
| `JWT_EXPIRES_IN` | Token lifetime. Defaults to `8h`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Used only to create the first admin. |
| `STORE_NAME` | Shop name shown in the header. |
| `WHATSAPP_NUMBER` | Digits only, with country code. The button is hidden if this is empty. |
| `CURRENCY` | Currency code for prices. Defaults to `USD`. |
| `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT` | Optional ImageKit credentials. |

## API

Public:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/settings` | Shop name, WhatsApp number, currency. |
| GET | `/api/categories` | All categories with their product counts. |
| GET | `/api/products` | Products. Accepts `search`, `category`, `in_stock`. |
| GET | `/api/products/:id` | One product with its photos. |
| POST | `/api/auth/login` | Returns a token. |

Admin only, with `Authorization: Bearer <token>`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/me` | Check the current token. |
| POST | `/api/products` | Create a product. `multipart/form-data`. |
| PUT | `/api/products/:id` | Update a product. Send `keep_images=false` to replace the photos. |
| DELETE | `/api/products/:id` | Delete a product and its photos. |
| POST | `/api/categories` | Create a category. |
| PUT | `/api/categories/:id` | Rename a category. |
| DELETE | `/api/categories/:id` | Delete an empty category. |

## Layout

```
server.js               starts the server
src/
  app.js                express setup
  config/env.js         reads .env and holds the settings
  db/pool.js            postgres pool, query and transaction helpers
  db/schema.sql         tables
  db/setup.js           creates the tables and the first admin
  routes/               url to controller
  controllers/          reads the request, writes the response
  models/               sql queries
  services/             jwt tokens, image upload and deletion
  middleware/           auth, file upload, errors
public/
  index.html            product list
  product.html          one product
  admin.html            products dashboard
  categories.html       categories dashboard
  css/styles.css
  js/                   shared.js, store.js, product.js, auth.js, admin.js, categories.js
```
