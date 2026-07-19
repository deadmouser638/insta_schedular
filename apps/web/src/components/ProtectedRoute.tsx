import { Outlet } from 'react-router-dom'

// Since we're bypassing authentication, this just renders the children
export default function ProtectedRoute() {
  return <Outlet />
}
