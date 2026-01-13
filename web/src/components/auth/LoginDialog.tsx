/**
 * [INPUT]: 依赖 React, @/contexts/AuthContext, @/components/ui/*
 * [OUTPUT]: 对外提供 LoginDialog 组件
 * [POS]: 用户登录对话框
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import { Github, Mail, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface LoginDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const { signInWithOAuth, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  async function handleOAuthLogin(provider: "github" | "google") {
    try {
      setIsLoading(provider);
      await signInWithOAuth(provider);
    } catch (error) {
      console.error("Login error:", error);
      toast.error("登录失败，请稍后重试");
      setIsLoading(null);
    }
  }

  async function handleEmailLogin() {
    if (!email.trim()) {
      toast.error("请输入邮箱地址");
      return;
    }

    try {
      setIsLoading("email");
      await signIn(email.trim());
      toast.success("登录链接已发送，请查收邮箱");
    } catch (error) {
      console.error("Login error:", error);
      toast.error("发送失败，请稍后重试");
    } finally {
      setIsLoading(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="text-xl">登录 vmarker</DialogTitle>
          <DialogDescription>
            选择登录方式，开始使用视频标记工具
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          {/* 邮箱魔法链接 */}
          <div className="flex flex-col gap-2">
            <Input
              type="email"
              placeholder="邮箱地址"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              disabled={isLoading !== null}
            />
            <Button
              className="w-full h-11"
              onClick={handleEmailLogin}
              disabled={isLoading !== null}
            >
              {isLoading === "email" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "发送登录链接"
              )}
            </Button>
          </div>

          {/* GitHub 登录 */}
          <Button
            variant="outline"
            className="w-full gap-2 h-11"
            onClick={() => handleOAuthLogin("github")}
            disabled={isLoading !== null}
          >
            {isLoading === "github" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Github className="h-4 w-4" />
            )}
            使用 GitHub 继续
          </Button>

          {/* Google 登录 */}
          <Button
            variant="outline"
            className="w-full gap-2 h-11"
            onClick={() => handleOAuthLogin("google")}
            disabled={isLoading !== null}
          >
            {isLoading === "google" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            使用 Google 继续
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-4">
          登录即表示您同意我们的服务条款和隐私政策
        </p>
      </DialogContent>
    </Dialog>
  );
}
