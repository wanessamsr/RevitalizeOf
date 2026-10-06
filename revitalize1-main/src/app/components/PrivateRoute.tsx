import { Navigate, Outlet, useLocation } from "react-router";

export default function PrivateRoute() {
  const location = useLocation();
  const token = localStorage.getItem("revitalize-token");

  if (!token) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
