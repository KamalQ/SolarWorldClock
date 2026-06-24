import { useCallback, useEffect, useRef, useState } from 'react';
import useWorldClock from './hooks/useWorldClock';
import useGlasses from './hooks/useGlasses';
import WorldClock from './components/WorldClock';
import FeedbackModal from './components/FeedbackModal';
import { Card, Button, ScreenHeader } from 'even-toolkit/web';
import { IcFeatScreenOff, IcFeatMenu } from 'even-toolkit/web/icons/svg-icons';
import useLocale, { LANGUAGES } from './i18n/useLocale';

export default function AppContent() {
  const { t, locale, setLocale } = useLocale();
  const worldClock = useWorldClock();
  const [showFeedback, setShowFeedback] = useState(false);

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

  const glasses = useGlasses({ getCityData, isLoading: worldClock.isLoading });

  // Keep a stable ref so the interval closure always calls the latest pushContent
  const pushContentRef = useRef(glasses.pushContent);
  useEffect(() => { pushContentRef.current = glasses.pushContent; }, [glasses.pushContent]);

  useEffect(() => {
    const id = setInterval(() => { pushContentRef.current?.(); }, 1000);
    pushContentRef.current?.();
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Immediately push to HUD when cities change
  const isCitiesFirstMountRef = useRef(true);
  useEffect(() => {
    if (isCitiesFirstMountRef.current) {
      isCitiesFirstMountRef.current = false;
      return;
    }
    if (worldClock.isLoading) return;
    glasses.triggerPush();
  }, [worldClock.cities, worldClock.isLoading, glasses.triggerPush]);

  return (
    <div id="app-container">
      <ScreenHeader
        title={t('app.title')}
        subtitle={glasses.status}
      />

      <WorldClock
        cities={worldClock.cities}
        addCity={worldClock.addCity}
        removeCity={worldClock.removeCity}
        moveCity={worldClock.moveCity}
        getTimeInfo={worldClock.getTimeInfo}
      />

      {/* Glasses control panel */}
      <Card padding="default">
        <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)', marginBottom: 8 }}>
          {t('glasses.panel')}
        </p>
        <div className="glasses-btns" style={{ marginBottom: 8 }}>
          <Button
            variant={glasses.rightMode === 'solar' ? 'highlight' : 'default'}
            onClick={() => glasses.setRightMode('solar')}
          >
            {t('glasses.solar')}
          </Button>
          <Button
            variant={glasses.rightMode === 'cities' ? 'highlight' : 'default'}
            onClick={() => glasses.setRightMode('cities')}
          >
            {t('glasses.cities')}
          </Button>
          <Button
            variant={glasses.rightMode === 'photo' ? 'highlight' : 'default'}
            onClick={() => glasses.setRightMode('photo')}
          >
            {t('glasses.photo')}
          </Button>
        </div>
        {glasses.rightMode === 'cities' && (
          <div className="glasses-btns" style={{ marginBottom: 8 }}>
            <Button
              variant={glasses.showDetails ? 'secondary' : 'default'}
              onClick={() => glasses.setShowDetails(v => !v)}
              style={{ gridColumn: '1 / -1' }}
            >
              {glasses.showDetails ? t('glasses.hideDetails') : t('glasses.showDetails')}
            </Button>
          </div>
        )}
        <div className="glasses-btns">
          <Button variant="highlight" onClick={glasses.showDisplay}>
            <IcFeatMenu width={16} height={16} /> {t('glasses.showDisplay')}
          </Button>
          <Button variant="ghost" onClick={glasses.shutdownGlassesPrompt}>
            <IcFeatScreenOff width={16} height={16} /> {t('glasses.shutdown')}
          </Button>
        </div>
      </Card>

      {/* Settings panel */}
      <Card padding="default">
        <p style={{ fontSize: 11, fontWeight: 400, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-dim)', marginBottom: 8 }}>
          {t('settings.title')}
        </p>

        {/* Language selector */}
        <div className="settings-row">
          <span className="settings-label">{t('settings.language')}</span>
          <select
            className="settings-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          >
            {LANGUAGES.map(({ code, name }) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* Feedback button */}
        <Button
          variant="default"
          onClick={() => setShowFeedback(true)}
          style={{ width: '100%', marginTop: 12 }}
        >
          {t('feedback.title')}
        </Button>
      </Card>

      {/* Feedback modal */}
      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        appContext={{
          cityCount: worldClock.cities.length,
          rightMode: glasses.rightMode,
          connected: glasses.connected,
          battery: null,
        }}
      />
    </div>
  );
}
