# src/lib/
> L2 | 父级: web/CLAUDE.md

工具函数和共享逻辑目录。

## 成员清单

| 文件 | 职责 | 导出 |
|------|------|------|
| `utils.ts` | shadcn/ui 工具函数 | `cn` (clsx + twMerge) |
| `motion.ts` | Framer Motion 动效预设 | `fadeInUp`, `staggerContainer`, `scaleIn`, `viewportConfig` |
| `api.ts` | 后端 API 客户端 | `chapterBarApi`, `showNotesApi`, `subtitleApi`, `progressBarApi`, `videoApi`, `youtubeApi`, 类型定义, 工具函数 |

## api.ts 结构

```typescript
// Chapter Bar API
chapterBarApi.parse(file)                    // 解析 SRT
chapterBarApi.extractAuto(file, interval)    // 自动分段
chapterBarApi.extractAI(file)                // AI 分段
chapterBarApi.validate(chapters, duration)   // 验证章节
chapterBarApi.getThemes()                    // 获取配色
chapterBarApi.generate(...)                  // 生成视频

// Show Notes API
showNotesApi.generate(file)                  // 从 SRT 生成大纲

// Subtitle API
subtitleApi.polish(file)                     // 润色字幕

// Progress Bar API
progressBarApi.getColors()                   // 获取配色列表
progressBarApi.generate(config)              // 生成进度条视频

// Video API
videoApi.upload(file)                        // 上传视频
videoApi.asr(sessionId)                      // ASR 转录
videoApi.compose(sessionId, request)         // 合成视频
videoApi.cleanup(sessionId)                  // 清理会话

// YouTube API
youtubeApi.generateFromUrl(url)              // 从 YouTube URL 生成章节

// 工具函数
formatTime(seconds)                 // 秒 → MM:SS
parseTime(input)                    // MM:SS → 秒
downloadBlob(blob, filename)        // 下载文件
```

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
