# Corner Store

A small e-commerce site for a single shop owner. Customers browse the catalog and
place an order with their name and phone number, and the owner signs in to an
admin dashboard to manage products, photos, stock and incoming orders.

I built it with Node.js, Express and PostgreSQL on the back end, and plain HTML,
CSS and JavaScript on the front. There is no framework and no build step on the
client side, so the pages are served as they are written.

## Why it looks like this

The shop it is modelled on takes orders over the phone, so there is no payment
step. An order is a name, a phone number and a list of items, and the owner calls
the customer back to arrange delivery. That decision shapes most of the app: no
customer accounts, no checkout flow, no payment provider.

The parts I spent the most time on were stock handling and image uploads, which
are covered further down.

## Features

### Storefront

* Product list with a search box and category filters. Both are written into the
  URL, so a filtered list can be bookmarked or shared.
* Product page with a photo gallery. Arrows, clickable thumbnails, arrow keys and
  swipe on a touch screen.
* Stock is shown on the product card and the product page, with a warning when
  only a few are left.
* Cart at `/cart.html`. Add products, change the amounts, see the total, and
  order with a name, a phone number and an optional address.

### Admin dashboard

* Login with a username and password. Sessions use a JWT that lasts 8 hours.
* Products at `/admin.html`. Add, edit and delete, including price and stock, and
  search the list.
* Up to 3 photos per product. When editing you can keep the existing photos or
  replace them.
* Categories at `/categories.html`. A category that still has products in it
  cannot be deleted.
* Orders at `/orders.html`, split into three tabs. Pending holds what still needs
  handling, Done is the archive, and Deleted is a bin an order can be pulled back
  out of.

## Tech

| Layer | What I used |
| --- | --- |
| Server | Node.js, Express 5 |
| Database | PostgreSQL, queried with `pg` |
| Auth | JSON Web Tokens, bcrypt for password hashing |
| Uploads | Multer, with ImageKit as the optional CDN |
| Front end | HTML, CSS and JavaScript, no framework |

## How some of it works

### Stock is held in a transaction

The obvious way to place an order is to read the stock, check it is enough, then
write the order. That breaks as soon as two people order the last item at the
same time, because both reads happen before either write.

So `createOrder` opens a transaction and locks every product row it is about to
touch with `SELECT ... FOR UPDATE`. The second request waits for the first to
finish, sees the stock the first one left behind, and is turned away with a
message naming the product. The order rows and the stock updates are written in
the same transaction, so a failure halfway through leaves nothing behind.

Prices are read from the database inside that transaction and never taken from
the browser, so editing the cart in devtools does not change what an order costs.

### Deleted orders are not really deleted

Deleting an order stamps a `deleted_at` column instead of removing the row, and
puts the items back in stock. The order stays visible in the Deleted tab, and can
be restored, which takes the stock back out again. If something else sold that
stock in the meantime, the restore is refused and the order stays in the bin.
Removing an order for good is a separate action from the Deleted tab.

### Order items are a snapshot

`order_items` stores the product name and the unit price as they were when the
order was placed, not just a product id. Renaming a product, changing its price
or deleting it later does not rewrite old orders, which is what you want when
those orders are the record of what someone actually agreed to buy.

### Images work with or without a CDN

If the ImageKit keys are set in `.env`, uploads go to ImageKit and the CDN URL is
saved in the database. If they are not set, the same code path writes the file to
`public/uploads/` instead. That means the project runs after a clone with nothing
but a database, which matters if someone wants to try it without signing up for
anything.

Filenames are rewritten to a slug plus a random suffix, so two uploads called
`photo.jpg` do not collide and nothing from the original filename reaches the
filesystem untouched.

## Running it

You need Node.js 20 or newer and PostgreSQL 14 or newer.

```
git clone https://github.com/Kassem-hub123/e-commerse-website.git
cd e-commerse-website
npm install
```

Create the database:

```
createdb ecommerce_store
```

Copy `.env.example` to `.env` and fill it in. At minimum set `DATABASE_URL` and
`JWT_SECRET`. Then start it:

```
npm start
```

Use `npm run dev` instead if you want the server to restart when you edit a file.

The tables are created on first start, along with an admin account taken from
`ADMIN_USERNAME` and `ADMIN_PASSWORD`. Change that password before putting the
site anywhere public.

The shop is at http://localhost:3000 and the dashboard at
http://localhost:3000/admin.html.

## Environment variables

| Name | Purpose |
| --- | --- |
| `PORT` | Port to listen on. Defaults to 3000. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `JWT_SECRET` | Signs admin tokens. The server refuses to start in production without it. |
| `JWT_EXPIRES_IN` | Token lifetime. Defaults to `8h`. |
| `ADMIN_USERNAME`, `ADMIN_PASSWORD` | Used only to create the first admin account. |
| `STORE_NAME` | Shop name shown in the header. |
| `CURRENCY` | Currency code used to format prices. Defaults to `USD`. |
| `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT` | Optional. Without them, uploads go to `public/uploads/`. |

## API

Public:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/settings` | Shop name and currency. |
| GET | `/api/categories` | All categories with their product counts. |
| GET | `/api/products` | Products. Accepts `search`, `category`, `in_stock`. |
| GET | `/api/products/:id` | One product with its photos. |
| POST | `/api/auth/login` | Returns a token. |
| POST | `/api/orders` | Place an order: `customer_name`, `phone`, `address`, `items: [{ id, qty }]`. |

Admin only, sent with `Authorization: Bearer <token>`:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/me` | Check the current token. |
| POST | `/api/products` | Create a product. `multipart/form-data`. |
| PUT | `/api/products/:id` | Update a product. Send `keep_images=false` to replace the photos. |
| DELETE | `/api/products/:id` | Delete a product and its photos. |
| POST | `/api/categories` | Create a category. |
| PUT | `/api/categories/:id` | Rename a category. |
| DELETE | `/api/categories/:id` | Delete a category that has no products. |
| GET | `/api/orders` | Orders for one tab. Accepts `view=pending`, `done` or `deleted`, and returns the counts for all three. |
| PUT | `/api/orders/:id` | Set the status to `new` or `done`. |
| PUT | `/api/orders/:id/restore` | Take an order out of the bin. Its items come out of stock again. |
| DELETE | `/api/orders/:id` | Move an order to the bin and put its items back in stock. |
| DELETE | `/api/orders/:id/forever` | Remove a binned order for good. |

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
  cart.html             cart and order form
  admin.html            products dashboard
  categories.html       categories dashboard
  orders.html           orders dashboard
  css/styles.css
  js/                   shared.js, store.js, product.js, cart.js,
                        auth.js, admin.js, categories.js, orders.js
```

Routes handle the URL, controllers read the request and decide the status code,
models hold the SQL. Nothing writes SQL outside `src/models`, and nothing touches
`req` or `res` outside `src/controllers` and `src/middleware`.

## Known gaps

Things I know are missing, rather than things I did not think about:

* No automated tests. I checked the order and upload paths by hand against a
  running server.
* One admin role. The `role` column exists but nothing reads it yet.
* No rate limiting on the login route.
* The cart lives in `localStorage`, so it does not follow a customer between
  devices.
* Orders are read by refreshing the page. There is no notification when a new one
  arrives.
