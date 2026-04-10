import { useState } from 'react';
import { Card, Button, ListItem, SearchBar } from 'even-toolkit/web';
import { IcTrash, IcPlus, IcCross } from 'even-toolkit/web/icons/svg-icons';
import TIMEZONES from '../data/timezones';

export default function WorldClock({ cities, addCity, removeCity, moveCity, getTimeInfo }) {
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = TIMEZONES.filter((tz) => {
    if (cities.some((c) => c.city === tz.city)) return false;
    if (!search) return true;
    return (
      tz.city.toLowerCase().includes(search.toLowerCase()) ||
      tz.country.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="tab-content">
      {cities.length === 0 && (
        <Card padding="default" style={{ textAlign: 'center', padding: '32px 16px' }}>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 15 }}>No cities added yet</p>
          <p style={{ color: 'var(--color-text-dim)', fontSize: 13, marginTop: 4 }}>Tap the button below to add a city</p>
        </Card>
      )}

      {cities.map((city, index) => {
        const info = getTimeInfo(city);
        const isFirst = index === 0;
        const isLast = index === cities.length - 1;
        const isFeatured = index === 0;

        const subtitleParts = [`${info.abbr} · ${info.offset}`];
        if (isFeatured && info.sunrise) subtitleParts.push(`Sunrise ${info.sunrise} · Sunset ${info.sunset}`);
        if (isFeatured && info.solarNoon) subtitleParts.push(`Solar Noon ${info.solarNoon} · Day ${info.dayLength}`);
        if (isFeatured && info.moonPhase) subtitleParts.push(`${info.moonPhase} · ${info.moonIllumination}% illuminated`);
        if (!isFeatured && info.sunrise) subtitleParts.push(`↑ ${info.sunrise}  ↓ ${info.sunset}`);

        return (
          <div key={city.city}>
            {isFeatured && (
              <span className="featured-badge">Featured on glasses</span>
            )}
            <ListItem
              title={city.city}
              subtitle={subtitleParts.join('\n')}
              leading={
                <div className="reorder-btns">
                  <button
                    className="reorder-btn"
                    onClick={() => moveCity(index, index - 1)}
                    disabled={isFirst}
                    aria-label="Move up"
                  >
                    ^
                  </button>
                  <button
                    className="reorder-btn"
                    onClick={() => moveCity(index, index + 1)}
                    disabled={isLast}
                    aria-label="Move down"
                  >
                    v
                  </button>
                </div>
              }
              trailing={
                <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 300 }}>
                  {info.time}
                </span>
              }
              onDelete={() => removeCity(city.city)}
            />
          </div>
        );
      })}

      <Button
        variant="highlight"
        onClick={() => { setShowPicker(true); setSearch(''); }}
        style={{ width: '100%' }}
      >
        <IcPlus width={16} height={16} /> Add City
      </Button>

      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 400, margin: 0 }}>Add City</h2>
              <button className="icon-btn" onClick={() => setShowPicker(false)}>
                <IcCross width={20} height={20} />
              </button>
            </div>
            <SearchBar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cities..."
              autoFocus
            />
            <div className="city-list">
              {filtered.map((tz) => (
                <button
                  key={tz.city}
                  className="city-option"
                  onClick={() => {
                    addCity(tz);
                    setShowPicker(false);
                  }}
                >
                  <span>{tz.city}</span>
                  <span className="city-country">{tz.country}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p style={{ padding: 16, color: 'var(--color-text-dim)', textAlign: 'center', fontSize: 15 }}>
                  No cities found
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
