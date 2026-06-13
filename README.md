# Store Finder — راهنمای مغازه‌ها

A mobile-first store finder web app for discovering local shops and services in Tehran, Iran. Built with Next.js, Leaflet maps, and a Yandex Maps-inspired UI.

## Features

### Map & Discovery
- **Interactive Leaflet map** with custom category icons and color-coded open/closed markers
- **Floating rating badges** on map markers showing average customer ratings
- **Search overlay** with instant results, category filtering, and sort by distance or rating
- **Open/closed filter** to find currently open businesses
- **Bottom sheet** shop detail panel with swipe-down-to-close gesture

### Store Details
- **Hero image** with open/closed status and category badge
- **Contact info** — phone (tap to call), address, distance
- **Working hours** — full weekly schedule with today highlighted
- **About section** — detailed business description
- **Ratings & reviews** — star ratings, comment system stored in localStorage
- **Social links** — Telegram, Instagram, WhatsApp with brand-colored buttons
- **Navigation** — one-tap directions via Google Maps

### Appointment Booking
- **Online booking** for barbershops, clinics, beauty salons, and other service providers
- **Jalali (Persian) calendar** date picker with month navigation
- **Time slot grid** generated from shop working hours and slot duration
- **Slot availability** — booked and past slots are disabled
- **Booking confirmation** with success animation
- **Booking summary** — date, time, and customer info before submission

### Mobile-First Design
- **Yandex Maps-inspired UI** — clean cards, rounded corners, subtle shadows
- **iOS-optimized** — `interactive-widget=overlays-content` prevents keyboard displacement
- **Touch feedback** — tap animations on all interactive elements
- **Safe area insets** for notched devices
- **RTL layout** with Vazirmatn Persian font
- **Swipe-to-close** on all bottom sheets (shop detail + comments)

### Seed Data
- **104 shops** across 10 categories:
  - Grocery & bakeries
  - Pharmacies
  - Clothing & fashion
  - Auto services
  - Electronics
  - Barbershops & beauty (bookable)
  - Bookstores
  - Restaurants & cafes
  - Clinics & opticians (bookable)
  - Sports & fitness
- Working hours, social links, and descriptions for each shop

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS 4 |
| Map | Leaflet with OpenStreetMap tiles |
| Database | SQLite (better-sqlite3) |
| State | React useState/useEffect |
| Font | Vazirmatn (Google Fonts) |
| Calendar | jalaali-js (Jalali/Persian dates) |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open in browser
open http://localhost:3000
```

The SQLite database (`demo.db`) is auto-created and seeded with 104 shops on first run.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── appointments/route.ts    # Booking CRUD
│   │   ├── categories/route.ts      # Category list
│   │   └── shops/
│   │       ├── [id]/
│   │       │   ├── route.ts         # Shop detail + working hours
│   │       │   └── slots/route.ts   # Available time slots
│   │       └── route.ts             # Shop list with distance
│   ├── globals.css                  # Tailwind + Leaflet overrides
│   ├── layout.tsx                   # Root layout with fonts
│   └── page.tsx                     # Main app (client component)
├── components/
│   └── MapView.tsx                  # Client-only Leaflet map
└── lib/
    └── db.ts                        # SQLite schema + seed data
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories |
| GET | `/api/shops?lat=&lng=&radius=&category=&q=&open=` | Search shops by location, category, text, and open status |
| GET | `/api/shops/[id]` | Shop detail with all working hours |
| GET | `/api/shops/[id]/slots?date=YYYY-MM-DD` | Available booking slots for a date |
| POST | `/api/appointments` | Create a new appointment |
| GET | `/api/appointments?phone=` | List appointments by phone number |

## License

MIT
