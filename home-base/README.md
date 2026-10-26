# HomeBase

HomeBase is an accommodation marketplace for finding and booking apartments and hostels. Guests can search real listings, compare amenities and reviews, save stays, message hosts, and book with an online payment flow. Hosts can publish and manage their properties.

## What’s inside

- Responsive discovery page with location, property type, and budget filters
- Sort by recent listings or booking amount; saved stays persist in the browser
- Natural language search through the existing `/api/search/parse` endpoint
- Property galleries, availability checks, reviews, host messaging, and checkout
- Firebase email, phone, and Google authentication
- Host listing management, bookings, payment history, and admin views
- Shared editorial design system and generated local hero asset

## Project structure

| Path | Purpose |
| --- | --- |
| `home-base/` | React 18 and Vite frontend |
| `home-base-backend/` | Express API, MongoDB models, Paystack, Cloudinary, and WebSocket messaging |
| `home-base/src/components/Home.js` | Discovery page and search interactions |
| `home-base/src/styles/homebase-refresh.css` | Updated theme and responsive layouts |

## Run locally

Use Node.js and npm. Install dependencies in each app:

```bash
cd home-base-backend && npm install
cd ../home-base && npm install
```

Create your local environment files from your own service credentials. The frontend expects `VITE_BACKEND_URL` and the Firebase `VITE_FIREBASE_*` values. The backend checks required variables in `home-base-backend/config/constants.js`; it also needs a MongoDB connection, Firebase Admin configuration, and credentials for the services you enable. Keep secrets out of Git.

Start the API, then the frontend in separate terminals:

```bash
cd home-base-backend && npm start
cd home-base && npm run dev
```

The Vite project is configured for port 3000. For a production frontend build, run `npm run build` inside `home-base/`; Vercel serves its `dist/` directory and rewrites app routes to `index.html`.

## Pricing model

`priceValue` is the rate for one `billingPeriod`: day, week, month, or year. A guest selects a move-in date and number of periods. The API calculates the full amount (`priceValue × durationCount`) before checkout and calculates check-out from the chosen term. Daily and weekly stays use 1-day and 7-day units; monthly and yearly stays use calendar months and years. The full selected term is charged upfront. The booking saves the rate, period, count, dates, and total as a payment snapshot.

New and edited listings need an explicit billing period. Existing listings with clear period wording are mapped automatically. Ambiguous wording such as “per session” needs the host to edit the listing before checkout. Review legacy listing data before presenting or accepting payments: an existing record can still contain an old text price that differs from its numeric checkout amount. The interface displays the numeric rate used by checkout.

Receipts show the amount actually charged and the saved stay terms when available. Business contact details appear only if `SUPPORT_EMAIL`, `SUPPORT_PHONE`, or `BUSINESS_ADDRESS` are configured on the API.

## Presentation checklist

Use real photos and accurate locations for the listings you want to demonstrate. Test a guest search, a property detail page, a saved stay, and a host account. If you plan to demonstrate payment, use the configured provider’s test environment and a disposable test listing.
