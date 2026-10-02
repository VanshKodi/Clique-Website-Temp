import { Route, Routes } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { MemberPage } from './pages/MemberPage';
import { JoinPage } from './pages/JoinPage';
import { GauntletPage } from './pages/GauntletPage';
import { TeamRouletteApp } from './roulette/TeamRouletteApp';
import { NotFound } from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/people/:slug" element={<MemberPage />} />
      <Route path="/join" element={<JoinPage />} />
      <Route path="/gauntlet" element={<GauntletPage />} />
      <Route path="/hidden/*" element={<TeamRouletteApp />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
