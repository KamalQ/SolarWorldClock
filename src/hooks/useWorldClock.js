import { useState, useEffect, useRef, useCallback } from 'react';
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import SunCalc from 'suncalc';
import CITY_COORDS from '../data/cityCoords';

const STORAGE_KEY = 'worldclock_cities';

// Cache getSunTimes results per city per calendar date — solar/moon data changes daily, not per second.
const sunTimesCache = {};
function getCachedSunTimes(cityName, timezone) {
  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  const key = cityName + '|' + today;
  if (!sunTimesCache[key]) {
    // Clear stale entries from previous days
    for (const k of Object.keys(sunTimesCache)) {
      if (!k.endsWith(today)) delete sunTimesCache[k];
    }
    sunTimesCache[key] = getSunTimes(cityName, timezone);
  }
  return sunTimesCache[key];
}

function getTimeInZone(timezone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date());
}

function getOffsetFromLocal(timezone) {
  const now = new Date();
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  // Parse the wall-clock time in each zone as a plain Date (year/month crossings handled correctly)
  const toWall = (tz) => new Date(now.toLocaleString('en-US', { timeZone: tz }));
  const diffMin = Math.round((toWall(timezone) - toWall(localTz)) / 60000);
  if (diffMin === 0) return 'Same time';
  const sign = diffMin > 0 ? '+' : '';
  const h = Math.trunc(diffMin / 60);
  const m = Math.abs(diffMin % 60);
  return m === 0 ? `${sign}${h}h` : `${sign}${h}h ${m}m`;
}

function getAbbreviation(timezone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).formatToParts(new Date());
  return parts.find((p) => p.type === 'timeZoneName')?.value || '';
}

function getMoonPhaseLabel(phase) {
  if (phase < 0.02 || phase >= 0.98) return 'New Moon';
  if (phase < 0.23) return 'Waxing Crescent';
  if (phase < 0.27) return 'First Quarter';
  if (phase < 0.48) return 'Waxing Gibbous';
  if (phase < 0.52) return 'Full Moon';
  if (phase < 0.73) return 'Waning Gibbous';
  if (phase < 0.77) return 'Last Quarter';
  return 'Waning Crescent';
}

function getSunTimes(cityName, timezone) {
  const coords = CITY_COORDS[cityName];
  const now = new Date();
  const moon = SunCalc.getMoonIllumination(now);
  const moonPhase = getMoonPhaseLabel(moon.phase);
  const moonIllumination = Math.round(moon.fraction * 100);

  if (!coords) return { sunrise: null, sunset: null, solarNoon: null, dayLength: null, moonPhase, moonIllumination };

  const times = SunCalc.getTimes(now, coords.lat, coords.lng);
  const fmt = (d) => {
    if (!d || isNaN(d)) return null;
    return d.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  let dayLength = null;
  if (times.sunrise && times.sunset && !isNaN(times.sunrise) && !isNaN(times.sunset)) {
    const ms = times.sunset - times.sunrise;
    const totalMins = Math.round(ms / 60000);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    dayLength = m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  return {
    sunrise: fmt(times.sunrise),
    sunset: fmt(times.sunset),
    solarNoon: fmt(times.solarNoon),
    dayLength,
    moonPhase,
    moonIllumination,
    // Photography — golden hour and blue hour (approximated via civil/nautical twilight)
    goldenHourMorningStart: fmt(times.sunrise),
    goldenHourMorningEnd: fmt(times.goldenHourEnd),
    goldenHourEveningStart: fmt(times.goldenHour),
    goldenHourEveningEnd: fmt(times.sunsetStart),
    blueHourMorningStart: fmt(times.nauticalDawn),
    blueHourMorningEnd: fmt(times.dawn),
    blueHourEveningStart: fmt(times.dusk),
    blueHourEveningEnd: fmt(times.nauticalDusk),
  };
}

export default function useWorldClock() {
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [times, setTimes] = useState({});
  const bridgeReadyRef = useRef(false);
  // Suppresses the save-back that would otherwise fire when we load cities from the bridge
  const skipNextSaveRef = useRef(false);

  // Load from SDK localStorage on mount
  useEffect(() => {
    // Fast path: populate synchronously from browser localStorage (no BLE roundtrip).
    // By the time waitForEvenAppBridge resolves, React will have already re-rendered
    // with real cities so createStartUpPageContainer sees them on the first call.
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          skipNextSaveRef.current = true;
          setCities(parsed);
          setIsLoading(false);
        }
      }
    } catch (_) {}

    // Authoritative path: reconcile with bridge storage
    async function load() {
      try {
        const bridge = await waitForEvenAppBridge();
        bridgeReadyRef.current = true;
        const stored = await bridge.getLocalStorage(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            skipNextSaveRef.current = true;
            setCities(parsed);
          }
        }
      } catch (_) {
        // Bridge unavailable — browser localStorage already applied above
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Save to SDK localStorage whenever cities change (skip when the change came from a load)
  useEffect(() => {
    if (cities.length === 0 && !bridgeReadyRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    async function save() {
      const json = JSON.stringify(cities);
      try {
        const bridge = await waitForEvenAppBridge();
        await bridge.setLocalStorage(STORAGE_KEY, json);
      } catch (_) {}
      try { localStorage.setItem(STORAGE_KEY, json); } catch (_) {}
    }
    save();
  }, [cities]);

  // Update times every second
  useEffect(() => {
    function update() {
      const t = {};
      for (const c of cities) {
        t[c.timezone + c.city] = {
          time: getTimeInZone(c.timezone),
          offset: getOffsetFromLocal(c.timezone),
          abbr: getAbbreviation(c.timezone),
        };
      }
      setTimes(t);
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [cities]);

  const addCity = useCallback((cityObj) => {
    setCities((prev) => {
      if (prev.some((c) => c.city === cityObj.city)) return prev;
      return [...prev, cityObj];
    });
  }, []);

  const removeCity = useCallback((cityName) => {
    setCities((prev) => prev.filter((c) => c.city !== cityName));
  }, []);

  const moveCity = useCallback((fromIndex, toIndex) => {
    setCities((prev) => {
      if (toIndex < 0 || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const getTimeInfo = useCallback((cityObj) => {
    const base = times[cityObj.timezone + cityObj.city] || {
      time: getTimeInZone(cityObj.timezone),
      offset: getOffsetFromLocal(cityObj.timezone),
      abbr: getAbbreviation(cityObj.timezone),
    };
    const sunData = getCachedSunTimes(cityObj.city, cityObj.timezone);
    const coords = CITY_COORDS[cityObj.city] || null;
    return { ...base, ...sunData, coords };
  }, [times]);

  return { cities, isLoading, addCity, removeCity, moveCity, getTimeInfo };
}
