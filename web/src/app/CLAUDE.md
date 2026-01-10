# src/app/
> L2 | 父级: web/CLAUDE.md

App Router 页面目录。

## 成员清单

- `layout.tsx`: 根布局，定义字体、Header、Footer
- `page.tsx`: 首页 Landing Page，组合 5 个 Section 组件
- `globals.css`: TailwindCSS v4 全局样式 + Amethyst Haze 主题变量
- `favicon.ico`: 网站图标
- `design-system/`: 设计系统展示页
- `app/`: 工作台功能页面

## 路由

| 路径 | 说明 |
|------|------|
| `/` | 首页 Landing Page |
| `/design-system` | 设计系统组件展示 |
| `/app` | 工作台入口 (功能选择) |
| `/app/chapter-bar` | 章节进度条生成 |

## 首页 Landing Page 结构

```
HeroSection      - 首屏英雄区 + 章节进度条预览
FeaturesSection  - 三步骤功能展示
Pricing          - 定价方案
FAQ              - 常见问题
FinalCTA         - 最终行动号召
```

## 工作台结构

详见 `app/CLAUDE.md`

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
