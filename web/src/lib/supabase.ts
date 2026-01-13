/**
 * [INPUT]: 依赖 @supabase/supabase-js, 环境变量
 * [OUTPUT]: 对外提供 supabase 客户端实例
 * [POS]: Supabase 客户端配置
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce", // 使用 PKCE 流程，更安全
  },
});

// ============================================================
// 类型定义
// ============================================================

/** 用户信息 */
export interface UserProfile {
  id: string;
  email?: string;
  role?: string;
}

/** 认证状态 */
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
