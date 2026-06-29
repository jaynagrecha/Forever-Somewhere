import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthed, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink text-muted">
        Opening your space…
      </div>
    );
  }

  if (!isAuthed) {
    const from = location.pathname + location.search;
    return <Navigate to="/" replace state={{ from }} />;
  }

  return children;
}
