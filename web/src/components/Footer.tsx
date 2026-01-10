/**
 * [INPUT]: 依赖 @/components/ui/separator
 * [OUTPUT]: 对外提供 Footer 组件
 * [POS]: 全局页脚，包含版权和链接
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { Separator } from "@/components/ui/separator";
import { Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span>vmarker - 视频标记工具集</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <a
              href="https://github.com/bbruceyuan/vmarker#readme"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              文档
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="https://github.com/bbruceyuan/vmarker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              GitHub
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="https://github.com/bbruceyuan/vmarker#api"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              API
            </a>
            <Separator orientation="vertical" className="h-4" />
            <a
              href="https://yuanchaofa.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              关于作者
            </a>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Make video structure visible.
        </p>
      </div>
    </footer>
  );
}
