# FarmerDataApp 

Mobile app to register farmer details, auto-fill location using PIN code, calculate distance from a predefined APMC market, and store all records locally. [file:130]

## Tech Stack
- React Native (Android) [file:130]
- Local storage: AsyncStorage [file:130]
- API: India Post PIN code API [file:130]
- Location: Device GPS (current location) [file:130]

## Features (as per assignment)
- Multi-step farmer registration form capturing: Farmer Name, Mobile Number, PIN code (first input), State (disabled initially), District (disabled initially), Taluka (disabled initially), Village, Crop Name, Acreage, Harvesting Date. [file:130]
- PIN code auto-complete:
  - Calls India Post API after 6-digit PIN entry.
  - If success: auto-fills State/District/Taluka and keeps those fields disabled.
  - If fail / not found: enables State/District/Taluka for manual entry. [file:130]
- Validations:
  - Mobile number must be 10-digit numeric.
  - PIN code must be 6-digit numeric.
  - Acreage must be numeric. [file:130]
- Distance calculation:
  - Calculates distance (KM) from farmer’s current location to Kalmeshwar APMC Market, Nagpur (Lat: 21.2400895, Lon: 78.9009647).
  - Stores distance value in local database (AsyncStorage). [file:130]
- Registered Farmers screen:
  - Shows all stored farmers in a tabular list view (search/sort UI improvements included). [file:130]

## Libraries Used
Main dependencies from `package.json`:
- `@react-native-async-storage/async-storage` (local storage)
- `axios` (API calls)
- `@react-native-community/geolocation` (current GPS location)
- `@react-native-community/datetimepicker` (harvesting date picker)
- `react-native-localize` (auto-detect country for calling code)
- `@react-navigation/native`, `@react-navigation/native-stack` (navigation)
- `react-native-screens`, `react-native-safe-area-context` (navigation performance helpers)

Note: Some dependencies may exist from setup experiments (e.g., reanimated/worklets). The app flow primarily depends on the items above.

## Prerequisites (Windows / Android)
- Node.js >= 20 (as per project engines)
- Java (JDK 17 recommended)
- Android Studio + Android SDK
- An Android emulator or real device with USB debugging enabled

> Note: If you deny location permission, distance calculation will not run until permission is granted.


## Setup & Run
```bash
# 1) Install dependencies
npm install

# 2) Start Metro
npm start

# 3) Run on Android (new terminal)
npm run android
