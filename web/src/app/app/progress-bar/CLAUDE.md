# progress-bar/
> L2 | 父级: app/CLAUDE.md

Progress Bar 功能页面目录。

## 成员清单

- `page.tsx`: 播放进度条生成页面，配置参数生成进度条视频

## 功能

1. 手动输入视频时长
2. 选择进度条高度 (4/8/12px)
3. 选择配色方案或自定义颜色
4. 选择输出格式 (MP4/MOV)
5. 实时预览生成的视频

## 配置参数

| 参数 | 范围 | 默认值 |
|------|------|--------|
| duration | 1-600秒 | 60 |
| width | 640-3840px | 1920 |
| height | 4/8/12px | 8 |
| played_color | HEX | #2563EB |
| unplayed_color | HEX | #64748B |

## 适用场景

- 短视频平台（无内置进度条）
- 视频剪辑叠加层
- 提升观众留存

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
