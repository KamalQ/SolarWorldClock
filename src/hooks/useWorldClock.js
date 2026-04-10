import { useState, useEffect, useRef, useCallback } from 'react';
import { waitForEvenAppBridge } from '@evenrealities/even_hub_sdk';
import SunCalc from 'suncalc';
import CITY_COORDS from '../data/cityCoords';

const STORAGE_KEY = 'worldclock_cities';

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
  const localParts = new Intl.DateTimeFormat('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);
  const targetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(now);

  const getVal = (parts, type) => parts.find((p) => p.type === type)?.value;
  const localH = parseInt(getVal(localParts, 'hour'), 10);
  const localM = parseInt(getVal(localParts, 'minute'), 10);
  const targetH = parseInt(getVal(targetParts, 'hour'), 10);
  const targetM = parseInt(getVal(targetParts, 'minute'), 10);
  const localDay = parseInt(getVal(localParts, 'day'), 10);
  const targetDay = parseInt(getVal(targetParts, 'day'), 10);

  let diffH = targetH - localH + (targetDay - localDay) * 24;
  let diffM = targetM - localM;
  if (diffH > 12) diffH -= 24;
  if (diffH < -12) diffH += 24;

  if (diffH === 0 && diffM === 0) return 'Same time';
  const sign = diffH > 0 || (diffH === 0 && diffM > 0) ? '+' : '';
  if (diffM === 0) return `${sign}${diffH}h`;
  return `${sign}${diffH}h ${Math.abs(diffM)}m`;
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
  };
}

export default function useWorldClock() {
  const [cities, setCities] = useState([]);
  const [times, setTimes] = useState({});
  const bridgeReadyRef = useRef(false);

  // Load from SDK localStorage on mount
  useEffect(() => {
    async function load() {
      try {
        const bridge = await waitForEvenAppBridge();
        bridgeReadyRef.current = true;
        const stored = await bridge.getLocalStorage(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) setCities(parsed);
        }
      } catch (e) {
        // No bridge (preview mode) — try browser localStorage fallback
        try {
          const stored = localStorage.getItem(STORAGE_KEY);
          if (stored) setCities(JSON.parse(stored));
        } catch (_) {}
      }
    }
    load();
  }, []);

  // Save to SDK localStorage whenever cities change
  useEffect(() => {
    if (cities.length === 0 && !bridgeReadyRef.current) return;
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
    const { sunrise, sunset, solarNoon, dayLength, moonPhase, moonIllumination } = getSunTimes(cityObj.city, cityObj.timezone);
    const coords = CITY_COORDS[cityObj.city] || null;
    return { ...base, sunrise, sunset, solarNoon, dayLength, moonPhase, moonIllumination, coords };
  }, [times]);

  return { cities, addCity, removeCity, moveCity, getTimeInfo };
}
