# web/
> L2 | 父级: /CLAUDE.md

Next.js 16 + TailwindCSS v4 + shadcn/ui 前端应用。

## 设计系统约束

**一切设计必须来自设计系统的颜色和组件。**

- 颜色: 使用 `primary`, `secondary`, `muted`, `accent`, `destructive` 等 CSS 变量
- 组件: 优先使用 `@/components/ui/` 下的 shadcn 组件
- 动效: 使用 `@/lib/motion` 中的预设 variants
- 主题: Amethyst Haze (tweakcn.com)
- 禁止: 硬编码颜色值（如 `#ffffff`, `rgb()`）

## 目录结构

```
web/
├── src/
│   ├── app/                - App Router 页面
│   │   ├── page.tsx          - 首页 Landing Page
│   │   ├── design-system/    - 设计系统展示页
│   │   ├── app/              - 工作台功能页面
│   │   │   ├── page.tsx        - 功能选择入口
│   │   │   └── chapter-bar/    - 章节进度条功能
│   │   └── globals.css       - 全局样式 + 主题变量
│   ├── components/         - UI 组件
│   │   ├── landing/          - Landing Page 组件 (5 个)
│   │   ├── chapter-bar/      - Chapter Bar 组件 (5 个)
│   │   ├── ui/               - shadcn 基础组件 (30+)
│   │   ├── Header.tsx        - 全局导航栏
│   │   └── Footer.tsx        - 全局页脚
│   └── lib/                - 工具函数
│       ├── utils.ts          - shadcn 工具 (cn)
│       ├── motion.ts         - Framer Motion 动效预设
│       └── api.ts            - 后端 API 客户端
├── public/                 - 静态资源
├── components.json         - shadcn/ui 配置
├── next.config.ts          - Next.js 配置
├── postcss.config.mjs      - PostCSS + TailwindCSS v4
└── package.json            - 依赖配置
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router + Turbopack) |
| 样式 | TailwindCSS v4 + shadcn/ui |
| 主题 | Amethyst Haze |
| 动效 | framer-motion |
| 图标 | lucide-react, react-icons |
| 工具 | clsx, tailwind-variants |

## 开发命令

```bash
npm run dev      # 启动开发服务器 (Turbopack)
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 代码检查
```

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 首页 Landing Page |
| `/design-system` | 设计系统组件展示 |
| `/app` | 工作台入口 (功能选择) |
| `/app/chapter-bar` | 章节进度条生成 |

## Landing Page 结构

首页由 5 个 Section 组件组成：

1. **HeroSection** - 首屏英雄区 + 章节进度条预览
2. **FeaturesSection** - 三步骤功能展示
3. **Pricing** - 定价方案
4. **FAQ** - 常见问题
5. **FinalCTA** - 最终行动号召

## 工作台功能

| 功能 | 路径 | 状态 |
|------|------|------|
| Chapter Bar | `/app/chapter-bar` | ✅ 可用 |
| Progress Bar | `/app/progress-bar` | 📋 规划 |
| Shownotes | `/app/shownotes` | 📋 规划 |
| Subtitle | `/app/subtitle` | 📋 规划 |

## 约定

- **shadcn/ui**: 所有 UI 组件的基础
- **framer-motion**: 滑入/过渡动效，使用 @/lib/motion 预设
- **lucide-react**: 系统图标
- **react-icons/si**: 社媒图标 (Si 前缀)
- **tailwind-variants**: 组件变体管理

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
