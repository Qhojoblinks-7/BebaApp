# BebaApp

A delivery and logistics platform connecting customers, food vendors, and delivery riders. BebaApp consists of a mobile-first customer web application (PWA), an Expo-powered rider mobile app, cloud functions for push notifications, and a Supabase-backed backend.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Apps](#apps)
  - [Customer Web (PWA)](#customer-web-pwa)
  - [Rider App (Expo)](#rider-app-expo)
- [Backend & Services](#backend--services)
  - [Firebase Cloud Functions](#firebase-cloud-functions)
  - [Vercel Serverless Function](#vercel-serverless-function)
  - [Supabase Database](#supabase-database)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Customer Web](#2-customer-web)
  - [3. Rider App](#3-rider-app)
  - [4. Firebase Functions](#4-firebase-functions)
  - [5. Vercel Function](#5-vercel-function)
  - [6. Supabase Schema](#6-supabase-schema)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Support](#support)

## Overview

BebaApp is a full-stack delivery platform designed for the Ghanaian market (operating primarily in Accra). It provides:

- **Customers** a quick way to browse vendors, place delivery orders, and track packages in real time via a mobile-first PWA.
- **Delivery Riders** a native iOS/Android companion app to receive jobs, manage active deliveries, track earnings, and monitor financial health.
- **Vendors** a streamlined booking interface for food and parcel orders.

Key flows:
- A customer searches for a vendor or enters a parcel delivery request on the customer web app.
- Orders are written to Firestore/Supabase, triggering rider notifications via Firebase Cloud Functions.
- A rider accepts or is assigned the job, updates status through the mobile app, and can capture delivery signatures.
- Riders track earnings, log manual cashflow, set budgets, and view AI-style smart insights on financial performance.

## Architecture

```
BebaApp (monorepo)
├── customer-web/     # Mobile-first PWA for customers
├── Rider-App/        # Expo React Native app for riders
├── functions/        # Firebase Cloud Functions (push notifications)
├── vercel-function/  # Vercel serverless function (earnings forecast)
└── supabase/         # Supabase SQL schema & migrations
```

Data is primarily stored in:
- **Firebase Firestore** — real-time syncing for orders, rider locations, and notifications.
- **Supabase PostgreSQL** — structured tables for users, geofences, budgets, insights, and revenue.

## Apps

### Customer Web (PWA)

A React SPA optimized for mobile browsers, installable as a PWA.

**Key screens:**
- **Home** — quick actions to place an order or track a shipment.
- **Vendors** — browse food vendors/delivery services, view delivery availability, fees, and distance.
- **Order** — submit a new delivery or food order using the instant booking flow.
- **Track** — enter a waybill to get live order status updates.

**Features:**
- PWA install prompt with iOS/Android fallbacks.
- Real-time order tracking.
- Vendor auto-booking for repeat customers.
- Distance calculation and geocoding.
- Toast notifications via Sonner.
- Dark mode support.
- Leaflet maps integration.

### Rider App (Expo)

A cross-platform iOS/Android app built with Expo SDK 54.

**Key screens & flows:**
- **Dashboard** — rider status overview, quick stats, and navigation shortcuts.
- **Job Queue (Hub)** — batch view of available orders with zone filtering.
- **Active Delivery (Manifest)** — current job details, pickup/dropoff navigation, and status updates (`pending` → `assigned` → `picked_up` → `in_transit` → `delivered`).
- **Delivery Closure** — signature capture, delivery pin verification, and completion flow.
- **Finances (Ledger)** — revenue breakdown, manual cash flow entries, budget allocations, smart insights, reports, and weekly summaries.
- **Notifications** — real-time job alerts, status change push notifications.
- **Profile & Settings** — notification preferences, privacy/security options, rider preferences, and support/help.

**Features:**
- React Navigation with bottom tabs and native stack transitions.
- Zustand state management.
- Background location tracking for live fleet telemetry.
- Expo push notifications with deep-link handling.
- Signature capture for deliveries.
- Dark mode theme with dynamic colors.

## Backend & Services

### Firebase Cloud Functions

Located in `functions/`. A Firebase Cloud Functions deployment that primarily handles push notifications for riders using the Expo Push Notification tooling.

**Triggers:**
- New order inserted into Firestore → notifies all online riders.
- Order status changes → notifies the assigned rider.
- Media upload handlers (profile images, assets).

### Vercel Serverless Function

Located in `vercel-function/`. A lightweight Node.js API (deployed on Vercel) that computes rider earnings forecasts.

- Accepts a `riderId` and optional `days` parameter.
- Pulls the last 60 revenue records from Firestore.
- Runs linear regression to predict upcoming earnings.
- Caches results for 30 minutes to reduce Firestore reads and compute cost.
- Returns a structured forecast with trend, confidence, weekly breakdown, and recommendations.

### Supabase Database

Located in `supabase/schema.sql`. A comprehensive PostgreSQL schema with Row Level Security (RLS) policies.

**Schema domains:**
1. **User Management** — `users`, `profiles`, auth triggers.
2. **Logistics & Geolocation** — `geofences`, `rider_status`, `rider_locations`, polygon geofence functions.
3. **Orders & Notifications** — `orders`, `notifications`, batch processing, `check_point_geofence` utility.
4. **Financials** — `revenue`, `manual_entries`, `budget_allocations`, `budget_items`.
5. **Business Insights** — `insights`, `insight_actions`.
6. **Settings & Preferences** — `notification_settings`, `privacy_security_settings`, `rider_preferences`.
7. **Storage Policies** — avatars bucket with per-user access controls.

## Tech Stack

### Customer Web
- React 19
- Vite 8
- Tailwind CSS v4 with `@tailwindcss/vite`
- shadcn/ui (Radix UI primitives)
- TanStack Query (React Query)
- Zod + TanStack Form
- Firebase v12
- Leaflet / React Leaflet
- Lucide icons
- Sonner (toasts)
- Vite PWA plugin (`vite-plugin-pwa`)

### Rider App
- Expo SDK 54
- React Native 0.81 + React 19
- React Navigation (native stack + bottom tabs)
- Zustand
- Firebase v12
- Expo modules: Location, Notifications, Image Picker, Task Manager, Updates, Status Bar
- React Native Maps
- React Native Signature Canvas
- Lucide React Native

### Cloud & Database
- Firebase Firestore (primary noSQL datastore)
- Firebase Cloud Functions (push notifications)
- Supabase PostgreSQL (structured data, budgets, insights, geofences)
- Vercel Serverless Functions (earnings forecast)

## Prerequisites

- **Node.js** 18+ (Customer Web & Vercel Function); Node 22.x for Vercel Functions runtime.
- **npm** or **bun**
- **Expo CLI** (`npm install -g expo-cli`)
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Supabase CLI** (optional, for local schema migrations)
- **Vercel CLI** (optional, for local function preview)
- iOS Simulator / Android Emulator (for Rider App development)

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-org>/BebaApp.git
cd BebaApp
```

### 2. Customer Web

```bash
cd customer-web
cp .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. For production builds:

```bash
npm run build
npm run preview
```

### 3. Rider App

```bash
cd Rider-App
cp .env.example .env
npm install
npx expo start
```

Scan the QR code with the Expo Go app, or run on a simulator:

```bash
npx expo run:android
npx expo run:ios
```

To generate a development build:

```bash
eas build --profile development --platform android
eas build --profile development --platform ios
```

### 4. Firebase Functions

```bash
cd functions
cp .env.example .env
npm install
firebase use --add
firebase deploy --only functions
```

Logs:

```bash
firebase functions:log
```

### 5. Vercel Function

```bash
cd vercel-function
cp .env.example .env
npm install
vercel link
vercel deploy
```

### 6. Supabase Schema

1. Create a new Supabase project.
2. Navigate to the SQL Editor in the Supabase dashboard.
3. Run the contents of `supabase/schema.sql`.
4. Enable the `avatars` storage bucket and apply the storage policies defined in the schema.

## Environment Variables

Each service has its own `.env.example`. Copy it to `.env` and fill in the values.

**Customer Web** (`.env.local`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Rider App** (`.env`):
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_EXPO_PUSH_TOKEN_ENDPOINT`
- `EXPO_PUBLIC_EXPO_ACCOUNT_ID`

**Firebase Functions** (`.env`):
- `FIREBASE_CONFIG`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Vercel Function** (`.env`):
- Firebase credentials (auto-injected via Vercel integration or `FIREBASE_SERVICE_ACCOUNT`).

## Database Setup

The Supabase schema (`supabase/schema.sql`) creates the full data model including:

- User authentication triggers and profiles.
- Geofence boundaries and rider location tracking.
- Order lifecycle tables with automatic new-order and status-change notifications.
- Revenue, budget allocations, manual entries, and budget items for rider financials.
- Insights and action plans for business intelligence.
- Notification, privacy, and rider preference settings.
- Storage RLS policies for avatar uploads.

Run the schema as a one-time migration in Supabase, or use Supabase migrations for version control.

## Deployment

- **Customer Web:** Build with `npm run build` and deploy the `dist/` folder to Vercel, Netlify, or Firebase Hosting.
- **Rider App:** Build and distribute via EAS (`eas build`, `eas submit`) for TestFlight / Google Play beta. OTA updates via `expo-updates`.
- **Firebase Functions:** `firebase deploy --only functions`
- **Vercel Function:** `vercel deploy` or connect the `vercel-function/` directory to a Vercel project.

## Project Structure

```
BebaApp/
├── customer-web/                  # Customer PWA
│   ├── public/
│   └── src/
│       ├── screens/               # Home, Order, Track, Vendor
│       ├── components/
│       ├── lib/                   # Services, utilities, distance tools
│       ├── context/
│       ├── services/
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── Rider-App/                     # Rider mobile app
│   ├── App.js
│   ├── app.json                   # Expo config (splash, icons, permissions)
│   ├── src/
│   │   ├── navigation/
│   │   ├── screens/rider/         # 20+ screens
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   └── utils/
│   ├── .env.example
│   └── AGENTS.md                  # Expo v54 dev notes
│
├── functions/                     # Firebase Cloud Functions
│   ├── index.js                   # Firestore triggers, media handlers
│   ├── src/
│   ├── .env.example
│   └── package.json
│
├── vercel-function/               # Vercel serverless function
│   ├── api/forecast/index.js      # Earnings forecast endpoint
│   ├── app/
│   ├── .env.example
│   └── package.json
│
├── supabase/
│   └── schema.sql                 # Full PostgreSQL schema with RLS
│
├── UI_UX_DESIGN_GUIDE.md          # Design system reference
├── vercel.json
└── README.md                      # This file
```

## Support

For support, feature requests, or bug reports:

- Email: [support@beba.express](mailto:support@beba.express)
- Rider App Help: In-app Help & Support screen
