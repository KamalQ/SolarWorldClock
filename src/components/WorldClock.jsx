import { useState } from 'react';
import { Card, Button, SearchBar } from 'even-toolkit/web';
import { IcPlus, IcCross, IcTrash } from 'even-toolkit/web/icons/svg-icons';
import TIMEZONES from '../data/timezones';

const shortTime = (t) => t.replace(/:\d{2}\s/, ' ');

function Divider() {
  return <div style={{ borderTop: '1px solid var(--color-surface-light)', margin: '12px 0' }} />;
}

function DataRow({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{value ?? '—'}</div>
    </div>
  );
}

function FeaturedCard({ city, info, onDelete }) {
  return (
    <Card padding="default">
      <span className="featured-badge">Featured on glasses</span>

      {/* City + time + delete */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 400 }}>{city.city}</div>
          <div style={{ fontSize: 13, color: 'var(--color-text-dim)', marginTop: 3 }}>
            {info.abbr}
            {info.offset !== 'Same time' && <span style={{ marginLeft: 8 }}>{info.offset}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 26, fontWeight: 300, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.5px' }}>
            {shortTime(info.time)}
          </div>
          <button className="icon-btn" onClick={onDelete} aria-label="Remove city"><IcTrash width={16} height={16} /></button>
        </div>
      </div>

      {/* Solar + Moon data */}
      {info.sunrise && (
        <>
          <Divider />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <DataRow label="↑ Sunrise"  value={info.sunrise} />
            <DataRow label="↓ Sunset"   value={info.sunset} />
            <DataRow label="Solar Noon" value={info.solarNoon} />
            <DataRow label="Day Length" value={info.dayLength} />
            {info.moonPhase && (
              <>
                <DataRow label="Moon" value={info.moonPhase} />
                <DataRow label="Illuminated" value={info.moonIllumination != null ? `${info.moonIllumination}%` : null} />
              </>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

function CityRow({ city, info, index, isLast, onMove, onDelete, onMoveToTop }) {
  const time = shortTime(info.time);
  const subtitle = info.offset === 'Same time' ? info.abbr : `${info.abbr}  ·  ${info.offset}`;

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 6,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
    }}>
      {/* Reorder up/down */}
      <div className="reorder-btns" style={{ flexShrink: 0 }}>
        <button className="reorder-btn" onClick={() => onMove(index, index - 1)} aria-label="Move up">^</button>
        <button className="reorder-btn" onClick={() => onMove(index, index + 1)} disabled={isLast} aria-label="Move down">v</button>
      </div>

      {/* City info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 400, color: '#232323' }}>{city.city}</div>
        <div style={{ fontSize: 13, color: '#7B7B7B', marginTop: 2 }}>{subtitle}</div>
      </div>

      {/* Time */}
      <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 20, fontWeight: 300, color: '#232323', flexShrink: 0 }}>
        {time}
      </span>

      {/* Move to top (feature on glasses) */}
      <button
        onClick={onMoveToTop}
        aria-label="Feature on glasses"
        style={{
          flexShrink: 0,
          background: '#FEF991',
          border: 'none',
          borderRadius: 6,
          padding: '5px 8px',
          fontSize: 13,
          fontWeight: 400,
          color: '#232323',
          cursor: 'pointer',
          letterSpacing: '-0.1px',
        }}
      >
        ★ Top
      </button>

      {/* Delete */}
      <button className="icon-btn" onClick={onDelete} aria-label="Remove city" style={{ flexShrink: 0 }}>
        <IcTrash width={16} height={16} />
      </button>
    </div>
  );
}

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
        if (index === 0) {
          return (
            <FeaturedCard
              key={city.city}
              city={city}
              info={info}
              onDelete={() => removeCity(city.city)}
            />
          );
        }
        return (
          <CityRow
            key={city.city}
            city={city}
            info={info}
            index={index}
            isLast={index === cities.length - 1}
            onMove={moveCity}
            onDelete={() => removeCity(city.city)}
            onMoveToTop={() => moveCity(index, 0)}
          />
        );
      })}

      <Button variant="highlight" onClick={() => { setShowPicker(true); setSearch(''); }} style={{ width: '100%' }}>
        <IcPlus width={16} height={16} /> Add City
      </Button>

      {showPicker && (
        <div className="modal-overlay" onClick={() => setShowPicker(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ fontSize: 17, fontWeight: 400, margin: 0 }}>Add City</h2>
              <button className="icon-btn" onClick={() => setShowPicker(false)}><IcCross width={20} height={20} /></button>
            </div>
            <SearchBar value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search cities..." autoFocus />
            <div className="city-list">
              {filtered.map((tz) => (
                <button key={tz.city} className="city-option" onClick={() => { addCity(tz); setShowPicker(false); }}>
                  <span>{tz.city}</span>
                  <span className="city-country">{tz.country}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <p style={{ padding: 16, color: 'var(--color-text-dim)', textAlign: 'center', fontSize: 15 }}>No cities found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
