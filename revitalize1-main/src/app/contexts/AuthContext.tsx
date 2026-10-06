import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  PASSWORD_CHANGE_EVENT,
  UNAUTHORIZED_EVENT,
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  pingSession,
  type AuthUser,
} from "../api";

type LogoutReason = "manual" | "idle" | "expired";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  // Mensagem mostrada na tela de login (ex.: sessão encerrada por inatividade).
  notice: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: (reason?: LogoutReason) => Promise<void>;
  setUser: (user: AuthUser) => void;
  clearNotice: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll", "wheel"] as const;
// Avisa o servidor no máximo a cada 2 minutos que a pessoa continua usando o sistema.
const PING_INTERVAL_MS = 2 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;
const LEGACY_STORAGE_KEYS = ["revitalize-token", "currentAppointment", "appointmentNotes"];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [idleMinutes, setIdleMinutes] = useState(15);

  const lastActivity = useRef(Date.now());
  const lastPing = useRef(Date.now());

  // Ao abrir o sistema, pergunta ao servidor se o cookie de sessão ainda é válido.
  useEffect(() => {
    // Remove dados que versões antigas do sistema gravavam no navegador.
    LEGACY_STORAGE_KEYS.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Navegador sem acesso ao armazenamento: nada a limpar.
      }
    });

    let active = true;
    getMe()
      .then(({ user: me, session }) => {
        if (!active) return;
        setUserState(me);
        setIdleMinutes(session.idleMinutes);
      })
      .catch(() => {
        if (active) setUserState(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const endLocalSession = useCallback((message: string | null) => {
    setUserState(null);
    setNotice(message);
  }, []);

  const logout = useCallback(
    async (reason: LogoutReason = "manual") => {
      try {
        await logoutRequest();
      } catch {
        // Mesmo sem resposta do servidor, a tela é fechada.
      }
      endLocalSession(
        reason === "idle"
          ? "Sua sessão foi encerrada após um período sem uso. Entre novamente."
          : reason === "expired"
            ? "Sua sessão expirou. Entre novamente."
            : null,
      );
    },
    [endLocalSession],
  );

  // Qualquer resposta 401 da API fecha a sessão na tela.
  useEffect(() => {
    const onUnauthorized = () => {
      setUserState((current) => {
        if (current) setNotice("Sua sessão expirou. Entre novamente.");
        return null;
      });
    };
    const onPasswordChange = () => {
      setUserState((current) => (current ? { ...current, mustChangePassword: true } : current));
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    window.addEventListener(PASSWORD_CHANGE_EVENT, onPasswordChange);
    return () => {
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
      window.removeEventListener(PASSWORD_CHANGE_EVENT, onPasswordChange);
    };
  }, []);

  // Controle de inatividade: encerra a sessão após o tempo definido no servidor
  // e mantém a sessão viva no servidor enquanto houver uso da tela.
  useEffect(() => {
    if (!user) return;
    lastActivity.current = Date.now();
    lastPing.current = Date.now();

    const onActivity = () => {
      lastActivity.current = Date.now();
    };
    ACTIVITY_EVENTS.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));

    const timer = window.setInterval(() => {
      const now = Date.now();
      if (now - lastActivity.current > idleMinutes * 60 * 1000) {
        void logout("idle");
        return;
      }
      if (lastActivity.current > lastPing.current && now - lastPing.current > PING_INTERVAL_MS) {
        lastPing.current = now;
        pingSession().catch(() => undefined);
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      window.clearInterval(timer);
    };
  }, [user, idleMinutes, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedUser, session } = await loginRequest(email, password);
    setIdleMinutes(session.idleMinutes);
    setNotice(null);
    setUserState(loggedUser);
    return loggedUser;
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      notice,
      login,
      logout,
      setUser: (next: AuthUser) => setUserState(next),
      clearNotice: () => setNotice(null),
    }),
    [user, loading, notice, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
