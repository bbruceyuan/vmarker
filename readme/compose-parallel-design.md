# 并行合成设计说明

## 实现状态

**状态**: ✅ 已实现 (feat/parallel-compose)

| 功能 | 状态 | 说明 |
|------|------|------|
| 分片计算 | ✅ | `calculate_segments()` |
| 并行合成 | ✅ | `compose_segments_parallel()` (asyncio + Semaphore) |
| 拼接 | ✅ | `concat_segments()` (async, -c copy 优先) |
| 清理 | ✅ | `try/finally` + `cleanup_segments()` |
| 全局节流 | ✅ | `_ACTIVE_JOB_SEMAPHORE` |
| 自动选择 | ✅ | >3min 自动切换并行路径 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `COMPOSE_CHUNK_SECONDS` | 300 | 分片时长（秒） |
| `COMPOSE_MAX_WORKERS` | 2 | 单任务分片并发上限 |
| `COMPOSE_MAX_ACTIVE_JOBS` | 2 | 全局并行任务数上限 |

## 目标
- 合成过程并行化，降低长视频等待时间
- 保持现有合成质量与输出格式
- 通过队列限制并发，避免 QPS 过高

## 分片策略
- 默认按 5 分钟（300s）切片，最后一段不足则保留
- 根据视频时长动态计算：`chunk_seconds = max(60, duration / 3)`
- 由于合成本身需要重编码，可直接在每个分片中重编码并固定 GOP，避免关键帧不齐导致拼接失败
- 建议参数（示例）：`gop = fps * 2`，`-sc_threshold 0` 固定关键帧间隔

## FFmpeg 处理流程

### 1) 先生成整条 Bar 视频
保持现有逻辑，不做变化。

### 2) 分片并行合成（每片一个 FFmpeg）
示例命令（以 "Bar 在下" 为例）：
```bash
ffmpeg -y \
  -ss {start} -t {dur} -i source.mp4 \
  -ss {start} -t {dur} -i bar.mp4 \
  -filter_complex "[1:v]scale={width}:-1[bar];[0:v][bar]vstack=inputs=2[out]" \
  -map "[out]" -map "0:a?" \
  -c:v libx264 -crf 18 -preset fast -g {gop} -keyint_min {gop} -sc_threshold 0 \
  -c:a aac -b:a 128k \
  -reset_timestamps 1 \
  segment_{i}.mp4
```
要点：
- `-ss/-t` 同时作用于源视频和 Bar 视频，确保时间轴一致
- `-reset_timestamps 1` 让每段从 0 开始，便于无重编码拼接
- 如果源视频无音轨，`-map 0:a?` 会自动跳过

### 3) 拼接分片
```bash
printf "file 'segment_0.mp4'\nfile 'segment_1.mp4'\n" > segments.txt
ffmpeg -f concat -safe 0 -i segments.txt -c copy output.mp4
```
若 `-c copy` 失败，则降级为重编码：
```bash
ffmpeg -f concat -safe 0 -i segments.txt -c:v libx264 -crf 18 -preset fast -c:a aac output.mp4
```

## 架构设计

### 数据结构
- `Segment`: 分片信息（index, start, duration, status, output_path, error）
- `ParallelConfig`: 并行配置（position, chunk_seconds, max_workers, gop_multiplier）

### 流程
1. API 接收请求
2. 生成 Bar 视频
3. 计算分片列表
4. 并行处理分片（受 `_ACTIVE_JOB_SEMAPHORE` 全局并发约束）
5. 拼接分片
6. 清理临时文件（`try/finally` 保证）

### 并发控制
- 全局节流：`asyncio.Semaphore(DEFAULT_MAX_ACTIVE_JOBS)`
- 单任务分片并发：`asyncio.Semaphore(max_workers)`
- 验证：Config 层 `__post_init__` + API 层 `field_validator`

### 清理策略
- 分片和中间文件放到会话临时目录
- 任务完成或失败后清理分片文件（`try/finally`）
- 后台清理超过 24h 的临时目录

## API 端点

| 端点 | 说明 |
|------|------|
| `POST /api/v1/video/compose/{session_id}` | 自动选择串行/并行（>3min 并行） |
| `POST /api/v1/video/compose-parallel/{session_id}` | 强制并行（可指定 chunk_seconds/max_workers） |
