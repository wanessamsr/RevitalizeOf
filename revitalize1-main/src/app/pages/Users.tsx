import { useCallback, useEffect, useState } from "react";
import { KeyRound, Lock, ShieldCheck, Unlock, UserPlus, X } from "lucide-react";
import {
  createUser,
  formatDateTimeBR,
  getAuditLog,
  getUsers,
  resetUserPassword,
  updateUser,
  type AuditEntry,
  type ManagedUser,
} from "../api";
import { useAuth } from "../contexts/AuthContext";
import { ALL_ROLES, ROLE_LABELS, type Role } from "../roles";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Entrou no sistema",
  LOGIN_FAIL: "Senha incorreta",
  LOGIN_BLOCKED: "Conta bloqueada por tentativas",
  LOGOUT: "Saiu do sistema",
  SESSION_EXPIRED: "Sessão expirada",
  PASSWORD_CHANGE: "Trocou a senha",
  PASSWORD_RESET: "Senha redefinida",
  LIST: "Listou",
  VIEW: "Visualizou",
  CREATE: "Criou",
  ADDENDUM: "Adendo",
  UPDATE: "Alterou",
  ACCESS_DENIED: "Acesso negado",
};

type TemporaryPassword = { name: string; email: string; password: string };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<{ name: string; email: string; role: Role }>({ name: "", email: "", role: "RECEPCAO" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [temporary, setTemporary] = useState<TemporaryPassword | null>(null);

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [auditPage, setAuditPage] = useState(1);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilter, setAuditFilter] = useState("");
  const [auditQuery, setAuditQuery] = useState("");
  const auditPageSize = 50;

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await getUsers());
      setError("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    let active = true;
    getAuditLog({ page: auditPage, entityId: auditQuery || undefined })
      .then((data) => {
        if (!active) return;
        setAudit(data.items);
        setAuditTotal(data.total);
      })
      .catch(() => {
        if (active) setAudit([]);
      });
    return () => {
      active = false;
    };
  }, [auditPage, auditQuery]);

  const replaceUser = (updated: ManagedUser) => {
    setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");
    setSaving(true);
    try {
      const { user, temporaryPassword } = await createUser({ name: form.name.trim(), email: form.email.trim(), role: form.role });
      setUsers((current) => [...current, user].sort((a, b) => a.name.localeCompare(b.name)));
      setTemporary({ name: user.name, email: user.email, password: temporaryPassword });
      setForm({ name: "", email: "", role: "RECEPCAO" });
      setShowCreate(false);
    } catch (requestError) {
      setFormError(requestError instanceof Error ? requestError.message : "Não foi possível criar a conta.");
    } finally {
      setSaving(false);
    }
  };

  const handleRoleChange = async (target: ManagedUser, role: Role) => {
    if (role === target.role) return;
    if (!confirm(`Mudar o perfil de ${target.name} para ${ROLE_LABELS[role]}? As sessões abertas dessa pessoa serão encerradas.`)) return;
    try {
      replaceUser(await updateUser(target.id, { role }));
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível alterar o perfil.");
    }
  };

  const handleToggleActive = async (target: ManagedUser) => {
    const action = target.active ? "desativar" : "reativar";
    if (!confirm(`Deseja ${action} a conta de ${target.name}?`)) return;
    try {
      replaceUser(await updateUser(target.id, { active: !target.active }));
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível alterar a conta.");
    }
  };

  const handleUnlock = async (target: ManagedUser) => {
    try {
      replaceUser(await updateUser(target.id, { unlock: true }));
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível desbloquear a conta.");
    }
  };

  const handleReset = async (target: ManagedUser) => {
    if (!confirm(`Gerar nova senha temporária para ${target.name}? A senha atual deixa de funcionar e as sessões abertas serão encerradas.`)) return;
    try {
      const { user, temporaryPassword } = await resetUserPassword(target.id);
      replaceUser(user);
      setTemporary({ name: user.name, email: user.email, password: temporaryPassword });
    } catch (requestError) {
      alert(requestError instanceof Error ? requestError.message : "Não foi possível redefinir a senha.");
    }
  };

  const isLocked = (target: ManagedUser) => target.lockedUntil !== null && new Date(target.lockedUntil) > new Date();
  const userName = (id: string | null) => users.find((item) => item.id === id)?.name;
  const auditPages = Math.max(1, Math.ceil(auditTotal / auditPageSize));
  const inputClass =
    "w-full px-4 py-2.5 bg-input-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Usuários e Auditoria</h1>
          <p className="text-muted-foreground mt-1">Contas de acesso da equipe e registro de quem acessou o quê</p>
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setFormError("");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-all"
        >
          <UserPlus className="w-5 h-5" />
          Nova conta
        </button>
      </div>

      {temporary && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/20 p-5 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Senha temporária de {temporary.name}</p>
              <p className="text-sm text-muted-foreground">
                Entregue pessoalmente para {temporary.email}. Ela aparece só agora e será trocada no primeiro acesso.
              </p>
              <p className="font-mono text-lg tracking-wider text-foreground select-all">{temporary.password}</p>
            </div>
            <button onClick={() => setTemporary(null)} className="p-2 hover:bg-muted rounded-lg" aria-label="Fechar">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 px-4 py-3 rounded-lg text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Situação</th>
              <th className="px-4 py-3 font-medium">Último acesso</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Carregando...</td>
              </tr>
            )}
            {users.map((item) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={item.role}
                    disabled={item.id === me?.id}
                    onChange={(e) => void handleRoleChange(item, e.target.value as Role)}
                    className="px-2 py-1.5 bg-input-background border border-input rounded-lg disabled:opacity-60"
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                      {item.active ? "Ativa" : "Desativada"}
                    </span>
                    {item.mustChangePassword && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">Senha temporária</span>
                    )}
                    {isLocked(item) && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Bloqueada</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{item.lastLoginAt ? formatDateTimeBR(item.lastLoginAt) : "Nunca"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    {isLocked(item) && (
                      <button onClick={() => void handleUnlock(item)} title="Desbloquear" className="p-2 hover:bg-muted rounded-lg">
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}
                    <button onClick={() => void handleReset(item)} title="Gerar senha temporária" className="p-2 hover:bg-muted rounded-lg">
                      <KeyRound className="w-4 h-4" />
                    </button>
                    {item.id !== me?.id && (
                      <button
                        onClick={() => void handleToggleActive(item)}
                        title={item.active ? "Desativar conta" : "Reativar conta"}
                        className="p-2 hover:bg-muted rounded-lg"
                      >
                        {item.active ? <Lock className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Registro de acessos</h2>
            <p className="text-sm text-muted-foreground">
              {auditTotal} registro(s). Para ver quem abriu um prontuário, cole o código do paciente (o final do endereço da página dele).
            </p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setAuditPage(1);
              setAuditQuery(auditFilter.trim());
            }}
          >
            <input
              value={auditFilter}
              onChange={(e) => setAuditFilter(e.target.value)}
              placeholder="Código do paciente ou registro"
              maxLength={64}
              className="px-3 py-2 bg-input-background border border-input rounded-lg text-sm w-72"
            />
            <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">Filtrar</button>
            {auditQuery && (
              <button
                type="button"
                onClick={() => {
                  setAuditFilter("");
                  setAuditQuery("");
                  setAuditPage(1);
                }}
                className="px-4 py-2 border border-border rounded-lg text-sm"
              >
                Limpar
              </button>
            )}
          </form>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Data e hora</th>
                <th className="px-3 py-2 font-medium">Pessoa</th>
                <th className="px-3 py-2 font-medium">Ação</th>
                <th className="px-3 py-2 font-medium">Registro</th>
                <th className="px-3 py-2 font-medium">Detalhe</th>
                <th className="px-3 py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {audit.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-3 py-2 whitespace-nowrap">{formatDateTimeBR(entry.createdAt)}</td>
                  <td className="px-3 py-2">{entry.user ? `${entry.user.name} (${ROLE_LABELS[entry.user.role]})` : "Não identificado"}</td>
                  <td className="px-3 py-2">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                  <td className="px-3 py-2">
                    {entry.entity}
                    {entry.entityId && (
                      <span className="block text-xs text-muted-foreground font-mono">
                        {entry.entity === "User" ? (userName(entry.entityId) ?? entry.entityId) : entry.entityId}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.details ?? ""}</td>
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{entry.ip ?? ""}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Nenhum registro encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={auditPage <= 1}
            onClick={() => setAuditPage((page) => page - 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Anterior
          </button>
          <span className="text-muted-foreground">Página {auditPage} de {auditPages}</span>
          <button
            disabled={auditPage >= auditPages}
            onClick={() => setAuditPage((page) => page + 1)}
            className="px-3 py-1.5 border border-border rounded-lg disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-card rounded-2xl border border-border p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-foreground">Nova conta</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-muted rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Nome completo *</label>
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">E-mail *</label>
                <input
                  required
                  type="email"
                  maxLength={191}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Perfil *</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className={inputClass}>
                  {ALL_ROLES.map((role) => (
                    <option key={role} value={role}>{ROLE_LABELS[role]}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  O perfil define o que a pessoa vê. Recepção não acessa evoluções; administrador não acessa pacientes.
                </p>
              </div>
              {formError && (
                <p className="rounded-lg bg-red-100 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{formError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2.5 border border-border rounded-lg font-medium hover:bg-muted">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? "Criando..." : "Criar conta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
