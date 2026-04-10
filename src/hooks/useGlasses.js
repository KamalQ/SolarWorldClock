import { useState, useRef, useCallback, useEffect } from 'react';
import {
  waitForEvenAppBridge,
  CreateStartUpPageContainer,
  RebuildPageContainer,
  TextContainerProperty,
  TextContainerUpgrade,
  OsEventTypeList,
  EventSourceType,
  LAUNCH_SOURCE_GLASSES_MENU,
} from '@evenrealities/even_hub_sdk';
import { buildScrollableList } from 'even-toolkit/glass-display-builders';
import { renderTextPageLines } from 'even-toolkit/types';

// ─── Header ──────────────────────────────────────────────────────────────────
function formatHeader() {
  return '                                      SOLAR WORLD CLOCK';
}

// ─── Left panel: featured city with full detail (196px wide) ─────────────────
function centerInPanel(text, usableWidth = 184, charPx = 10, spacePx = 5) {
  const textPx = text.length * charPx;
  const spaces = Math.max(0, Math.round((usableWidth - textPx) / 2 / spacePx));
  return ' '.repeat(spaces) + text;
}

function formatCoords(coords) {
  if (!coords) return ['\u2014', '\u2014'];
  const lat = Math.abs(coords.lat).toFixed(1) + '\u00B0' + (coords.lat >= 0 ? 'N' : 'S');
  const lng = Math.abs(coords.lng).toFixed(1) + '\u00B0' + (coords.lng >= 0 ? 'E' : 'W');
  return [lat, lng];
}

function formatFeatured(city, mode = 'cities') {
  if (!city) return '\n  Add a city\n  in the app\n \n \n ';
  const shortTime = city.time.replace(/:\d{2}\s/, ' ');

  let bottomLines;
  if (mode === 'solar' && city.coords) {
    const [lat, lng] = formatCoords(city.coords);
    bottomLines = [
      centerInPanel(`Lat  ${lat}`, 184, 9, 5),
      centerInPanel(`Lng  ${lng}`, 184, 9, 5),
    ];
  } else {
    const sunriseStr = city.sunrise ? `Sunrise   ${city.sunrise}` : 'Sunrise   \u2014';
    const sunsetStr  = city.sunset  ? `Sunset    ${city.sunset}`  : 'Sunset    \u2014';
    bottomLines = [
      centerInPanel(sunriseStr, 184, 9, 5),
      centerInPanel(sunsetStr,  184, 9, 5),
    ];
  }

  return [
    centerInPanel(city.name),
    ' ',
    centerInPanel(`${shortTime}  ${city.abbr}`),
    city.offset !== 'Same time' ? centerInPanel(city.offset) : ' ',
    ' ',
    ...bottomLines,
  ].join('\n');
}

// ─── Right panel: Solar mode (362px wide) ────────────────────────────────────
function formatSolar(city) {
  if (!city) return '\n  Add a city\n  to see solar data';
  if (!city.sunrise && !city.solarNoon) {
    return `\n  ${city.name}\n\n  No solar data\n  for this city`;
  }
  const pad = '          ';
  const row = (label, value) => {
    const padded = label.padEnd(12);
    return `${pad}${padded}${value ?? '\u2014'}`;
  };
  return [
    row('Sunrise',    city.sunrise),
    row('Solar Noon', city.solarNoon),
    row('Sunset',     city.sunset),
    ' ',
    row('Day Length', city.dayLength),
    ' ',
    `${pad}${city.moonPhase ?? ''}`,
    row('Illuminated', city.moonIllumination != null ? `${city.moonIllumination}%` : null),
  ].join('\n');
}

// ─── Right panel: city list using buildScrollableList ────────────────────────
// For showDetails=true, we use a two-line-per-city approach (manual string).
// For showDetails=false, buildScrollableList handles pagination + scroll indicators.
const MAX_LINE_CHARS = 36;

