# Even World Clock

A world clock app for the **Even Realities G2 smart glasses**, built with React and Vite.

Track multiple city times simultaneously — shown live on your glasses with a two-panel HUD layout.

## Features

- Add and remove cities from a searchable list of worldwide timezones
- Reorder cities — the top city gets a **featured panel** on the glasses with full detail
- Live time display on the G2 HUD, updated every second
- Timezone abbreviation and UTC offset relative to your local time
- Sunrise and sunset times for each city (toggleable detail view)
- City list persists across sessions via SDK localStorage

## Glasses HUD Layout

The display uses three text containers across the 576×288px canvas:

```
┌─────────────────────────────────────────────────┐
│              EVEN WORLD CLOCK (header)           │
├────────────────┬────────────────────────────────-┤
│  Featured city │  City list (up to 8 cities)     │
│  Full time     │  Name  Time  TZ  Offset         │
│  TZ + offset   │  ...                            │
│  Sunrise/set   │                                 │
└────────────────┴─────────────────────────────────┘
```

## Requirements

- **Node.js 22+** — check with `node -v`
- **Even Hub** app installed on your iPhone via TestFlight
- G2 glasses paired and connected to Even Hub

## Running the App

### 1. Install dependencies

```bash
cd apps/world-clock
npm install
```

### 2. Start the dev server

```bash
npm run dev
```

Vite will print output like:

```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://<your-local-ip>:5173/
```

Note the **Network** IP — you'll need it in the next step. Do not use `localhost`; your phone won't be able to reach it.

### 3. Load the app in Even Hub

You have two options:

**Option A — Generate a QR code image**

```bash
npx qrcode-terminal "http://<your-local-ip>:5173"
```

Or generate a PNG to scan from your camera roll:

```bash
npm install --no-save qrcode
node -e "
const QRCode = require('qrcode');
QRCode.toFile('qr.png', 'http://<your-local-ip>:5173', { scale: 8, margin: 2 }, (err) => {
  if (err) console.error(err);
  else console.log('qr.png created');
});
"
```

Replace `<your-local-ip>:5173` with the Network address from your Vite output.

**Option B — Use the Even Hub CLI**

```bash
evenhub qr --url http://<your-local-ip>:5173
```

Then open Even Hub on your iPhone, tap **Scan QR**, and scan the code. The app will load and connect to your glasses automatically.

### 4. Use the app

- Tap **Add City** to search for and add cities
- Drag the reorder arrows to promote a city to the featured slot
- Toggle **Show Details** to show sunrise/sunset times in the city list
- Tap **Show Display** if the glasses screen goes blank
- Tap **Shutdown** to turn off the glasses display

### Stopping the dev server

```bash
lsof -ti:5173 | xargs kill
```

## Controls (phone UI)

| Button | Action |
|---|---|
| Show Details | Toggle sunrise/sunset on the city list |
| Show Display | Re-initialise the glasses display |
| Shutdown | Turn off the glasses display |

## Tech Stack

- React 19, Vite
- `@evenrealities/even_hub_sdk` v0.0.7
- `@jappyjan/even-better-sdk` for bridge + localStorage
- `@jappyjan/even-realities-ui` for UI components
- `suncalc` for sunrise/sunset calculation
