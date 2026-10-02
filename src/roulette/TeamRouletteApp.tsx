import { Navigate, Route, Routes } from 'react-router-dom';
import './styles.css';
import { SetupPage } from './pages/SetupPage';
import { DrawPage } from './pages/DrawPage';

// Team Roulette lives entirely under /hidden (decision D1).
// /hidden            -> Setup
// /hidden/draw       -> redirect to /hidden/draw/slots
// /hidden/draw/:mode -> Draw (unknown mode redirects to slots inside DrawPage)
export function TeamRouletteApp() {
  return (
    <div className="tr-root min-h-screen w-full" data-testid="team-roulette">
      <Routes>
        <Route index element={<SetupPage />} />
        <Route path="draw" element={<Navigate to="draw/slots" replace />} />
        <Route path="draw/:mode" element={<DrawPage />} />
        <Route path="*" element={<Navigate to="/hidden" replace />} />
      </Routes>
    </div>
  );
}
