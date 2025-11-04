# Agentic Call Assistant

Automate outbound phone calls with a single click. This Next.js app generates a concise call script and uses Twilio to place the call on your behalf.

## Features

- Guided form to capture who to call and why
- Script builder keeps tone warm and professional
- Activity feed tracks queued, successful, and failed calls
- Secure API route integrates with Twilio Voice

## Quick Start

```bash
npm install
cp .env.local.example .env.local
# populate .env.local with your Twilio credentials
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and queue a call.

## Environment Variables

| Name | Description |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Project Info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Project Info |
| `TWILIO_FROM_NUMBER` | A verified or purchased Twilio phone number capable of voice |

## Deployment

When deploying to Vercel, add the three environment variables above to your project. The production build runs the Next.js App Router API route that triggers Twilio.

```bash
npm run build
npm start
```

## Tech Stack

- Next.js 14 (App Router, TypeScript)
- React 18
- Twilio Node SDK
- Zod for validation

## Testing the Call Flow

1. Fill out the form with E.164 formatted numbers (e.g. `+15551234567`).
2. Submit to trigger the API route.
3. The UI updates the activity feed with success or error details from Twilio.
