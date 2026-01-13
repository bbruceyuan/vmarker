/**
 * [INPUT]: 依赖 React, @/contexts/AuthContext, @/components/ui/*
 * [OUTPUT]: 对外提供 UserMenu 组件
 * [POS]: 用户菜单（头像、登出）
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

"use client";

import { useState } from "react";
import { ChevronDown, LogOut, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { toast } from "sonner";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    try {
      setIsSigningOut(true);
      await signOut();
      toast.success("已登出");
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("登出失败，请稍后重试");
    } finally {
      setIsSigningOut(false);
    }
  }

  // 用户邮箱的首字母
  const initials = user?.email
    ? user.email.charAt(0).toUpperCase()
    : user?.id?.charAt(0).toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-2 pr-1">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline-block text-sm max-w-[120px] truncate">
            {user?.email}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col gap-1 p-2">
          <p className="text-sm font-medium">{user?.email}</p>
          <p className="text-xs text-muted-foreground">已登录用户</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          登出
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
