"""
[INPUT]: 依赖 models, themes, ai_client, video_encoder, Pillow
[OUTPUT]: 对外提供 extract_auto(), extract_ai(), validate(), generate()
[POS]: 章节进度条完整流程，是 Chapter Bar 功能的核心实现
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import re
from pathlib import Path

from PIL import Image, ImageDraw

from vmarker.ai_client import AIClient, AIConfig
from vmarker.models import (
    Chapter,
    ChapterBarConfig,
    ChapterList,
    ChapterValidationResult,
    ColorScheme,
    Subtitle,
    ValidationIssue,
    VideoConfig,
)
from vmarker.themes import get_theme
from vmarker.video_encoder import (
    ProgressCallback,
    VideoEncoder,
    get_font,
    hex_to_rgba,
)


# =============================================================================
#  章节提取 - 自动分段
# =============================================================================

def extract_auto(
    subtitles: list[Subtitle],
    duration: float,
    interval: int = 60,
) -> ChapterList:
    """
    按固定时间间隔自动划分章节

    Args:
        subtitles: 字幕列表
        duration: 视频总时长
        interval: 分段间隔（秒），范围 30-300

    Returns:
        ChapterList 实例
    """
    interval = max(30, min(300, interval))
    chapters: list[Chapter] = []
    num = 1
    start = 0.0

    while start < duration:
        end = min(start + interval, duration)
        title = _extract_title(subtitles, start, end) or f"章节 {num}"
        chapters.append(Chapter(title=title, start_time=start, end_time=end))
        start = end
        num += 1

    return ChapterList(chapters=chapters, duration=duration)


def _extract_title(subs: list[Subtitle], start: float, end: float) -> str:
    """从时间段内的字幕提取标题"""
    segment = [s for s in subs if start <= s.start_time < end]
    if not segment:
        return ""
    text = segment[0].text.strip()
    # 移除标点
    text = re.sub(r"[\s，。！？、；：""''…—]+", " ", text).strip()
    return text[:15] + "..." if len(text) > 15 else text


# =============================================================================
#  章节提取 - AI 智能分段
# =============================================================================

_AI_PROMPT = """你是视频章节分析专家。分析以下字幕，将视频划分为 5-10 个章节。

要求：
1. 识别主题变化点
2. 标题简洁有意义（不超过15字）
3. 时间连续，覆盖整个视频

视频总时长: {duration:.1f} 秒

字幕:
{subtitles}

