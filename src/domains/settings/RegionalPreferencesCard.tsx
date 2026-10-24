import React, { useState } from 'react';
import {
  SUPPORTED_TIMEZONES,
  SUPPORTED_CURRENCIES,
  getSavedTimezone,
  saveTimezone,
  getSavedCurrency,
  saveCurrency,
} from '../../lib/userPreferences';
import { Button } from '../../components/buttons/Button';
import { InlineNotice } from '../../components/feedback/InlineNotice';
import formStyles from '../../components/forms/forms.module.css';

export const RegionalPreferencesCard: React.FC = () => {
  const [timezone, setTimezone] = useState(getSavedTimezone());
  const [currency, setCurrency] = useState(getSavedCurrency());
  const [savedSuccess, setSavedSuccess] = useState(false);

  const initialTz = getSavedTimezone();
  const initialCur = getSavedCurrency();
  const isUnchanged = timezone === initialTz && currency === initialCur;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveTimezone(timezone);
    saveCurrency(currency);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-surface)',
    padding: '1.25rem 1.5rem',
    borderRadius: 'var(--radius-xl)',
    border: '1px solid var(--color-border-subtle)',
    boxShadow: 'var(--shadow-xs)',
  };

  return (
    <div style={cardStyle}>
      <h3 style={{ margin: '0 0 var(--space-4)', fontSize: 'var(--font-size-base)', fontWeight: 600 }}>
        Regional Defaults & Preferences
      </h3>

      {savedSuccess && (
        <div style={{ marginBottom: 'var(--space-3)' }}>
          <InlineNotice
            type="success"
            message="Timezone and currency preferences saved successfully."
            onDismiss={() => setSavedSuccess(false)}
          />
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        <div className={formStyles.field}>
          <label htmlFor="timezoneSelect" className={formStyles.label}>
            Application Timezone
          </label>
          <select
            id="timezoneSelect"
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setSavedSuccess(false);
            }}
            className={formStyles.select}
          >
            {SUPPORTED_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Applied consistently to class schedules, session calendars, and date/time displays.
          </span>
        </div>

        <div className={formStyles.field}>
          <label htmlFor="currencySelect" className={formStyles.label}>
            Display Currency Preference
          </label>
          <select
            id="currencySelect"
            value={currency}
            onChange={(e) => {
              setCurrency(e.target.value);
              setSavedSuccess(false);
            }}
            className={formStyles.select}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '4px' }}>
            Display preference for fees and dashboard summaries. Original payment currencies are preserved without automatic FX conversion.
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: 'var(--space-2)' }}>
          <Button type="submit" disabled={isUnchanged}>
            Save Regional Preferences
          </Button>
        </div>
      </form>
    </div>
  );
};
