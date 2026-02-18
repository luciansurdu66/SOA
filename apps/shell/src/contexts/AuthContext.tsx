import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
} from "react";

const STORAGE_KEY = "auth";

interface AuthState {
    token: string | null;
    refresh: string | null;
    userId: number | null;
}

interface AuthContextValue extends AuthState {
    login: (access: string, refresh: string, userId: number) => void;
    logout: () => void;
    setTokens: (access: string, refresh: string, userId: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored(): AuthState {
    if (typeof window === "undefined") {
        return { token: null, refresh: null, userId: null };
    }

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { token: null, refresh: null, userId: null };
        const data = JSON.parse(raw);
        return {
            token: data.access ?? null,
            refresh: data.refresh ?? null,
            userId: data.user_id ?? null,
        };
    } catch {
        return { token: null, refresh: null, userId: null };
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AuthState>(loadStored);

    const setTokens = useCallback(
        (access: string, refresh: string, userId: number) => {
            setState({ token: access, refresh, userId });
            try {
                localStorage.setItem(
                    STORAGE_KEY,
                    JSON.stringify({ access, refresh, user_id: userId })
                );
            } catch (err) {
                console.warn(
                    "Auth: unable to persist tokens to storage, continuing without persistence.",
                    err
                );
            }
        },
        []
    );

    const login = useCallback(
        (access: string, refresh: string, userId: number) => {
            setTokens(access, refresh, userId);
        },
        [setTokens]
    );

    const logout = useCallback(() => {
        setState({ token: null, refresh: null, userId: null });
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (err) {
            console.warn(
                "Auth: unable to clear tokens from storage, proceeding anyway.",
                err
            );
        }
    }, []);

    const value = useMemo<AuthContextValue>(
        () => ({ ...state, login, logout, setTokens }),
        [state, login, logout, setTokens]
    );

    return (
        <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}
