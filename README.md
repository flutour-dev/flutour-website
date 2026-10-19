# FluTour Website

Booking platform for Luxor, Egypt tour rides — feluccas, boats, horse carriages, horse rides, and camel rides. Built for registered travel agents to book rides for their clients.

**Live site:** [flutour.com](https://flutour.com)

## Tech Stack

- **Frontend:** Single-page vanilla HTML/CSS/JS (`index.html`) — no build step
- **Auth:** Firebase Authentication (email/password)
- **Database:** Cloud Firestore
- **Hosting:** Netlify
- **Email:** Netlify Functions + [Resend](https://resend.com)

## Project Structure

```
flutour-website/
├── index.html                    # Entire frontend (HTML + CSS + JS)
├── netlify.toml                  # Netlify configuration
├── netlify/
│   └── functions/
│       └── send-email.js         # Serverless function — sends booking confirmation emails via Resend
└── README.md
```

## Firestore Collections

| Collection | Description |
|---|---|
| `agents/{uid}` | Travel agent profiles (rep, agency, IATA license, phone, email) |
| `bookings/{id}` | All bookings with status (confirmed / cancelled) |

## Environment Variables

Set these in **Netlify → Site configuration → Environment variables**:

| Variable | Description |
|---|---|
| `RESEND_API_KEY` | API key from [resend.com](https://resend.com) — used by the email function |

## Firebase Setup

Firebase project: `flutour-3fc69`

Services used:
- **Firebase Authentication** — email/password provider
- **Cloud Firestore** — agents and bookings storage

The same Firebase project is shared with the FluTour Flutter mobile app.

## Deployment

Netlify auto-deploys on every push to `main`.

```bash
git add .
git commit -m "your message"
git push
```

## Local Development

No build step required. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
npx serve .
```
