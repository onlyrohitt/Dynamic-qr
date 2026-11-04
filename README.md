# Dynamic QR Manager Pro (Multi-Customer Edition)

A production-ready Next.js application that lets you distribute **custom, permanent dynamic QR codes** to multiple customers, each identified by a **unique code** (e.g. `CAFE-901`, `VIP-778`, `BELLA-99`).

When a customer comes to you to update their destination URL, you enter their unique code in the admin dashboard and instantly change their destination URL—**without them needing to reprint anything!**

You can also customize every customer's QR code with custom themes, colors, dot styles, corner eyes, center icons, and branded banners!

```
Customer has QR code  →  Scans https://your-domain.com/r/CAFE-901  →  Instant HTTP 302 Redirect
                                    ↑
     When customer wants to change URL, they come to you (the admin):
     1. You type "CAFE-901" in the Quick Lookup Bar
     2. Update destination to "https://new-menu.com"
     3. Click Save — all future scans instantly route to the new URL!
```

---

## 🌟 Key Features

### 1. 🔍 Instant Customer Code Lookup & Management
- Prominent **Quick Lookup Bar** on the dashboard.
- Type any customer's unique code (e.g. `CAFE-901`, `VIP-778`) or click a quick-select chip.
- Instantly opens that customer's focused management modal to:
  - Update their destination URL with 1-click live save.
  - Test the destination link directly.
  - Copy the permanent redirect link (`https://your-domain.com/r/[code]`).
  - View scan analytics (total scans, last scanned date & time).
  - Toggle between **Active** and **Paused**.

### 2. 🎨 Full QR Customizer with Themes & Designs
- **Curated Theme Presets**:
  - 🌌 **Midnight Obsidian**: Slate-900 background, electric cyan dots
  - 👑 **Royal Gold**: Obsidian background, warm metallic gold
  - 💎 **Cyberpunk Neon**: Deep violet, hot magenta, neon cyan
  - 🌿 **Emerald Luxe**: Forest dark, mint emerald green
  - 🌅 **Sunset Velvet**: Deep violet, warm sunset coral
  - 🌊 **Sapphire Wave**: Deep navy, crisp azure blue
  - ⚪ **Classic Monochrome**: High-contrast white and black
  - 🔴 **Ruby Crimson**: Deep wine, ruby crimson
- **Modular Customization**:
  - **Dot Patterns**: Classic Squares, Smooth Rounded, Dots.
  - **Corner Eyes**: Square, Rounded, Circular.
  - **Frame & Banners**: None, Bottom Banner, Top Banner (e.g. "SCAN ME", "VISIT MENU", "VIP ACCESS", or custom text).
  - **Center Badge Icons**: None, Globe, Store, Coffee, Utensils, Star, Link, Phone.
  - **Custom Color Pickers**: Individual color pickers for Foreground, Background, and Corner Eyes.

### 3. 🖨️ Multi-Format High Resolution Export & Print Cards
- **PNG Downloads**: 800px, 1200px (Print-Ready), 2000px (Ultra HD).
- **SVG Vector Export**: Clean, scalable vector format for graphic designers, signboards, flyers, and laser cutting.
- **Printable Display Card**: In-browser print card modal ready for printing on cardstock or saving to PDF.

### 4. 🛡️ Resilient Dual-Engine Storage
- **Supabase**: Primary cloud database with Row-Level Security.
- **Local Durable Fallback**: If Supabase credentials are offline or not yet migrated, automatically persists to `data/qr-codes.json` without failing or crashing.

---

## 🚀 Getting Started

### 1. Clone & Install
```bash
git clone <repo-url>
cd dynamic-qr/dynamic-qr
npm install
```

### 2. Configure Environment (`.env.local`)
Copy `.env.example` to `.env.local` or edit `.env.local`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL (no trailing slash)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Admin Credentials
ADMIN_USERNAME=Dynamic-qr
ADMIN_PASSWORD=Dynamic-qr1@12

# Session Secret (random 32+ characters)
SESSION_SECRET=14aa8d9ac41da3311ff19f7ecaf533f06e952287ef6b47fc5c647758b242e4b2
```

### 3. Run Locally
```bash
npm run dev
```
Open [http://localhost:3000/admin](http://localhost:3000/admin) in your browser.

---

## 🗄️ Supabase Database Migration

To run on Supabase in production:
1. Go to your Supabase project dashboard at https://supabase.com.
2. Navigate to **SQL Editor** → **New query**.
3. Open `supabase/schema.sql` from this repository.
4. Copy its contents, paste into the SQL editor, and click **Run**.
5. It creates the `qr_codes` table with unique indexes, RLS policies, and sample data.

---

## 🔒 Security
- All admin mutations and dashboard views are protected by server-side HMAC-SHA256 session cookies.
- All Supabase operations use the `SUPABASE_SERVICE_ROLE_KEY` server-side only; no public keys can modify destinations.
- 302 redirects are served with strict anti-caching headers (`no-store, no-cache, must-revalidate`).