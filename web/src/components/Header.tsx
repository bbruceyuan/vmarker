/**
 * [INPUT]: 依赖 next/link, @/components/ui/button, lucide-react
 * [OUTPUT]: 对外提供 Header 组件
 * [POS]: 全局导航栏，包含 Logo 和导航链接
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function Header() {
  return (
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
          <a
            href="https://github.com/bbruceyuan/vmarker"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">
              GitHub
            </Button>
          </a>
        </div>
      </nav>
    </header>
  );
}
