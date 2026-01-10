# landing/
> L2 | 父级: components/CLAUDE.md

Landing Page Section 组件目录。

## 设计系统约束

**一切设计必须来自设计系统的颜色和组件。**

- 颜色: 使用 `primary`, `secondary`, `muted`, `accent`, `destructive` 等 CSS 变量
- 组件: 优先使用 `@/components/ui/` 下的 shadcn 组件
- 动效: 使用 `@/lib/motion` 中的预设 variants
- 禁止: 硬编码颜色值（如 `#ffffff`, `rgb()`）

## 成员清单

| 文件 | 职责 | 依赖组件 |
|------|------|----------|
| `index.ts` | 统一导出入口 | - |
| `HeroSection.tsx` | 首屏英雄区，价值主张 + 章节进度条预览 + 3 个 CTA（开始使用、YouTube Soon、GitHub → bbruceyuan/vmarker） | Button, Badge |
| `FeaturesSection.tsx` | 功能展示区，3 步骤简洁展示 | - |
| `Pricing.tsx` | 定价区，CLI 免费 + Web 按次 | Card, Button, Badge |
| `FAQ.tsx` | 常见问题区，Accordion 展示 | Accordion |
| `FinalCTA.tsx` | 最终号召区，柔和背景 CTA | Button |

## 页面组合顺序

```
HeroSection      - 首屏英雄区 + 章节进度条预览（含播放进度状态）
FeaturesSection  - 三步骤功能展示
Pricing          - 定价方案
FAQ              - 常见问题
FinalCTA         - 最终行动号召
```

## 动效规范

所有组件使用 `@/lib/motion` 中的预设：

- `fadeInUp`: 淡入上升，用于标题、内容块
- `staggerContainer`: 子元素依次入场
- `viewportConfig`: `{ once: true, margin: "-100px" }`

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
