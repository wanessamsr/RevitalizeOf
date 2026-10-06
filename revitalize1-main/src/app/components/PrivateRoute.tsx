import { Navigate, Outlet, useLocation } from "react-router";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { hasRole, type Role } from "../roles";

type PrivateRouteProps = {
  // Perfis que podem abrir as telas filhas. Sem a lista, basta estar logado.
  roles?: Role[];
};

export default function PrivateRoute({ roles }: PrivateRouteProps) {
  const location = useLocation();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Verificando sessão...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  if (user.mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (roles && !hasRole(user.role, roles)) {
    return (
      <div className="p-6">
        <div className="max-w-lg mx-auto mt-12 bg-card rounded-xl border border-border p-8 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-semibold text-foreground">Acesso não permitido</h1>
          <p className="text-sm text-muted-foreground">
            Seu perfil não tem permissão para abrir esta tela. Se precisar de acesso, procure o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
