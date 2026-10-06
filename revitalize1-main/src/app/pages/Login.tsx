import { Navigate, useNavigate } from "react-router";
import { Lock, User, Moon, Sun, X, ShieldCheck } from "lucide-react";
import logoLight from "../../imports/Logos_Revitalize.png";
import logoDark from "../../imports/Logos_Revitalize_(1).png";
import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import type { AuthUser } from "../api";

function homeFor(user: AuthUser): string {
  if (user.mustChangePassword) return "/change-password";
  return user.role === "ADMIN" ? "/users" : "/dashboard";
}

export default function Login() {
  const navigate = useNavigate();
  const { user, loading, notice, login, clearNotice } = useAuth();
  const [isDark, setIsDark] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const logo = isDark ? logoDark : logoLight;

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDark(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);

    if (newTheme) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoggingIn(true);

    clearNotice();

    try {
      const loggedUser = await login(email.trim(), password);
      setPassword("");
      navigate(homeFor(loggedUser), { replace: true });
    } catch (error) {
      setPassword("");
      setLoginError(error instanceof Error ? error.message : "Não foi possível efetuar o login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Quem já tem sessão válida não precisa ver a tela de login.
  if (!loading && user) {
    return <Navigate to={homeFor(user)} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1433] via-[#1A2847] to-[#2A3B5F] flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
      </div>

      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg group"
        aria-label="Toggle theme"
      >
        {isDark ? (
          <Sun className="w-5 h-5 group-hover:scale-110 transition-transform" />
        ) : (
          <Moon className="w-5 h-5 group-hover:scale-110 transition-transform" />
        )}
      </button>

      <div className="w-full max-w-md relative">
        <div className="bg-card rounded-2xl shadow-2xl p-8 space-y-8 border border-border">
          <div className="text-center space-y-4">
            <img src={logo} alt="Revitalize" className="h-32 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Prontuário Eletrônico para CAPS
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  E-mail
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    maxLength={191}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    placeholder="Digite seu e-mail"
                    className="w-full pl-10 pr-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    maxLength={200}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    placeholder="Digite sua senha"
                    className="w-full pl-10 pr-4 py-3 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end text-sm">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-primary hover:underline"
              >
                Esqueceu a senha?
              </button>
            </div>

            {notice && !loginError && (
              <p className="rounded-lg bg-amber-100 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                {notice}
              </p>
            )}

            {loginError && (
              <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || loading}
              className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl disabled:opacity-60"
            >
              {isLoggingIn ? "Entrando..." : "Entrar no Sistema"}
            </button>
          </form>

          <div className="text-center text-xs text-muted-foreground pt-4 border-t border-border">
            <p>© 2026 Revitalize</p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-white/60">
            Tema: {isDark ? "Escuro" : "Claro"}
          </p>
        </div>
      </div>

      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowForgotPassword(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Recuperar Senha</h3>
              <button onClick={() => setShowForgotPassword(false)} className="p-2 hover:bg-muted rounded-lg transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <p className="font-medium text-foreground">A senha é redefinida pelo administrador</p>
              <p className="text-sm text-muted-foreground">
                Por segurança dos prontuários, o Revitalize não envia senhas por e-mail. Procure o administrador do
                sistema ou a coordenação do CAPS: ele gera uma senha temporária, que você troca no primeiro acesso.
              </p>
              <button
                onClick={() => setShowForgotPassword(false)}
                className="mt-4 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