返回 JSON 格式（不要其他内容）:
{{"chapters": [{{"title": "标题", "start_time": 0.0, "end_time": 120.0}}, ...]}}"""


async def extract_ai(
    subtitles: list[Subtitle],
    duration: float,
    *,
    api_key: str,
    api_base: str = "https://api.openai.com/v1",
    model: str = "gpt-4o-mini",
) -> ChapterList:
    """
    使用 AI 智能划分章节

    Args:
        subtitles: 字幕列表
        duration: 视频总时长
        api_key: API Key
        api_base: API 基础 URL
        model: 模型名称

    Returns:
        ChapterList 实例
    """
    # 构建字幕文本
    sub_text = "\n".join(f"[{s.start_time:.1f}s] {s.text}" for s in subtitles)
    if len(sub_text) > 15000:
        sub_text = sub_text[:15000] + "\n...(已截断)"

    prompt = _AI_PROMPT.format(duration=duration, subtitles=sub_text)

    config = AIConfig(api_key=api_key, api_base=api_base, model=model)
    async with AIClient(config) as client:
        data = await client.chat_json(prompt)

    chapters = [
        Chapter(
            title=str(c.get("title", "未命名")),
            start_time=float(c.get("start_time", 0)),
            end_time=float(c.get("end_time", duration)),
        )
        for c in data.get("chapters", [])
    ]

    return ChapterList(chapters=chapters, duration=duration)


# =============================================================================
#  章节验证
# =============================================================================

def validate(chapters: list[Chapter], duration: float) -> ChapterValidationResult:
    """
    验证并修正章节配置

    Args:
        chapters: 原始章节列表
        duration: 视频总时长

    Returns:
        ChapterValidationResult 实例
    """
    issues: list[ValidationIssue] = []

    # 空检查
    if not chapters:
        issues.append(ValidationIssue(code="EMPTY", message="章节列表为空", blocking=True))
        return ChapterValidationResult(valid=False, issues=issues, chapters=[])

    # 复制并排序
    fixed = sorted([c.model_copy() for c in chapters], key=lambda c: c.start_time)

    # 阻塞性检查
    for i, ch in enumerate(fixed):
        if ch.end_time < ch.start_time:
            issues.append(ValidationIssue(
                code="TIME_ORDER",
                message=f"章节 {i+1} 结束时间早于开始时间",
                blocking=True,
                index=i,
            ))
        if ch.start_time > duration:
            issues.append(ValidationIssue(
                code="EXCEED",
                message=f"章节 {i+1} 开始时间超出视频时长",
                blocking=True,
                index=i,
            ))

    # 重叠检查
    for i in range(len(fixed) - 1):
        if fixed[i].end_time > fixed[i + 1].start_time:
            issues.append(ValidationIssue(
                code="OVERLAP",
                message=f"章节 {i+1} 与 {i+2} 时间重叠",
                blocking=True,
                index=i,
            ))

    # 有阻塞性问题则返回
    if any(i.blocking for i in issues):
        return ChapterValidationResult(valid=False, issues=issues, chapters=fixed)

    # 警告检查
    for i, ch in enumerate(fixed):
        if not ch.title.strip():
            issues.append(ValidationIssue(
                code="EMPTY_TITLE",
                message=f"章节 {i+1} 标题为空",
                blocking=False,
                index=i,
            ))
        if ch.end_time - ch.start_time < 5:
            issues.append(ValidationIssue(
                code="SHORT",
                message=f"章节 {i+1} 时长小于 5 秒",
                blocking=False,
                index=i,
            ))

    # 自动修正间隙
    fixed = _fix_gaps(fixed, duration)

    return ChapterValidationResult(valid=True, issues=issues, chapters=fixed)


def _fix_gaps(chapters: list[Chapter], duration: float) -> list[Chapter]:
    """修正章节间隙"""
    if not chapters:
        return chapters

    result = []
    for i, ch in enumerate(chapters):
        start = ch.start_time
        end = ch.end_time

        # 开头间隙
        if i == 0 and start > 0:
            start = 0

        # 中间间隙：归属到前一章节
        if i > 0 and result[-1].end_time < start:
            result[-1] = Chapter(
                title=result[-1].title,
                start_time=result[-1].start_time,
                end_time=start,
            )

        # 结尾间隙
        if i == len(chapters) - 1 and end < duration:
            end = duration

        # 超出时长截断
        end = min(end, duration)

        result.append(Chapter(title=ch.title, start_time=start, end_time=end))

    return result


# =============================================================================
#  视频生成
# =============================================================================

def generate(
    config: ChapterBarConfig,
    output_path: str | Path,
    *,
    progress_callback: ProgressCallback | None = None,
    format: str = "mp4",
    scheme: ColorScheme | None = None,
) -> Path:
    """
    生成章节进度条视频

    Args:
        config: 章节进度条配置
        output_path: 输出文件路径
        progress_callback: 进度回调
        format: 输出格式 ("mp4" 通用格式 / "mov" 透明背景)
        scheme: 配色方案（可选，不传则使用 config.theme）

    Returns:
        输出文件路径
    """
    output_path = Path(output_path)
    if scheme is None:
        scheme = get_theme(config.theme)
    video = config.video

    encoder = VideoEncoder(video.width, video.height, video.fps)

    def render(current_time: float) -> Image.Image:
        return _render_frame(config.chapters, config.duration, current_time, video, scheme)

    return encoder.encode(
        config.duration,
        render,
        output_path,
        progress_callback=progress_callback,
        format=format,
    )


def _render_frame(
    chapters: list[Chapter],
    duration: float,
    current_time: float,
    video: VideoConfig,
    scheme: ColorScheme,
) -> Image.Image:
    """渲染单帧"""
    w, h = video.width, video.height
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    font = get_font(max(12, h // 3))

    for ch in chapters:
        _draw_chapter(draw, ch, duration, current_time, w, h, scheme, font)

    # 指示器
    x = int(current_time / duration * w)
    draw.rectangle([x - 1, 0, x + 1, h], fill=hex_to_rgba(scheme.indicator))

    return img


def _draw_chapter(
    draw: ImageDraw.ImageDraw,
    ch: Chapter,
    duration: float,
    current_time: float,
    width: int,
    height: int,
    scheme: ColorScheme,
    font,
) -> None:
    """绘制单个章节"""
    x1 = int(ch.start_time / duration * width)
    x2 = int(ch.end_time / duration * width)
    cw = x2 - x1

    # 绘制背景
    if current_time >= ch.end_time:
        bg = hex_to_rgba(scheme.played_bg)
        fg = hex_to_rgba(scheme.played_text)
    elif current_time <= ch.start_time:
        bg = hex_to_rgba(scheme.unplayed_bg)
        fg = hex_to_rgba(scheme.unplayed_text)
    else:
        px = int(current_time / duration * width)
        draw.rectangle([x1, 0, px, height], fill=hex_to_rgba(scheme.played_bg))
        draw.rectangle([px, 0, x2, height], fill=hex_to_rgba(scheme.unplayed_bg))
        bg = None
        fg = hex_to_rgba(scheme.played_text)

    if bg:
        draw.rectangle([x1, 0, x2, height], fill=bg)

    # 绘制标题
    title = ch.title
    bbox = draw.textbbox((0, 0), title, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]

    if tw > cw - 10 and cw > 10:
        while tw > cw - 10 and len(title) > 1:
            title = title[:-1]
            bbox = draw.textbbox((0, 0), title + "...", font=font)
            tw = bbox[2] - bbox[0]
        title = title + "..."

    tx = x1 + (cw - tw) // 2
    ty = (height - th) // 2
    draw.text((tx, ty), title, font=font, fill=fg)

    # 绘制分隔线
    if ch.end_time < duration:
        draw.rectangle([x2 - 2, 0, x2, height], fill=hex_to_rgba(scheme.separator))
