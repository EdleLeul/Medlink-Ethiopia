import { Navigate, Outlet } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function ProtectedRoute() {
  const { provider, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', color: '#6b6b6b', fontSize: 13,
      }}>
        Loading…
      </div>
    )
  }

  if (!provider) return <Navigate to="/login" replace />

  return <Outlet />
}