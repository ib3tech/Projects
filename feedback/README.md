# HomeLink client feedback form

A one-page feedback form for clients after a project is handed over. Each submission is emailed to you through [Formspree](https://formspree.io) (form `maqbrpnz`). There is no database, no login and no admin page.

## Setup

1. **Check the Formspree form.** In the Formspree dashboard, open form `maqbrpnz` and make sure its target email is `imranbakaluba@gmail.com` and the address is verified.
2. **Deploy on Vercel.** Import this repository, set **Root Directory** to `feedback`, and deploy. No environment variables are needed.
3. **Send a test.** Fill in the live form yourself and check that the email arrives in Gmail (look in spam the first time).

## Notes

- Questions live in `lib/form-config.ts`. The page, progress bar, validation and email are all built from that one array, so edit the questions there.
- The email subject and plain-text body are built in `lib/email.ts`. Validation is in `lib/validate.ts`.
- The form sends straight from the browser to Formspree, as Formspree intends. The form ID is not a secret. To switch forms, change `FORMSPREE_FORM_ID` in `components/FeedbackForm.tsx`.
- Formspree's free plan has a monthly submission cap; check your plan in the dashboard.
- To run it locally: `npm install`, then `npm run dev`.
- Checks: `npm run lint`, `npm run typecheck`, `npm run build`.
