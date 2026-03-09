# ⚡ QUICK START GUIDE - Get Running in 15 Minutes

## Step 1: Install Dependencies (2 min)
```bash
npm install
```

## Step 2: Setup Supabase Database (5 min)

1. Go to https://supabase.com and create account
2. Create new project
3. Go to SQL Editor
4. Copy entire contents of `database-schema.sql`
5. Paste and run it
6. Done! ✅

## Step 3: Get API Keys (5 min)

### Supabase Keys
- Go to Settings → API
- Copy:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

### MercadoPago Keys (Payment)
- Go to https://www.mercadopago.com.co/developers/panel/app
- Create an application or use existing
- Go to Credentials
- Copy: `MERCADOPAGO_ACCESS_TOKEN`

### Resend Keys (Email)
- Go to https://resend.com
- Create account
- Get API key
- Copy: `RESEND_API_KEY`

## Step 4: Configure Environment (2 min)

```bash
cp .env.example .env
```

Edit `.env` and paste your keys. Also set:
- `ADMIN_EMAIL="your@email.com"`
- `ADMIN_PASSWORD="your_password"`
- `NEXT_PUBLIC_BUSINESS_NAME="Your Store"`
- `NEXTAUTH_SECRET` (run: `openssl rand -base64 32`)

## Step 5: Run! (1 min)

```bash
npm run dev
```

Visit: http://localhost:3000

## Step 6: Add Products

1. Go to http://localhost:3000/admin
2. Login with your admin credentials
3. Click "Categorías" → Add a category
4. Click "Productos" → Add products

Done! Your store is live! 🎉

## Next Steps

1. Configure MercadoPago webhook URL in MercadoPago dashboard
2. Verify your domain in Resend
3. Customize colors in `tailwind.config.js`
4. Deploy to Vercel (see README.md)

## Need Help?

- Database issues? Check Supabase logs
- Payment issues? Check MercadoPago dashboard
- Email issues? Verify domain in Resend

Full documentation in README.md