function formatListDetailed(cities) {
  const subset = cities.slice(0, 4);
  const entries = subset.map(c => {
    const shortTime = c.time.replace(/:\d{2}\s/, ' ');
    const offset = c.offset === 'Same time' ? '' : c.offset;
    return { name: c.name, shortTime, abbr: c.abbr, offset, sunrise: c.sunrise, sunset: c.sunset };
  });

  const maxNameLen = Math.max(...entries.map(e => e.name.length));
  const idealPadTo = maxNameLen + 2;

  return entries.map(({ name, shortTime, abbr, offset, sunrise, sunset }) => {
    const tail = offset ? `${shortTime}  ${abbr}  ${offset}` : `${shortTime}  ${abbr}`;
    const tailLen = tail.length;
    let padTo = idealPadTo;
    while (padTo > 0 && 1 + padTo + tailLen > MAX_LINE_CHARS) padTo--;

    let displayName;
    if (padTo >= name.length) {
      displayName = name.padEnd(padTo);
    } else if (padTo >= 4) {
      displayName = name.slice(0, padTo - 2) + '..';
    } else {
      displayName = name.slice(0, Math.max(1, padTo));
    }

    const line = ` ${displayName}${tail}`;
    if (!sunrise && !sunset) return line;
    const detailParts = [];
    if (sunrise) detailParts.push(`\u2191 ${sunrise}`);
    if (sunset)  detailParts.push(`\u2193 ${sunset}`);
    return `${line}\n  ${detailParts.join('  ')}`;
  }).join('\n');
}

function formatList(cities, showDetails = false) {
  if (cities.length === 0) return '  No other cities\n  Add via phone';

  if (showDetails) {
    return formatListDetailed(cities);
  }

  // Use buildScrollableList for automatic scroll indicators
  const displayLines = buildScrollableList({
    items: cities,
    highlightedIndex: -1,  // no cursor highlight
    maxVisible: 8,
    formatter: (c) => {
      const shortTime = c.time.replace(/:\d{2}\s/, ' ');
      const offset = c.offset === 'Same time' ? '' : c.offset;
      // Compact single-line format: " CityName  9:45 AM  EST  +2h"
      const tail = offset ? `${shortTime}  ${c.abbr}  ${offset}` : `${shortTime}  ${c.abbr}`;
      const maxNameLen = Math.max(...cities.map(x => x.name.length));
      const padTo = Math.min(maxNameLen + 2, MAX_LINE_CHARS - tail.length - 1);
      let displayName = c.name.length <= padTo ? c.name.padEnd(padTo) : c.name.slice(0, padTo - 2) + '..';
      return ` ${displayName}${tail}`;
    },
  });
  return renderTextPageLines(displayLines);
}

const RIGHTMODE_KEY = 'worldclock_rightmode';

