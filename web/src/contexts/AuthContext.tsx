/**
 * [INPUT]: 依赖 React, @/lib/supabase
 * [OUTPUT]: 对外提供 AuthProvider, useAuth
 * [POS]: 全局认证状态管理
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Session } from "@supabase/supabase-js";
import { supabase, type AuthState } from "@/lib/supabase";

interface AuthContextValue extends AuthState {
  signIn: (email: string) => Promise<void>;
  signInWithOAuth: (provider: "github" | "google") => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    // 获取初始会话
    supabase.auth.getSession().then(({ data: { session } }) => {
      setStateFromSession(session);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setStateFromSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  function setStateFromSession(session: Session | null) {
    const user = session?.user
      ? {
          id: session.user.id,
          email: session.user.email,
          role: session.user.role,
        }
      : null;

    setState({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    });
  }

  // 邮箱魔法链接登录
  async function signIn(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      throw error;
    }
  }

  // OAuth 登录（GitHub、Google）
  async function signInWithOAuth(provider: "github" | "google") {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      throw error;
    }
  }

  // 登出
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }

  const value: AuthContextValue = {
    ...state,
    signIn,
    signInWithOAuth,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
