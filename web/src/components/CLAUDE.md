# src/components/
> L2 | 父级: web/CLAUDE.md

UI 组件目录。

## 设计系统约束

**一切设计必须来自设计系统的颜色和组件。**

- 颜色: 使用 `primary`, `secondary`, `muted`, `accent`, `destructive` 等 CSS 变量
- 组件: 优先使用 `@/components/ui/` 下的 shadcn 组件
- 动效: 使用 `@/lib/motion` 中的预设 variants
- 禁止: 硬编码颜色值（如 `#ffffff`, `rgb()`）

## 目录结构

```
components/
├── landing/          - Landing Page Section 组件 (5 个)
├── chapter-bar/      - Chapter Bar 功能组件 (5 个)
├── ui/               - shadcn 基础组件 (30+)
├── Header.tsx        - 全局导航栏
└── Footer.tsx        - 全局页脚
```

## 成员清单

### 布局组件
- `Header.tsx`: 全局导航栏，包含 Logo + 副标题"让视频结构可见化" + CTA 按钮（开始使用、GitHub）
- `Footer.tsx`: 全局页脚，包含版权信息 + 4 个外部链接（文档、GitHub、API、关于作者）

### Landing Page 组件
详见 `landing/CLAUDE.md`

### Chapter Bar 组件
详见 `chapter-bar/CLAUDE.md`

### UI 组件 (shadcn)
- `ui/button.tsx`: 按钮组件
- `ui/card.tsx`: 卡片组件
- `ui/input.tsx`: 输入框组件
- `ui/badge.tsx`: 标签组件
- `ui/accordion.tsx`: 手风琴组件
- `ui/progress.tsx`: 进度条组件
- ... (共 30+ 组件)

## 组件开发约定

1. 所有自定义组件必须有 L3 头部注释
2. 使用 shadcn/ui 组件作为基础
3. 样式使用 Tailwind CSS 类名 + 设计系统变量
4. 交互动效使用 framer-motion + @/lib/motion 预设

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
