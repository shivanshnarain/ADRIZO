# Vercel Environment Variables Audit Report

**Project:** ADRIZO / Unique India Garments  
**Target Environment:** Vercel (Production / Preview)  
**File Generated:** `.env.vercel`  

---

## 1. Total Environment Variables Detected

- **Total Environment Variables Detected in Project:** **26**
- **Visible Keys in User's Vercel Screenshot:** **22** (All 22 are actively used by the application)
- **Additional Variables Detected in Codebase:** **4** (`CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, `SHIPROCKET_WEBHOOK_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`)
- **Internal / Auto-Provided Variables (Excluded from manual config):**
  - `NODE_ENV`: Automatically provided by Next.js and Vercel (`production` / `development`).
  - `ADMIN_TEST_BYPASS`: Internal unit-test flag strictly excluded from production to prevent security bypass.

---

## 2. Values Found and Reused from the Existing Project

The following **16 values** were discovered in `.env` and `.env.local` and populated directly into `.env.vercel`:

| Variable Name | Source Location | Value / Description | Purpose |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | `.env` | `mongodb+srv://careadrizo_db_user:adrizo@...` | MongoDB Atlas Production Database URI (used by Prisma ORM) |
| `ADMIN_EMAIL` | `.env` | `Care.adrizo@gmail.com` | Authorized Admin email for dashboard login |
| `ADMIN_PASSWORD` | `.env` | `Shree@2805` | Authorized Admin password for dashboard login |
| `JWT_SECRET` | `.env` | `a-very-secure-secret-key-for-development-phase-2` | Secret key used to sign and verify admin session tokens via `jose` |
| `CLOUDINARY_CLOUD_NAME` | `.env` | `zytsxasx` | Cloudinary account cloud name for product image hosting |
| `CLOUDINARY_API_KEY` | `.env` | `375971195811223` | Cloudinary API Key for image uploads & signed deletions |
| `CLOUDINARY_API_SECRET` | `.env` | `7orQb2EO_QiOtRGtDKIRtFNom6Y` | Cloudinary API Secret for authenticated SDK operations |
| `RAZORPAY_KEY_ID` | `.env` | `rzp_live_TYio72mColkjPN` | Live Razorpay Key ID for payments and COD confirmation |
| `RAZORPAY_KEY_SECRET` | `.env` | `U074TAZdfZv0BCcCTm7DblVm` | Live Razorpay Secret for order creation & HMAC verification |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env` | `https://inaekhxynubttednivvp.supabase.co` | Supabase Project URL for customer accounts & order management |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env` | `eyJhbGciOiJIUzI1Ni...` | Supabase client anon public key for frontend/SSR auth |
| `MAIL_FROM` | `.env` | `AD(R)IZO <care.adrizo@gmail.com>` | Sender header format for transactional emails and invoices |
| `SMTP_USER` | `.env` | `care.adrizo@gmail.com` | Google Workspace / Gmail account email for SMTP |
| `SHIPROCKET_API_EMAIL` | `.env.local` | `Care.adrizo@gmail.com` | Dedicated Shiprocket API login email for logistics |
| `SHIPROCKET_API_PASSWORD` | `.env.local` | `TeyH%wV4vMGGs%5d5lqtbHk2mkA7L52$` | Dedicated Shiprocket API login password for logistics |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Derived from `.env` | `rzp_live_TYio72mColkjPN` | Client-side Razorpay fallback key matching `RAZORPAY_KEY_ID` |

---

## 3. Safe Defaults Determinable by Project

The following **5 values** are safe defaults explicitly codified or defined across the application:

| Variable Name | Safe Default Value | Rationale / Code Reference |
| :--- | :--- | :--- |
| `RAZORPAY_CURRENCY` | `INR` | Project currency is Indian Rupee (`INR`) in `src/lib/razorpay.ts` |
| `SMTP_HOST` | `smtp.gmail.com` | Standard Google SMTP relay server defined in `src/lib/order-email.ts` |
| `SMTP_PORT` | `465` | SSL/TLS secure SMTP port defined in `src/lib/order-email.ts` |
| `SMTP_SECURE` | `true` | Required for port 465 SSL connections in `src/lib/order-email.ts` |
| `NEXT_PUBLIC_APP_URL` | `https://www.adrizo.in` | Storefront canonical URL used in `src/app/api/orders/[id]/send-invoice/route.ts` |

---

## 4. Placeholders Requiring Manual Input in Vercel

The following **5 secrets** could not be found with real production credentials in repository files and must be manually provided in Vercel:

| Variable Name | Placeholder in `.env.vercel` | Action Required |
| :--- | :--- | :--- |
| `RAZORPAY_WEBHOOK_SECRET` | `REPLACE_WITH_YOUR_RAZORPAY_WEBHOOK_SECRET` | Copy from **Razorpay Dashboard → Settings → Webhooks**. Required if you configure webhook events (`order.paid`, `payment.captured`). |
| `SUPABASE_SERVICE_ROLE_KEY` | `REPLACE_WITH_YOUR_SUPABASE_SERVICE_ROLE_KEY` | Copy from **Supabase Dashboard → Project Settings → API → `service_role` (secret)**. Allows backend services to bypass Row Level Security (RLS) for order processing. *(Code falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY` if empty, but service role key is strongly recommended for production).* |
| `SMTP_PASS` | `REPLACE_WITH_YOUR_GMAIL_APP_PASSWORD` | Generate a 16-character **Google App Password** for `care.adrizo@gmail.com` (Google Account → Security → 2-Step Verification → App Passwords). Without this, order confirmation and invoice emails run in mock log-only mode. |
| `CRON_SECRET` | `REPLACE_WITH_A_SECURE_CRON_SECRET` | Generate any 32+ character random string (e.g. `openssl rand -hex 32`). Used by Vercel Crons to authenticate the daily 3:00 AM 30-day retention cleanup job (`vercel.json`). |
| `SHIPROCKET_WEBHOOK_SECRET` | `REPLACE_WITH_OPTIONAL_SHIPROCKET_WEBHOOK_SECRET` | Set in **Shiprocket Dashboard → API → Webhooks** as the header token (`x-shiprocket-token` or `x-api-key`). Optional; if left unset, tracking webhooks bypass token matching. |

---

## 5. Variables from Vercel Screenshot NOT Used by Code

- **None.**  
  Every single one of the **22 environment variables** visible in your Vercel screenshot is actively referenced and functional in the codebase.

---

## 6. Variables Used by Code MISSING from Vercel Screenshot

The following **4 variables** are used in the codebase but were missing from the screenshot:

1. **`CRON_SECRET`**
   - **Where used:** `src/app/api/cron/retention-cleanup/route.ts` (line 22).
   - **Why needed:** `vercel.json` schedules `path: "/api/cron/retention-cleanup"` daily at 03:00 UTC. Setting `CRON_SECRET` ensures Vercel can authenticate requests with `Authorization: Bearer <CRON_SECRET>` and prevents unauthorized public invocations.

2. **`NEXT_PUBLIC_APP_URL`**
   - **Where used:** `src/app/api/orders/[id]/send-invoice/route.ts` (line 30).
   - **Why needed:** Sets the base URL for downloadable invoice links and customer order receipts (`https://www.adrizo.in` or your Vercel deployment domain).

3. **`SHIPROCKET_WEBHOOK_SECRET`**
   - **Where used:** `src/app/api/webhooks/shiprocket/route.ts` (line 21).
   - **Why needed:** Allows Shiprocket tracking webhooks (AWB in transit, delivered, etc.) to securely authenticate via `x-shiprocket-token` header.

4. **`NEXT_PUBLIC_RAZORPAY_KEY_ID`**
   - **Where used:** `src/app/api/checkout/create-order/route.ts` (line 547).
   - **Why needed:** Client-facing fallback key ID. Populated with the same value as `RAZORPAY_KEY_ID` (`rzp_live_TYio72mColkjPN`).

---

## 7. Deployment-Critical Checklist for Production

Before triggering a production build on Vercel, verify:

1. **Database Access (`DATABASE_URL`):**
   - Ensure the MongoDB Atlas cluster (`adrizo.tohvvqy.mongodb.net`) allows incoming network connections from **0.0.0.0/0** (Network Access in MongoDB Atlas), as Vercel serverless function IPs are dynamic.
   - Prisma runs `prisma generate` during build (`postinstall`).
2. **Payment Gateway (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`):**
   - Configured with live mode keys (`rzp_live_...`).
3. **Logistics API (`SHIPROCKET_API_EMAIL`, `SHIPROCKET_API_PASSWORD`):**
   - Configured with active credentials from `.env.local`.
4. **Email Delivery (`SMTP_PASS`):**
   - Must be configured with a valid Google App Password to deliver customer order receipts.
5. **Vercel Cron (`CRON_SECRET`):**
   - Enter a secret key so the automated daily cleanup cron in `vercel.json` succeeds.
