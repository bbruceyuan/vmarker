/**
 * [INPUT]: 依赖 next/link, @/components/ui/button, lucide-react, @/contexts/AuthContext, @/components/auth
 * [OUTPUT]: 对外提供 Header 组件
 * [POS]: 全局导航栏，包含 Logo、导航链接、登录状态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LoginDialog, UserMenu } from "@/components/auth";

export default function Header() {
  const { isAuthenticated, isLoading } = useAuth();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto flex h-14 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 font-semibold">
            <Sparkles className="h-7 w-7 text-primary" />
            <div className="flex flex-col">
              <span className="text-xl font-bold">vmarker</span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                让视频结构可见化
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link href="/app">
              <Button size="sm">开始使用</Button>
            </Link>

            {/* GitHub 链接 */}
            <a
              href="https://github.com/bbruceyuan/vmarker"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="hidden sm:flex">
                GitHub
              </Button>
            </a>

            {/* 登录状态 */}
            {isLoading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : isAuthenticated ? (
              <UserMenu />
            ) : (
              <Button size="sm" onClick={() => setLoginDialogOpen(true)}>
                登录
              </Button>
            )}
          </div>
        </nav>
      </header>

      {/* 登录对话框 */}
      <LoginDialog open={loginDialogOpen} onOpenChange={setLoginDialogOpen} />
    </>
  );
}
