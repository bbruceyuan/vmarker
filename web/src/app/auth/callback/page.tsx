/**
 * [INPUT]: 依赖 React, next/navigation, @/lib/supabase
 * [OUTPUT]: OAuth 回调页面
 * [POS]: 客户端完成 code 交换并重定向
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const redirectTo = searchParams.get("redirect_to") ?? "/";

  useEffect(() => {
    if (!code) {
      router.replace(redirectTo);
      return;
    }

    let cancelled = false;

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ error }) => {
        if (error) {
          console.error("Auth callback error:", error);
        }
      })
      .finally(() => {
        if (!cancelled) {
          router.replace(redirectTo);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, redirectTo, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">正在登录...</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">加载中...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
