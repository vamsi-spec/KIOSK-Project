import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './i18n/index.js'

// Auth
import IdleScreen from './pages/IdleScreen.jsx'
import LanguageScreen from './pages/LanguageScreen.jsx'
import AuthScreen from './pages/AuthScreen.jsx'
import RegisterScreen from './pages/RegisterScreen.jsx'
import OtpScreen from './pages/OtpScreen.jsx'
import HomeScreen from './pages/HomeScreen.jsx'

// Electricity
import ElectricityHome from './pages/electricity/ElectricityHome.jsx'
import AccountsScreen from './pages/electricity/AccountsScreen.jsx'
import LinkAccountScreen from './pages/electricity/LinkAccountScreen.jsx'
import BillListScreen from './pages/electricity/BillListScreen.jsx'
import PayBillScreen from './pages/electricity/PayBillScreen.jsx'
import MeterReadingScreen from './pages/electricity/MeterReadingScreen.jsx'
import NewConnectionScreen from './pages/electricity/NewConnectionScreen.jsx'
import FileComplaint from './pages/electricity/FileComplaint.jsx'
import TrackComplaint from './pages/electricity/TrackComplaint.jsx'

// Gas
import GasHome from './pages/gas/GasHome.jsx'
import EmergencyScreen from './pages/gas/EmergencyScreen.jsx'
import GasAccountsScreen from './pages/gas/AccountsScreen.jsx'
import GasLinkAccountScreen from './pages/gas/LinkAccountScreen.jsx'
import GasBillListScreen from './pages/gas/BillListScreen.jsx'
import GasPayBillScreen from './pages/gas/PayBillScreen.jsx'
import GasMeterReadingScreen from './pages/gas/MeterReadingScreen.jsx'
import GasFileComplaint from './pages/gas/FileComplaint.jsx'
import GasTrackComplaint from './pages/gas/TrackComplaint.jsx'
import GasNewConnectionScreen from './pages/gas/NewConnectionScreen.jsx'
const Placeholder = ({ name }) => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif', gap: 16
  }}>
    <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
      SUVIDHA · Coming in Phase 6+
    </div>
    <div style={{ fontSize: 28, fontWeight: 500, color: '#1e293b' }}>{name}</div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Auth flow */}
        <Route path="/" element={<IdleScreen />} />
        <Route path="/language" element={<LanguageScreen />} />
        <Route path="/auth" element={<AuthScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/otp" element={<OtpScreen />} />
        <Route path="/home" element={<HomeScreen />} />

        {/* Electricity */}
        <Route path="/electricity" element={<ElectricityHome />} />
        <Route path="/electricity/accounts" element={<AccountsScreen />} />
        <Route path="/electricity/link-account" element={<LinkAccountScreen />} />
        <Route path="/electricity/bills/:accountId" element={<BillListScreen />} />
        <Route path="/electricity/pay" element={<PayBillScreen />} />
        <Route path="/electricity/meter" element={<MeterReadingScreen />} />
        <Route path="/electricity/connection" element={<NewConnectionScreen />} />
        <Route path="/electricity/complaint" element={<FileComplaint />} />
        <Route path="/electricity/track" element={<TrackComplaint />} />

        {/* Gas */}
        <Route path="/gas"                  element={<GasHome />} />
        <Route path="/gas/emergency"        element={<EmergencyScreen />} />
        <Route path="/gas/accounts"         element={<GasAccountsScreen />} />
        <Route path="/gas/link-account"     element={<GasLinkAccountScreen />} />
        <Route path="/gas/bills/:accountId" element={<GasBillListScreen />} />
        <Route path="/gas/pay"              element={<GasPayBillScreen />} />
        <Route path="/gas/meter"            element={<GasMeterReadingScreen />} />
        <Route path="/gas/complaint"        element={<GasFileComplaint />} />
        <Route path="/gas/track"            element={<GasTrackComplaint />} />
        <Route path="/gas/connection"       element={<GasNewConnectionScreen />} />

        {/* Phase 6+ placeholders */}
        <Route path="/water/*" element={<Placeholder name="Water & Municipal" />} />
        <Route path="/complaints/*" element={<Placeholder name="Complaints" />} />
        <Route path="/receipt" element={<Placeholder name="Receipt" />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}