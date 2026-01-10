# app/
> L2 | 父级: src/app/CLAUDE.md

工作台路由目录。包含所有功能页面。

## 成员清单

| 文件/目录 | 职责 | 技术特征 |
|-----------|------|----------|
| `page.tsx` | 工作台入口页，展示功能列表，功能卡片导航 | 6 个功能卡片，响应式布局 |
| `chapter-bar/page.tsx` | Chapter Bar 功能页面，SRT 上传 → 提取章节 → 生成视频 | AI/自动分段，章节编辑，多主题 |
| `progress-bar/page.tsx` | Progress Bar 功能页面，SRT 上传 → 配置 → 生成进度条视频 | 颜色自定义，高度调节 |
| `shownotes/page.tsx` | Show Notes 功能页面，SRT 上传 → AI 生成大纲 | 摘要+时间戳大纲，可复制 |
| `subtitle/page.tsx` | Subtitle 功能页面，SRT 上传 → AI 润色 → 下载 | 空耳修正，对比展示 |
| `video/page.tsx` | 视频处理页面，上传视频 → ASR → 功能选择 → 合成 | 多功能集成，视频对比播放 |
| `youtube/page.tsx` | YouTube 章节页面，粘贴链接 → 获取字幕 → AI 分段 → 复制 | 最短转化路径，两步进度展示 |

## 路由

| 路径 | 说明 | 状态 |
|------|------|------|
| `/app` | 功能选择页 | ✅ |
| `/app/chapter-bar` | 章节进度条生成 (SRT 输入) | ✅ |
| `/app/progress-bar` | 播放进度条 (SRT 输入) | ✅ |
| `/app/shownotes` | 视频大纲生成 (SRT 输入) | ✅ |
| `/app/subtitle` | 字幕润色 (SRT 输入) | ✅ |
| `/app/video` | 视频一站式处理 (视频 → ASR → 功能选择 → 结果) | ✅ |
| `/app/youtube` | YouTube 章节生成 (URL → 字幕 → AI 分段 → 章节) | ✅ |

## 架构设计

三种工作流：
1. **SRT 流** (chapter-bar/progress-bar/shownotes/subtitle): 用户已有 SRT → 单一功能处理
2. **视频流** (video): 用户上传视频 → ASR 转录 → 多功能处理 → 视频合成/文本导出
3. **YouTube 流** (youtube): 用户粘贴链接 → 获取字幕 → AI 分段 → 输出章节时间戳

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
