# 🛍️ Ecommerce Platform - Complete Setup Guide

A full-featured ecommerce platform built with Next.js 14, Supabase, and MercadoPago payments for Colombia.

## ✨ Features - 100% COMPLETE & READY TO USE

### Customer-Facing ✅
- 🛒 Product catalog with categories
- 🔍 Product search and filtering
- 🛍️ Shopping cart with persistent storage
- 💳 Checkout with MercadoPago (direct API)
- 📦 Pickup or delivery options
- 🏢 Colombian departments & cities (all 32 departments + major cities)
- 🎟️ Coupon system (percentage & fixed discounts)
- 📧 Automatic email confirmations with invoice
- 📱 Fully responsive design

### Admin Dashboard ✅ FULLY FUNCTIONAL
- 📊 Statistics & analytics dashboard
- 📦 **Complete Product Management** with visual interface (Create, Edit, Delete, Stock control, Images)
- 📂 **Complete Category Management** with visual interface (Create, Edit, Delete)
- 🎫 **Complete Coupon Management** with visual interface (Create, Edit, Delete, Expiry, Usage limits)
- 📋 **Complete Order Management** with detailed view and status updates
- 🔄 Real-time stock alerts
- 🔐 Secure authentication
- 👁️ All CRUD operations with professional UI

## 🚀 Quick Start

### 1. Prerequisites
- Node.js 18+ installed
- A Supabase account (free tier works)
- A MercadoPago account (for payments)
- A Resend account (for emails)

### 2. Clone and Install
```bash
# Install dependencies
npm install
```

### 3. Database Setup

