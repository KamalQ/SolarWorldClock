import { useCallback, useEffect } from 'react';
import useWorldClock from './hooks/useWorldClock';
import useGlasses from './hooks/useGlasses';
import WorldClock from './components/WorldClock';
import { Card, Button, ScreenHeader } from 'even-toolkit/web';
import { IcFeatScreenOff, IcFeatMenu } from 'even-toolkit/web/icons/svg-icons';
import './App.css';

export default function App() {
  const worldClock = useWorldClock();

  const getCityData = useCallback(() => {
    return worldClock.cities.map((c) => {
      const info = worldClock.getTimeInfo(c);
      return {
        name: c.city,
        time: info.time,
        offset: info.offset,
        abbr: info.abbr,
        sunrise: info.sunrise,
        sunset: info.sunset,
        solarNoon: info.solarNoon,
        dayLength: info.dayLength,
        moonPhase: info.moonPhase,
        moonIllumination: info.moonIllumination,
        coords: info.coords,
        timezone: c.timezone,
        goldenHourMorningStart: info.goldenHourMorningStart,
        goldenHourMorningEnd: info.goldenHourMorningEnd,
        goldenHourEveningStart: info.goldenHourEveningStart,
        goldenHourEveningEnd: info.goldenHourEveningEnd,
        blueHourMorningStart: info.blueHourMorningStart,
        blueHourMorningEnd: info.blueHourMorningEnd,
        blueHourEveningStart: info.blueHourEveningStart,
        blueHourEveningEnd: info.blueHourEveningEnd,
      };
    });
  }, [worldClock]);

  const glasses = useGlasses({ getCityData });

  // Update glasses every second
  useEffect(() => {
    const id = setInterval(() => {
      glasses.pushContent();
    }, 1000);
    glasses.pushContent();
    return () => clearInterval(id);
  }, [glasses.pushContent]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div id="app-container">
      <ScreenHeader
        title="Solar World Clock"
        subtitle={glasses.status}
      />

      <WorldClock
        cities={worldClock.cities}
        addCity={worldClock.addCity}
        removeCity={worldClock.removeCity}
        moveCity={worldClock.moveCity}
        getTimeInfo={worldClock.getTimeInfo}
      />

      <Card padding="default">
        <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)', marginBottom: 8 }}>
          Glasses — Right Panel
        </p>
        <div className="glasses-btns" style={{ marginBottom: 8 }}>
          <Button
            variant={glasses.rightMode === 'solar' ? 'highlight' : 'default'}
            onClick={() => glasses.setRightMode('solar')}
          >
            Solar
          </Button>
          <Button
            variant={glasses.rightMode === 'cities' ? 'highlight' : 'default'}
            onClick={() => glasses.setRightMode('cities')}
          >
            Cities
          </Button>
          <Button
            variant={glasses.rightMode === 'photo' ? 'highlight' : 'default'}
            onClick={() => glasses.setRightMode('photo')}
          >
            Photo
          </Button>
        </div>
        {glasses.rightMode === 'cities' && (
          <div className="glasses-btns" style={{ marginBottom: 8 }}>
            <Button
              variant={glasses.showDetails ? 'secondary' : 'default'}
              onClick={() => glasses.setShowDetails(v => !v)}
              style={{ gridColumn: '1 / -1' }}
            >
              {glasses.showDetails ? 'Hide City Details' : 'Show City Details'}
            </Button>
          </div>
        )}
        <div className="glasses-btns">
          <Button variant="highlight" onClick={glasses.showDisplay}>
            <IcFeatMenu width={16} height={16} /> Show Display
          </Button>
          <Button variant="ghost" onClick={glasses.shutdownGlassesPrompt}>
            <IcFeatScreenOff width={16} height={16} /> Shutdown
          </Button>
        </div>
      </Card>
    </div>
  );
}
