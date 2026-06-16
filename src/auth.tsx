import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { Id } from "../convex/_generated/dataModel";

const TOKEN_KEY = "todonotes_token";

type User = { _id: Id<"users">; name?: string; email: string; role?: "developer" | "manager" };

type AuthValue = {
  token: string | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );

  const signInMut = useMutation(api.auth.signIn);
  const signUpMut = useMutation(api.auth.signUp);
  const signOutMut = useMutation(api.auth.signOut);

  // Resolve the user for the current token (skips the query when signed out).
  const me = useQuery(api.users.me, token ? { token } : "skip");

  // A token that no longer resolves to a user is stale — drop it.
  useEffect(() => {
    if (token && me === null) {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
    }
  }, [token, me]);

  const persist = useCallback((t: string) => {
    localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { token: t } = await signInMut({ email, password });
      persist(t);
    },
    [signInMut, persist],
  );

  const signUp = useCallback(
    async (email: string, password: string, name?: string) => {
      const { token: t } = await signUpMut({ email, password, name });
      persist(t);
    },
    [signUpMut, persist],
  );

  const signOut = useCallback(async () => {
    if (token) {
      try {
        await signOutMut({ token });
      } catch {
        // best-effort; clear locally regardless
      }
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, [token, signOutMut]);

  const value = useMemo<AuthValue>(
    () => ({
      token,
      user: me ?? null,
      loading: token !== null && me === undefined,
      signIn,
      signUp,
      signOut,
    }),
    [token, me, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

/** Token for use inside the authenticated tree (asserts non-null). */
export function useToken(): string {
  const { token } = useAuth();
  return token as string;
}
