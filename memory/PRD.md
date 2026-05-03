# Gate ID Check - Product Requirements Document

## Overview
Mobile-first app for security guards at residential gates to verify residents by scanning their ID card barcodes. Works 100% offline after initial data sync.

## Architecture
- **Frontend**: React Native (Expo SDK 54) with tab navigation
- **Backend**: FastAPI with MongoDB
- **Offline Storage**: AsyncStorage for local resident database
- **Barcode Scanning**: expo-camera with QR/Code128/Code39/EAN support

## Key Features
1. **Barcode Scanner** - Scans resident ID barcodes using device camera
2. **Instant Lookup** - Pulls resident details from local database (no internet needed)
3. **Manual ID Entry** - Fallback for damaged barcodes
4. **Data Sync** - One-button pull of all resident data from server
5. **Admin Panel** - Add/delete residents (works offline)
6. **Access Log** - Automatic timestamped record of all scans

## Screens
- **SCAN**: Camera viewfinder + manual ID entry
- **LOG**: Chronological list of access entries
- **SYNC**: Status card + pull button + last sync time
- **ADMIN**: Resident list + add/delete functionality

## Data Model
### Resident
- id (string) - unique barcode identifier
- name, unit, phone, vehicle_plate
- photo_base64, status (active/inactive)
- created_at, updated_at

### AccessLog
- id, resident_id, resident_name, unit
- timestamp, status (verified/denied)

## API Endpoints
- GET /api/residents - List all
- GET /api/residents/{id} - Get one
- POST /api/residents - Create
- PUT /api/residents/{id} - Update
- DELETE /api/residents/{id} - Delete
- GET /api/sync - Bulk download for offline
- GET /api/access-logs - List logs
- POST /api/access-logs - Create log

## Seed Data
5 sample residents (RES001-RES005) auto-seeded on first startup.
