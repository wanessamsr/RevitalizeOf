import { useState } from "react";
import { useNavigate } from "react-router";
import { KeyRound, LogOut } from "lucide-react";
import { ApiError, changePassword } from "../api";
import { useAuth } from "../contexts/AuthContext";

function passwordProblems(value: string): string[] {
  const problems: string[] = [];
  if (value.length < 10) problems.push("pelo menos 10 caracteres");
  if (new TextEncoder().encode(value).length > 72) problems.push("no máximo 72 caracteres");
  if (!/[A-Za-zÀ-ÿ]/.test(value)) problems.push("pelo menos uma letra");
  if (!/\d/.test(value)) problems.push("pelo menos um número");
  return problems;
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const problems = passwordProblems(newPassword);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;
  const forced = user?.mustChangePassword ?? false;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (problems.length > 0) {
      setError(`A nova senha precisa ter ${problems.join(", ")}.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("A confirmação não confere com a nova senha.");
      return;
    }
    setSaving(true);
    try {
      const { user: updated } = await changePassword(currentPassword, newPassword);
      setUser(updated);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigate(updated.role === "ADMIN" ? "/users" : "/dashboard", { replace: true });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.fields) {
        setError(Object.values(requestError.fields)[0] ?? requestError.message);
      } else {
        setError(requestError instanceof Error ? requestError.message : "Não foi possível trocar a senha.");
      }
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl border border-border shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <KeyRound className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Trocar senha</h1>
          <p className="text-sm text-muted-foreground">
            {forced
              ? "Você entrou com uma senha temporária. Crie uma senha pessoal para continuar."
              : "Crie uma nova senha pessoal. Não compartilhe sua senha com ninguém."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="current" className="block text-sm font-medium text-foreground mb-2">
              {forced ? "Senha temporária" : "Senha atual"}
            </label>
            <input
              id="current"
              type="password"
              autoComplete="current-password"
              required
              maxLength={200}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="new" className="block text-sm font-medium text-foreground mb-2">Nova senha</label>
            <input
              id="new"
              type="password"
              autoComplete="new-password"
              required
              maxLength={72}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
            />
            <p className={`text-xs mt-1 ${newPassword && problems.length > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              Mínimo de 10 caracteres, com letras e números.
            </p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-foreground mb-2">Confirme a nova senha</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              required
              maxLength={72}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
            {mismatch && <p className="text-xs mt-1 text-red-600">As senhas não conferem.</p>}
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>

        <div className="flex justify-between text-sm">
          {!forced ? (
            <button type="button" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              Voltar
            </button>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
