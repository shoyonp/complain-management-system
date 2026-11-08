import { Route, Routes } from 'react-router-dom';
import Landing from '../pages/Landing.jsx';
import NotFound from '../pages/NotFound.jsx';

// Public routes only in M0. Auth guards and role routes arrive in M1 (§4.1).
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