export default function useGlasses({ getCityData }) {
  const [status, setStatus] = useState('Waiting for bridge...');
  const [connected, setConnected] = useState(false);
  const [eventLog, setEventLog] = useState([]);
  const [showDetails, setShowDetails] = useState(false);
  const [rightMode, setRightMode] = useState('solar'); // 'cities' | 'solar'

  const bridgeRef = useRef(null);
  const isStartupCreatedRef = useRef(false);
  const lastContentRef = useRef('');
  const bridgeReadyRef = useRef(false);

  // Persist rightMode whenever it changes
  useEffect(() => {
    if (!bridgeReadyRef.current) return;
    const bridge = bridgeRef.current;
    if (bridge) {
      bridge.setLocalStorage(RIGHTMODE_KEY, rightMode).catch(() => {});
    }
    try { localStorage.setItem(RIGHTMODE_KEY, rightMode); } catch (_) {}
  }, [rightMode]);

  const logEvent = useCallback((msg) => {
    const ts = new Date().toLocaleTimeString();
    const line = `[${ts}] ${msg}`;
    console.log(line);
    setEventLog((prev) => {
      const next = [...prev, line];
      return next.length > 30 ? next.slice(-30) : next;
    });
  }, []);

  const buildConfig = useCallback((cityData, details = false, mode = 'cities') => {
    const featured = cityData[0] || null;
    const rest = cityData.slice(1);
    const rightContent = mode === 'solar'
      ? formatSolar(featured)
      : formatList(rest, details);
    const leftContent = formatFeatured(featured, mode);

    return {
      containerTotalNum: 3,
      textObject: [
        new TextContainerProperty({
          xPosition: 6,   yPosition: 2,
          width: 564,     height: 40,
          containerID: 1, containerName: 'header',
          content: formatHeader(),
          isEventCapture: 1,
          borderWidth: 1, borderColor: 5, borderRadius: 3, paddingLength: 4,
        }),
        new TextContainerProperty({
          xPosition: 6,   yPosition: 44,
          width: 196,     height: 242,
          containerID: 2, containerName: 'featured',
          content: leftContent,
          isEventCapture: 0,
          borderWidth: 1, borderColor: 8, borderRadius: 3, paddingLength: 6,
        }),
        new TextContainerProperty({
          xPosition: 208, yPosition: 44,
          width: 362,     height: 242,
          containerID: 3, containerName: 'list',
          content: rightContent,
          isEventCapture: 0,
          borderWidth: 1, borderColor: 5, borderRadius: 3, paddingLength: 6,
        }),
      ],
    };
  }, []);

  const sendPage = useCallback(async (config) => {
    const bridge = bridgeRef.current;
    if (!bridge) return;
    try {
      if (!isStartupCreatedRef.current) {
        const rc = await bridge.createStartUpPageContainer(new CreateStartUpPageContainer(config));
        if (rc === 0) {
          isStartupCreatedRef.current = true;
          logEvent('Display created');
        }
      } else {
        await bridge.rebuildPageContainer(new RebuildPageContainer(config));
      }
    } catch (err) {
      console.error('sendPage error:', err);
    }
  }, [logEvent]);

  const upgradeContent = useCallback(async (text, containerId, containerName) => {
    const bridge = bridgeRef.current;
    if (!bridge) return false;
    try {
      return await bridge.textContainerUpgrade(new TextContainerUpgrade({
        containerID: containerId,
        containerName: containerName,
        contentOffset: 0,
        contentLength: text.length,
        content: text,
      }));
    } catch {
      return false;
    }
  }, []);

  const pushContent = useCallback(async () => {
    if (!bridgeRef.current || !isStartupCreatedRef.current) return;
    const cityData = getCityData();

    const fingerprint = cityData.map(c => c.name + c.time + c.sunrise + (c.solarNoon ?? '') + (c.coords ? c.coords.lat : '')).join(',')
      + (showDetails ? '|d' : '') + `|${rightMode}`;
    if (fingerprint === lastContentRef.current) return;
    lastContentRef.current = fingerprint;

    const featured = cityData[0] || null;
    const rest = cityData.slice(1);
    const rightContent = rightMode === 'solar'
      ? formatSolar(featured)
      : formatList(rest, showDetails);

    const ok2 = await upgradeContent(formatFeatured(featured, rightMode), 2, 'featured');
    const ok3 = await upgradeContent(rightContent, 3, 'list');

    if (!ok2 || !ok3) {
      await sendPage(buildConfig(cityData, showDetails, rightMode));
    }
  }, [getCityData, upgradeContent, buildConfig, sendPage, showDetails, rightMode]);

  const shutdownGlasses = useCallback(async () => {
    try {
      const bridge = bridgeRef.current;
      if (!bridge) return;
      await bridge.shutDownPageContainer(0);
      isStartupCreatedRef.current = false;
      setStatus('Display shut down');
      logEvent('Display shut down');
    } catch (err) {
      console.error('shutdown error:', err);
    }
  }, [logEvent]);

  // Graceful shutdown: shows user-confirmation popup on glasses (exitMode: 1)
  const shutdownGlassesPrompt = useCallback(async () => {
    try {
      const bridge = bridgeRef.current;
      if (!bridge) return;
      await bridge.shutDownPageContainer(1);
      isStartupCreatedRef.current = false;
      setStatus('Shutdown requested');
      logEvent('Graceful shutdown requested');
    } catch (err) {
      console.error('shutdown error:', err);
    }
  }, [logEvent]);

  const showDisplay = useCallback(async () => {
    if (!bridgeRef.current) return;
    isStartupCreatedRef.current = false;
    lastContentRef.current = '';
    await sendPage(buildConfig(getCityData(), showDetails, rightMode));
    setStatus('Display active');
    logEvent('Display shown');
  }, [getCityData, buildConfig, sendPage, logEvent, showDetails, rightMode]);

  useEffect(() => {
    let disposed = false;

    async function init() {
      try {
        const bridge = await waitForEvenAppBridge();
        bridgeRef.current = bridge;
        bridgeReadyRef.current = true;

        if (disposed) return;
        setStatus('Bridge connected');
        setConnected(true);

        // Restore saved right panel mode
        try {
          const saved = await bridge.getLocalStorage(RIGHTMODE_KEY);
          if (saved === 'cities' || saved === 'solar') {
            setRightMode(saved);
          }
        } catch (_) {
          try {
            const saved = localStorage.getItem(RIGHTMODE_KEY);
            if (saved === 'cities' || saved === 'solar') setRightMode(saved);
          } catch (_) {}
        }

        const rc = await bridge.createStartUpPageContainer(
          new CreateStartUpPageContainer(buildConfig(getCityData()))
        );
        if (rc === 0) {
          isStartupCreatedRef.current = true;
          logEvent('Initial display created');
        }

        // Auto-initialize display when launched from glasses menu (SDK 0.0.10)
        bridge.onLaunchSource((source) => {
          if (disposed) return;
          if (source === LAUNCH_SOURCE_GLASSES_MENU) {
            isStartupCreatedRef.current = false;
            lastContentRef.current = '';
            sendPage(buildConfig(getCityData()));
            logEvent('Auto-launch from glasses menu');
          }
        });

        bridge.onEvenHubEvent((event) => {
          if (disposed) return;
          if (event.textEvent) {
            const et = event.textEvent.eventType;
            if (et === OsEventTypeList.DOUBLE_CLICK_EVENT) {
              setRightMode((prev) => prev === 'cities' ? 'solar' : 'cities');
            }
          }
          if (event.sysEvent) {
            const et = event.sysEvent.eventType;
            const src = event.sysEvent.eventSource;
            const srcLabel = src === EventSourceType.TOUCH_EVENT_FROM_RING ? 'ring'
              : src === EventSourceType.TOUCH_EVENT_FROM_GLASSES_R ? 'glasses-R'
              : src === EventSourceType.TOUCH_EVENT_FROM_GLASSES_L ? 'glasses-L'
              : 'unknown';
            if (et === OsEventTypeList.DOUBLE_CLICK_EVENT) {
              logEvent(`Double-tap from ${srcLabel} — toggling right panel`);
              setRightMode((prev) => prev === 'cities' ? 'solar' : 'cities');
            }
          }
        });

        bridge.onDeviceStatusChanged((ds) => {
          if (disposed) return;
          if (ds.isConnected?.()) {
            setStatus(`Connected - Battery: ${ds.batteryLevel ?? '?'}%`);
            setConnected(true);
          } else {
            setConnected(false);
          }
        });
      } catch (err) {
        if (disposed) return;
        setStatus('No bridge - preview mode');
      }
    }

    init();
    return () => { disposed = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    status, connected, eventLog,
    shutdownGlasses, shutdownGlassesPrompt,
    showDisplay, pushContent,
    showDetails, setShowDetails,
    rightMode, setRightMode,
  };
}
