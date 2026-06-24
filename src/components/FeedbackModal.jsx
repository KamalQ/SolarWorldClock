import { useState, useEffect } from 'react';
import { Button } from 'even-toolkit/web';
import { IcCross } from 'even-toolkit/web/icons/svg-icons';
import useLocale from '../i18n/useLocale';

const FEEDBACK_EMAIL = 'feedback@icedgrapefruit.com';
const APP_VERSION = '0.3.0';

const CATEGORIES = [
  { key: 'bug', labelKey: 'feedback.bug' },
  { key: 'feature', labelKey: 'feedback.feature' },
  { key: 'general', labelKey: 'feedback.general' },
];

function gatherDeviceInfo(bridge, extra) {
  const lines = [`App: Solar World Clock v${APP_VERSION}`];
  lines.push(`SDK: 0.0.11`);
  if (extra.cityCount != null) lines.push(`Cities: ${extra.cityCount}`);
  if (extra.rightMode) lines.push(`Display mode: ${extra.rightMode}`);
  if (extra.locale) lines.push(`Locale: ${extra.locale}`);
  if (extra.connected != null) lines.push(`Device: G2 (${extra.connected ? 'connected' : 'disconnected'})`);
  if (extra.battery != null) lines.push(`Battery: ${extra.battery}%`);
  return lines.join('\n');
}

function buildMailto(category, message, deviceInfo) {
  const categoryLabel = { bug: 'Bug Report', feature: 'Feature Request', general: 'Feedback' }[category] || 'Feedback';
  const subject = encodeURIComponent(`[${categoryLabel}] Solar World Clock v${APP_VERSION}`);
  const body = encodeURIComponent(
    `${message}\n\n` +
    `---\n${deviceInfo}`
  );
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}

export default function FeedbackModal({ isOpen, onClose, appContext }) {
  const { t, locale } = useLocale();
  const [category, setCategory] = useState('bug');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCategory('bug');
      setMessage('');
      setSent(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const deviceInfo = gatherDeviceInfo(null, {
    cityCount: appContext?.cityCount,
    rightMode: appContext?.rightMode,
    locale,
    connected: appContext?.connected,
    battery: appContext?.battery,
  });

  const handleSend = () => {
    const mailto = buildMailto(category, message, deviceInfo);
    window.open(mailto, '_blank');
    setSent(true);
    setTimeout(() => onClose(), 1500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 style={{ fontSize: 17, fontWeight: 400, margin: 0 }}>{t('feedback.title')}</h2>
          <button className="icon-btn" onClick={onClose}>
            <IcCross width={20} height={20} />
          </button>
        </div>

        {sent ? (
          <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-dim)', fontSize: 15 }}>
            {t('feedback.sent')}
          </p>
        ) : (
          <>
            {/* Category radio buttons */}
            <div className="feedback-categories">
              {CATEGORIES.map(({ key, labelKey }) => (
                <label key={key} className="feedback-radio">
                  <input
                    type="radio"
                    name="feedback-category"
                    value={key}
                    checked={category === key}
                    onChange={() => setCategory(key)}
                  />
                  <span className="feedback-radio-dot" />
                  <span>{t(labelKey)}</span>
                </label>
              ))}
            </div>

            {/* Message textarea */}
            <textarea
              className="feedback-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('feedback.placeholder')}
              rows={4}
            />

            {/* Auto-attached info */}
            <div className="feedback-info">
              <div style={{ fontSize: 11, color: 'var(--color-text-dim)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('feedback.info')}
              </div>
              <pre style={{ fontSize: 12, color: 'var(--color-text-dim)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                {deviceInfo}
              </pre>
            </div>

            {/* Send button */}
            <Button
              variant="highlight"
              onClick={handleSend}
              disabled={!message.trim()}
              style={{ width: '100%', marginTop: 12 }}
            >
              {t('feedback.send')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
