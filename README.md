# BebaApp

![GitHub License](https://img.shields.io/badge/license-MIT-blue)
![Built with React](https://img.shields.io/badge/built%20with-React-61DAFB?logo=react)
![Built with Expo](https://img.shields.io/badge/built%20with-Expo-000020?logo=expo)
![Node.js](https://img.shields.io/badge/node-%3E%3D18.0-339933?logo=node.js)

## Overview

**BebaApp** is a full-stack delivery and logistics platform designed for modern urban logistics. It connects customers, food vendors, and delivery riders through an integrated ecosystem of mobile and web applications.

### Key Features

- 📱 **Mobile-First PWA** for customers to browse vendors, place orders, and track deliveries in real-time
- 🚴 **Native iOS/Android App** for delivery riders to manage jobs, track earnings, and optimize routes
- 🏢 **Vendor Management** with streamlined booking interfaces for food and parcel orders
- 💰 **Financial Dashboard** with revenue tracking, budget management, and AI-powered earnings forecasts
- 📍 **Real-Time Tracking** using GPS and geofencing for precise location monitoring
- 🔔 **Push Notifications** for order updates and rider alerts
- ✍️ **Digital Signatures** for delivery verification and compliance

### Platform Architecture

BebaApp operates as a monorepo containing specialized applications:

```
BebaApp
├── customer-web/     # React PWA for end customers
├── Rider-App/        # React Native (Expo) for delivery partners
├── functions/        # Firebase Cloud Functions
├── vercel-function/  # Earnings forecast microservice
└── supabase/         # PostgreSQL schema & migrations
```

---

## Technology Stack

### Frontend

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Customer Web** | React 19, Vite, TypeScript | Mobile-optimized progressive web app |
| **Styling** | Tailwind CSS v4, shadcn/ui | Component library and design system |
| **State Management** | TanStack Query, Zod | Server state, form validation |
| **Maps & Location** | Leaflet, React Leaflet | Interactive mapping and distance calculation |
| **Icons** | Lucide React | Consistent iconography |

### Mobile

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Expo SDK 54, React Native 0.81 | Cross-platform iOS/Android development |
| **Navigation** | React Navigation | Tab-based and stack navigation patterns |
| **State** | Zustand | Lightweight client-side state |
| **Services** | Expo modules (Location, Notifications, TaskManager) | Native device capabilities |
| **Maps** | React Native Maps | Native map integration |

### Backend & Database

| Service | Technology | Purpose |
|---------|-----------|---------|
| **Real-Time DB** | Firebase Firestore | Orders, locations, notifications |
| **Authentication** | Firebase Auth | User identity & access |
| **Cloud Functions** | Firebase Cloud Functions | Push notifications, event processing |
| **Analytics DB** | Supabase PostgreSQL | Structured data, geofences, budgets, insights |
| **Forecasting API** | Vercel Serverless Functions | Machine learning predictions |

---

## Project Structure

```
BebaApp/
├── customer-web/
│   ├── public/                    # Static assets
│   ├── src/
│   │   ├── screens/               # Page-level components (Home, Order, Track, Vendors)
│   │   ├── components/            # Reusable UI components
│   │   ├── lib/                   # Utilities (geocoding, distance, API clients)
│   │   ├── context/               # React context (theme, auth)
│   │   ├── services/              # Firebase & Supabase integrations
│   │   ├── App.jsx                # Root component
│   │   └── index.css              # Global styles
│   ├── vite.config.js
│   └── package.json
│
├── Rider-App/
│   ├── App.js                     # Entry point
│   ├── app.json                   # Expo configuration
│   ├── src/
│   │   ├── navigation/            # Stack & tab navigation
│   │   ├── screens/               # 20+ app screens
│   │   │   ├── dashboard/
│   │   │   ├── jobs/
│   │   │   ├── delivery/
│   │   │   ├── finances/
│   │   │   └── profile/
│   │   ├── components/            # Shared components
│   │   ├── store/                 # Zustand stores
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # Firebase, Supabase clients
│   │   └── utils/                 # Helper functions
│   └── package.json
│
├── functions/
│   ├── index.js                   # Main function handlers
│   ├── src/
│   │   ├── notifications/         # Push notification logic
│   │   ├── handlers/              # Firestore trigger handlers
│   │   └── utils/                 # Common utilities
│   ├── .env.example
│   └── package.json
│
├── vercel-function/
│   ├── api/
│   │   └── forecast/              # Earnings prediction endpoint
│   ├── lib/                       # Regression & analysis logic
│   ├── .env.example
│   └── package.json
│
├── supabase/
│   ├── schema.sql                 # PostgreSQL schema with RLS
│   └── migrations/                # Version-controlled migrations
│
├── UI_UX_DESIGN_GUIDE.md          # Design system reference
└── README.md
```

---

## Core Applications

### Customer Web (Progressive Web App)

A mobile-first React application optimized for iOS and Android browsers.

**Key Screens:**
- **Home** — Quick order placement or shipment tracking
- **Vendors** — Browse available delivery services and food vendors
- **Order** — Intuitive booking flow with real-time availability
- **Track** — Live order status updates via waybill lookup

**Features:**
- PWA installation for app-like experience
- Dark mode support
- Real-time order tracking with WebSockets
- Distance-based delivery fee calculation
- Offline support via service workers

**Quick Start:**
```bash
cd customer-web
npm install
npm run dev  # http://localhost:5173
```

### Rider App (Native Mobile)

Cross-platform iOS/Android application built with Expo and React Native.

**Key Screens:**
- **Dashboard** — Overview of earnings, active jobs, and quick stats
- **Job Queue (Hub)** — Batch view of available deliveries with zone filtering
- **Active Delivery (Manifest)** — Real-time job tracking with navigation
- **Delivery Closure** — Signature capture and delivery verification
- **Finances (Ledger)** — Revenue breakdown, manual entries, budgets, and insights
- **Notifications** — Real-time job alerts and status updates
- **Profile & Settings** — Preferences, privacy controls, and support

**Features:**
- Background location tracking for fleet telemetry
- Expo push notifications with deep-link handling
- Signature capture for legally compliant deliveries
- Dynamic UI theming
- Offline-first architecture with React Query caching

**Quick Start:**
```bash
cd Rider-App
npm install
npx expo start  # Scan QR code or run on simulator
```

### Backend Services

#### Firebase Cloud Functions
Serverless event handlers for push notifications and media processing.

**Triggers:**
- New order created → Notify available riders
- Order status changed → Notify assigned rider
- Media uploaded → Process and optimize images

**Deploy:**
```bash
cd functions
npm install
firebase deploy --only functions
```

#### Vercel Earnings Forecast API
Machine learning microservice for predictive analytics.

**Endpoint:** `POST /api/forecast`

**Payload:**
```json
{
  "riderId": "string",
  "days": 7
}
```

**Response:**
```json
{
  "forecast": 450.50,
  "trend": "up",
  "confidence": 0.85,
  "weekly_breakdown": [...],
  "recommendations": [...]
}
```

#### Supabase PostgreSQL
Structured database for user management, geofences, budgets, and business intelligence.

**Key Tables:**
- `users`, `profiles` — Authentication and user metadata
- `riders`, `rider_locations`, `rider_status` — Rider management
- `geofences`, `service_zones` — Geographic coverage
- `orders`, `deliveries` — Order lifecycle
- `revenue`, `manual_entries`, `budget_allocations` — Financial tracking
- `insights`, `insight_actions` — Business intelligence
- `notification_settings`, `privacy_security_settings` — User preferences

---

## Getting Started

### Prerequisites

- **Node.js** 18+ (20+ for Vercel Functions)
- **npm** or **bun** package manager
- **Expo CLI**: `npm install -g expo-cli`
- **Firebase CLI**: `npm install -g firebase-tools`
- **Git**

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Qhojoblinks-7/BebaApp.git
   cd BebaApp
   ```

2. **Customer Web:**
   ```bash
   cd customer-web
   cp .env.example .env.local
   npm install
   npm run dev
   ```
   Open http://localhost:5173

3. **Rider App:**
   ```bash
   cd Rider-App
   cp .env.example .env
   npm install
   npx expo start
   ```
   Scan QR code with Expo Go or run:
   ```bash
   npx expo run:android    # Android Emulator
   npx expo run:ios        # iOS Simulator
   ```

4. **Firebase Functions:**
   ```bash
   cd functions
   cp .env.example .env
   npm install
   firebase use --add
   firebase deploy --only functions
   ```

5. **Vercel Function:**
   ```bash
   cd vercel-function
   cp .env.example .env
   npm install
   vercel link
   vercel deploy
   ```

6. **Supabase Database:**
   - Create a new Supabase project
   - Navigate to SQL Editor
   - Execute `supabase/schema.sql`
   - Enable the `avatars` storage bucket

---

## Environment Configuration

Each service requires specific environment variables. See individual `.env.example` files:

### Customer Web (`.env.local`)
```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Rider App (`.env`)
```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_EXPO_ACCOUNT_ID=...
```

### Firebase Functions (`.env`)
```env
FIREBASE_CONFIG=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Vercel Function (`.env`)
```env
FIREBASE_SERVICE_ACCOUNT=...
```

---

## Deployment

### Customer Web
```bash
cd customer-web
npm run build
# Deploy dist/ folder to Vercel, Netlify, or Firebase Hosting
```

### Rider App
```bash
# Create development build
eas build --profile development --platform android

# Submit to stores
eas build --platform ios
eas submit --platform ios
```

### Firebase Functions
```bash
cd functions
firebase deploy --only functions
```

### Vercel Function
```bash
cd vercel-function
vercel deploy
```

---

## Development Workflow

### Local Development
```bash
# Terminal 1: Customer Web
cd customer-web && npm run dev

# Terminal 2: Rider App
cd Rider-App && npx expo start

# Terminal 3: Firebase Emulator (optional)
firebase emulators:start
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking (where TypeScript is configured)
npm run type-check
```

### Testing
```bash
# Run tests (configure in each workspace)
npm test
```

---

## API Reference

### Order Placement
- **Create Order** `POST /api/orders`
- **Get Order Status** `GET /api/orders/:id`
- **Track Delivery** `GET /api/track/:waybill`

### Rider Operations
- **Accept Job** `POST /api/jobs/:id/accept`
- **Update Status** `PATCH /api/deliveries/:id/status`
- **Capture Signature** `POST /api/deliveries/:id/signature`

### Financial Analytics
- **Get Earnings** `GET /api/riders/:id/earnings`
- **Forecast Revenue** `POST /api/forecast`
- **Budget Summary** `GET /api/riders/:id/budgets`

For complete API documentation, refer to service-specific README files.

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Code Standards
- Follow existing code style and conventions
- Write meaningful commit messages
- Include comments for complex logic
- Test changes locally before submitting PR

---

## Troubleshooting

### Expo CLI Issues
```bash
# Clear cache and reinstall
expo prebuild --clean
rm -rf node_modules
npm install
```

### Firebase Connection Issues
```bash
# Check configuration
firebase projects:list

# View function logs
firebase functions:log
```

### Database Connection
```bash
# Test Supabase connection
psql postgres://{user}:{password}@{host}:{port}/{database}
```

---

## Performance & Optimization

### Frontend
- **Code Splitting**: Implemented via Vite for customer web
- **Image Optimization**: WebP format with fallbacks
- **Caching**: TanStack Query for smart API caching
- **PWA**: Service workers for offline support

### Mobile
- **Bundle Size**: Expo EAS optimized builds
- **Memory**: Zustand for efficient state management
- **Battery**: Smart background location tracking
- **Network**: Offline-first with React Query

### Backend
- **Function Optimization**: Firebase function memory tuning
- **Database**: PostgreSQL query optimization and indexing
- **Caching**: 30-minute forecast result caching on Vercel

---

## Security

- **Authentication**: Firebase Auth with role-based access
- **Database Security**: Supabase Row-Level Security (RLS) policies
- **API Protection**: Firebase Auth tokens on all endpoints
- **Storage**: Encrypted file storage with per-user access controls
- **Secrets Management**: Environment variables for sensitive data

---

## License

This project is licensed under the MIT License — see the LICENSE file for details.

---

## Support & Contact

For questions, bug reports, or feature requests:

- **Email**: [support@beba.express](mailto:support@beba.express)
- **Issues**: [GitHub Issues](https://github.com/Qhojoblinks-7/BebaApp/issues)
- **In-App Help**: Available in Rider App settings

---

## Acknowledgments

- Built with modern React and React Native ecosystems
- Leverages Firebase and Supabase for scalable backends
- Design system inspired by best practices in logistics platforms
- Community contributions and feedback greatly appreciated

---

**Last Updated:** September 2026 | **Status:** Active Development
