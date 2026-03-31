import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './i18n/index.js'

import IdleScreen    from './pages/IdleScreen.jsx'
import {LanguageScreen} from './pages/LanguageScreen.jsx'
import AuthScreen   from './pages/AuthScreen.jsx'
import OtpScreen     from './pages/OtpScreen.jsx'
import HomeScreen    from './pages/HomeScreen.jsx'
import RegisterScreen from './pages/RegisterScreen.jsx'

const Placeholder = ({ name }) => (
  <div style={{
    display:'flex', flexDirection:'column', alignItems:'center',
    justifyContent:'center', height:'100vh', fontFamily:'sans-serif', gap:16
  }}>
    <div style={{ fontSize:12, color:'#94a3b8', fontFamily:'monospace' }}>
      SUVIDHA · Coming in Phase 5+
    </div>
    <div style={{ fontSize:28, fontWeight:500, color:'#1e293b' }}>{name}</div>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<IdleScreen />} />
        <Route path="/language"      element={<LanguageScreen />} />
        <Route path="/auth"          element={<AuthScreen />} />
        <Route path="/register"      element={<RegisterScreen />} />
        <Route path="/otp"           element={<OtpScreen />} />
        <Route path="/home"          element={<HomeScreen />} />
        <Route path="/electricity/*" element={<Placeholder name="Electricity Services" />} />
        <Route path="/gas/*"         element={<Placeholder name="Gas Services" />} />
        <Route path="/water/*"       element={<Placeholder name="Water & Municipal" />} />
        <Route path="/complaints/*"  element={<Placeholder name="Complaints & Grievances" />} />
        <Route path="/receipt"       element={<Placeholder name="Payment Receipt" />} />
        <Route path="*"              element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}