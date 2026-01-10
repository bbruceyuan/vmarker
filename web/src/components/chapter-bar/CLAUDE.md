# chapter-bar/
> L2 | 父级: components/CLAUDE.md

Chapter Bar 功能组件目录。实现章节进度条生成的完整工作流。

## 设计系统约束

**一切设计必须来自设计系统的颜色和组件。**

- 颜色: 使用 `primary`, `secondary`, `muted`, `accent`, `destructive` 等 CSS 变量
- 组件: 优先使用 `@/components/ui/` 下的 shadcn 组件
- 禁止: 硬编码颜色值（如 `#ffffff`, `rgb()`）

## 成员清单

| 文件 | 职责 | 依赖 |
|------|------|------|
| `index.ts` | 统一导出入口 | - |
| `FileUploader.tsx` | 文件上传组件，支持拖拽、快速生成/详细配置双入口 | @/lib/api |
| `ExtractionMode.tsx` | 章节提取模式选择 (AI/自动) | @/lib/api |
| `ChapterEditor.tsx` | 章节编辑器，增删改查 | @/lib/api |
| `ThemeSelector.tsx` | 配色选择器 + 自定义颜色 + 视频尺寸配置 | @/lib/api |
| `VideoGenerator.tsx` | 视频生成和下载，含视频播放器 + seek | @/lib/api |

## 工作流程

### 标准流程
```
FileUploader      → 上传 SRT 文件 → 点击「详细配置」
ExtractionMode    → 选择 AI/自动分段
ChapterEditor     → 编辑章节标题和时间
ThemeSelector     → 选择配色和视频尺寸
VideoGenerator    → 生成视频并下载
```

### 快速流程
```
FileUploader      → 上传 SRT 文件 → 点击「快速生成」→ 直接跳到 VideoGenerator
```

## API 依赖

所有组件调用 `@/lib/api` 中的 `chapterBarApi`：

- `parse()` - 解析 SRT 文件
- `extractAuto()` - 自动分段
- `extractAI()` - AI 智能分段
- `validate()` - 验证章节配置
- `getThemes()` - 获取配色方案
- `generate()` - 生成视频

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
