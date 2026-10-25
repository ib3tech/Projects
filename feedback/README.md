# HomeLink client feedback form

A one-page feedback form for clients after a project is handed over. Each submission is emailed to you through [Web3Forms](https://web3forms.com). There is no database, no login and no admin page.

## Setup

1. **Get the Web3Forms key.** Go to https://web3forms.com, enter `imranbakaluba0501@outlook.com`, and copy the access key from the email they send you.
2. **Add it on Vercel.** In your Vercel project, go to Settings → Environment Variables, add `WEB3FORMS_ACCESS_KEY` with the key as its value, and tick Production and Preview.
3. **Deploy.** Import this repository on Vercel, set **Root Directory** to `feedback`, and deploy. If the project already existed before you added the key, redeploy so the key is picked up.

## Notes

- Questions live in `lib/form-config.ts`. The page, progress bar, validation and email are all built from that one array, so edit the questions there.
- The email layout is built in `lib/email.ts`; the server-side checks are in `lib/validate.ts` and `app/api/feedback/route.ts`.
- To run it locally: `npm install`, copy `.env.example` to `.env.local`, add your key, then `npm run dev`.
- Checks: `npm run lint`, `npm run typecheck`, `npm run build`.