1. Go to [Supabase](https://supabase.com) and create a new project
2. In the SQL Editor, run the entire `database-schema.sql` file
3. This will create all tables, add Colombian departments/cities, and set up security policies

### 4. Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Fill in all the values:

#### MercadoPago (Payments)
```env
MERCADOPAGO_ACCESS_TOKEN="your_access_token"
```
Get this from: https://www.mercadopago.com.co/developers/panel/app → Credentials

#### Supabase (Database)
```env
NEXT_PUBLIC_SUPABASE_URL="https://xxxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
```
Get these from: Supabase Dashboard → Settings → API

#### NextAuth (Session Management)
```env
NEXTAUTH_SECRET="generate_a_random_32_char_string"
NEXTAUTH_URL="http://localhost:3000"
```
Generate secret: `openssl rand -base64 32`

#### Resend (Email Service)
```env
RESEND_API_KEY="re_xxxxxxxxxxxx"
```
Get this from: https://resend.com/api-keys

#### Admin Credentials
```env
ADMIN_EMAIL="admin@yourstore.com"
ADMIN_PASSWORD="your_secure_password"
```

#### Business Info
```env
NEXT_PUBLIC_BUSINESS_NAME="Tu Tienda Colombia"
NEXT_PUBLIC_BUSINESS_EMAIL="contact@yourstore.com"
NEXT_PUBLIC_BUSINESS_PHONE="+57 300 123 4567"
```

### 5. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 6. Access Admin Panel
1. Go to: http://localhost:3000/admin
2. Login with your ADMIN_EMAIL and ADMIN_PASSWORD
3. Start adding products!

## 📝 Adding Your First Product (Super Easy!)

1. **Login to admin panel:** Go to http://localhost:3000/admin
2. **Create a Category first:**
   - Click "Categorías" in the dashboard
   - Click "Nueva Categoría" button
   - Fill in: Name (e.g., "Electrónica"), Description, Image URL (optional)
   - Click "Crear"

3. **Add Your First Product:**
   - Click "Productos" in the dashboard
   - Click "Nuevo Producto" button
   - Fill in the form:
     - **Name:** e.g., "iPhone 15 Pro"
     - **Description:** Product details
     - **Price:** e.g., 3500000 (in COP)
     - **Stock:** e.g., 10
     - **SKU:** (optional) e.g., "IPH15PRO"
     - **Category:** Select from dropdown
     - **Main Image URL:** Paste image URL (use Imgur, Cloudinary, or Supabase Storage)
     - **Additional Images:** Paste URLs separated by commas
     - ✅ Check "Producto activo"
   - Click "Crear"

4. **Done!** Your product is now live on the store at http://localhost:3000

**Pro Tips:**
- Use free image hosting: [Imgur](https://imgur.com), [Cloudinary](https://cloudinary.com), or Supabase Storage
- To get an image URL: Upload to Imgur → Right click → "Copy image address"
- You can edit or delete products anytime from the admin panel
- Low stock (≤5) will show alerts in the dashboard

**No SQL needed! Everything is visual and easy to use.**

## 🎨 Customization

### Changing Colors
Edit `tailwind.config.js`:
```js
colors: {
  primary: {
    500: '#your-color', // Main brand color
    // ... other shades
  }
}
```

### Changing Fonts
Edit `src/app/globals.css`:
```css
@import url('your-google-fonts-url');

:root {
  --font-display: 'Your Display Font', serif;
  --font-body: 'Your Body Font', sans-serif;
}
```

### Business Information
All business info is in `.env`:
- `NEXT_PUBLIC_BUSINESS_NAME`
- `NEXT_PUBLIC_BUSINESS_EMAIL`
- `NEXT_PUBLIC_BUSINESS_PHONE`

## 🚀 Deployment (Vercel - Recommended)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin your-repo-url
git push -u origin main
```

### 2. Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add all environment variables from `.env`
5. Click "Deploy"

### 3. Post-Deployment
1. Update `NEXTAUTH_URL` to your production URL
2. Configure MercadoPago webhook URL to `https://yourdomain.com/api/webhook/mercadopago`
3. Configure your domain in Vercel settings

## 💳 Payment Setup (MercadoPago)

1. Go to https://www.mercadopago.com.co/developers/panel/app
2. Create an application (or use existing)
3. Go to Credentials → Production credentials
4. Copy the **Access Token** and set it as `MERCADOPAGO_ACCESS_TOKEN` in `.env`
5. For testing, use the **Test credentials** (token starts with `TEST-`)
6. Configure the webhook URL in MercadoPago → Notifications:
   - URL: `https://yourdomain.com/api/webhook/mercadopago`
   - Events: `payment`

## 📧 Email Configuration

### Using Resend
1. Verify your domain at Resend
2. Add your verified email to `.env`
3. Emails will be sent from your domain

### Email Templates
Edit `src/lib/email.ts` to customize:
- Invoice design
- Email content
- Business information display

## 🗄️ Database Management

### Adding More Cities
```sql
INSERT INTO cities (department_id, name, delivery_days, delivery_cost) 
VALUES (
  (SELECT id FROM departments WHERE code = 'SAN'),
  'Your City',
  5,
  10000
);
```

### Adjusting Delivery Costs
```sql
UPDATE cities 
SET delivery_cost = 15000, delivery_days = 6 
WHERE name = 'City Name';
```

## 📊 Admin Dashboard Pages

**All pages now have complete visual interfaces - no SQL required!**

- `/admin` - Login page
- `/admin/dashboard` - Overview with real-time statistics
- `/admin/products` - **Full CRUD interface** for products (create, edit, delete, manage stock, upload images)
- `/admin/categories` - **Full CRUD interface** for categories (create, edit, delete with visual cards)
- `/admin/coupons` - **Full CRUD interface** for coupons (create, edit, delete, set expiry, usage limits)
- `/admin/orders` - **Complete order management** (view all orders, detailed view, update status, filter by status)

### What You Can Do in Each Admin Page:

#### Products (`/admin/products`)
- ✅ View all products in a professional table
- ✅ Create new products with full form (name, price, stock, images, category, SKU)
- ✅ Edit existing products
- ✅ Delete products
- ✅ See stock alerts (low stock highlighted)
- ✅ Search products
- ✅ Toggle active/inactive status
- ✅ Add multiple images per product

#### Categories (`/admin/categories`)
- ✅ View all categories in visual cards
- ✅ Create new categories with name, description, and image
- ✅ Edit existing categories
- ✅ Delete categories
- ✅ Beautiful card-based interface

#### Coupons (`/admin/coupons`)
- ✅ View all coupons in a table
- ✅ Create new coupons (percentage or fixed amount)
- ✅ Set minimum purchase requirements
- ✅ Set maximum usage limits
- ✅ Set expiration dates
- ✅ Toggle active/inactive
- ✅ Track usage count
- ✅ See expired/exhausted coupons highlighted

#### Orders (`/admin/orders`)
- ✅ View all orders in a comprehensive table
- ✅ Search orders by number, name, or email
- ✅ Filter by status (pending, processing, shipped, completed, cancelled)
- ✅ Click any order to see full details (customer info, products, delivery info)
- ✅ Update order status with one click
- ✅ See order totals, discounts, shipping costs
- ✅ View all order items

**NO SQL QUERIES NEEDED!** Everything can be managed through the beautiful admin interface.

## 🛠️ Common Tasks - All Visual Now!

### Create a Coupon
**Via Admin Panel (Recommended):**
1. Go to `/admin/coupons`
2. Click "Nuevo Cupón"
3. Fill the form and save!

**Via SQL (if you prefer):**
```sql
INSERT INTO coupons (code, discount_type, discount_value, min_purchase, is_active)
VALUES ('SUMMER2024', 'percentage', 20, 50000, true);
```

### Add a Product
**Via Admin Panel (Easy!):**
1. Go to `/admin/products`
2. Click "Nuevo Producto"
3. Fill the form with all details
4. Click "Crear"

### Update Product Stock
**Via Admin Panel:**
1. Go to `/admin/products`
2. Click edit (pencil icon) on any product
3. Update the stock number
4. Click "Actualizar"

### View and Manage Orders
**Via Admin Panel:**
1. Go to `/admin/orders`
2. Click on any order to see full details
3. Update status with one click
4. Filter by status or search

### Check Store Statistics
**Via Admin Panel:**
1. Go to `/admin/dashboard`
2. See real-time stats: revenue, orders, low stock alerts
3. View recent orders

**Everything is visual - no SQL knowledge required!**

## 🔒 Security Best Practices

1. **Never commit `.env` file** (already in .gitignore)
2. **Use strong admin passwords**
3. **Enable Row Level Security** in Supabase (already configured)
4. **Use HTTPS in production** (Vercel handles this)
5. **Rotate API keys** periodically

## 📱 Mobile Optimization

The platform is fully responsive:
- Mobile-first design
- Touch-friendly buttons
- Optimized images
- Fast loading times

## 🐛 Troubleshooting

### Products Not Showing
- Check if products are marked as `is_active = true`
- Verify product has stock > 0
- Check Supabase connection

### Payment Fails
- Verify `MERCADOPAGO_ACCESS_TOKEN` is correct in `.env`
- Check MercadoPago dashboard for payment errors
- Look at browser console and server logs for errors

### Emails Not Sending
- Verify Resend API key
- Check if domain is verified in Resend
- Look at server logs

### Admin Can't Login
- Verify ADMIN_EMAIL and ADMIN_PASSWORD in `.env`
- Clear browser cookies
- Check if admin session cookie is set

## 📈 Scaling Tips

1. **Images**: Use Supabase Storage or CloudFlare Images
2. **Performance**: Enable Next.js Image Optimization
3. **Caching**: Use Vercel's Edge Caching
4. **Database**: Upgrade Supabase plan as you grow
5. **Analytics**: Add Google Analytics or Plausible

## 🎯 Roadmap / Future Features

Ideas you can add:
- [ ] Product reviews & ratings
- [ ] Wishlist functionality
- [ ] Product variants (sizes, colors)
- [ ] Advanced inventory management
- [ ] Multi-language support
- [ ] Mobile app (React Native)
- [ ] Live chat support
- [ ] Loyalty program
- [ ] Subscription products

## 💬 Support

Need help? Check:
1. Supabase Docs: https://supabase.com/docs
2. Next.js Docs: https://nextjs.org/docs
3. MercadoPago Docs: https://www.mercadopago.com.co/developers/es/docs
4. Tailwind CSS: https://tailwindcss.com/docs

## 📄 License

This project is open source and available for commercial use.

---

Built with ❤️ for Colombian entrepreneurs
# Com
# Com
