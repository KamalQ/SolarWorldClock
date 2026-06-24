import { LocaleProvider } from './i18n/useLocale';
import AppContent from './AppContent';
import './App.css';

export default function App() {
  return (
    <LocaleProvider>
      <AppContent />
    </LocaleProvider>
  );
}
