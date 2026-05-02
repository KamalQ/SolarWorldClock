import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';

const STORAGE_KEY = 'worldclock_cities';
const CITIES = [
  { city: 'Toronto',       timezone: 'America/Toronto',      country: 'CA' },
  { city: 'San Francisco', timezone: 'America/Los_Angeles',  country: 'US' },
  { city: 'Dubai',         timezone: 'Asia/Dubai',           country: 'AE' },
  { city: 'Tokyo',         timezone: 'Asia/Tokyo',           country: 'JP' },
  { city: 'Singapore',     timezone: 'Asia/Singapore',       country: 'SG' },
];

const json = JSON.stringify(CITIES);

try {
  const bridge = await waitForEvenAppBridge();
  await bridge.setLocalStorage(STORAGE_KEY, json);
} catch (_) {}

try { localStorage.setItem(STORAGE_KEY, json); } catch (_) {}

(location as Location).href = '/';
