# chapter-bar/
> L2 | 父级: app/CLAUDE.md

Chapter Bar 功能页面目录。

## 成员清单

- `page.tsx`: 多步骤向导页面，组合 5 个步骤组件，支持快速模式

## 工作流程

### 标准流程
```
Step 1: upload   → FileUploader    → 上传 SRT 文件
Step 2: extract  → ExtractionMode  → 选择分段方式
Step 3: edit     → ChapterEditor   → 编辑章节
Step 4: config   → ThemeSelector   → 配置样式（支持自定义配色）
Step 5: generate → VideoGenerator  → 生成下载（支持视频 seek）
```

### 快速模式
```
上传 SRT → 点击「快速生成」→ 自动提取章节 → 直接跳到 VideoGenerator
```

快速模式自动应用：60秒间隔分段 + tech-blue 配色 + 1920x60 尺寸

## 状态管理

页面使用 `useState` 管理向导状态：

```typescript
interface WizardState {
  file: File | null;           // 上传的 SRT 文件
  duration: number;            // 视频时长（秒）
  chapters: Chapter[];         // 章节列表
  theme: string;               // 配色方案 ID
  customColors: CustomColors | null;  // 自定义配色（优先于 theme）
  videoWidth: number;          // 视频宽度
  videoHeight: number;         // 视频高度
  isQuickMode: boolean;        // 是否快速模式
}
```

## 组件依赖

所有步骤组件位于 `@/components/chapter-bar/`：

- `FileUploader` - 文件上传（支持快速生成 / 详细配置两种入口）
- `ExtractionMode` - 分段模式选择
- `ChapterEditor` - 章节编辑器
- `ThemeSelector` - 配色选择器（含自定义颜色选择器）
- `VideoGenerator` - 视频生成（含视频播放器 + seek）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
