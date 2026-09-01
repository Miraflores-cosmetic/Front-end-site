import { Navigate, useLocation } from 'react-router-dom';
import { getAccessToken } from '@/api/apiClient';

/** Guard: только при наличии JWT в localStorage. */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const token = getAccessToken();

  if (!token) {
    return (
      <Navigate
        to="/sign-in"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <>{children}</>;
}
