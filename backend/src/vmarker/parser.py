"""
[INPUT]: 依赖 models.py 的 Subtitle, SubtitleFile
[OUTPUT]: 对外提供 parse_srt(), parse_srt_file()
[POS]: SRT 字幕文件解析器，被所有需要字幕的功能消费
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import re
from pathlib import Path

from vmarker.models import Subtitle, SubtitleFile


# =============================================================================
#  常量
# =============================================================================

_TIMESTAMP_RE = re.compile(r"(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})")
_TIMELINE_RE = re.compile(
    r"(\d{1,2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{1,2}:\d{2}:\d{2}[,.]\d{3})"
)


# =============================================================================
#  内部函数
# =============================================================================

def _parse_timestamp(ts: str) -> float:
    """解析时间戳为秒数"""
    match = _TIMESTAMP_RE.match(ts.strip())
    if not match:
        raise ValueError(f"无效时间戳: '{ts}'")
    h, m, s, ms = match.groups()
    return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def _normalize_content(content: str) -> str:
    """统一换行符"""
    return content.replace("\r\n", "\n").replace("\r", "\n")


def _parse_block(block: str, block_idx: int) -> Subtitle:
    """解析单个字幕块"""
    lines = block.strip().split("\n")
    if len(lines) < 2:
        raise ValueError(f"第 {block_idx} 个字幕块格式不完整")

    # 解析序号
    try:
        index = int(lines[0].strip())
    except ValueError:
        raise ValueError(f"第 {block_idx} 个字幕块序号无效: '{lines[0]}'")

    # 解析时间轴
    timeline = _TIMELINE_RE.match(lines[1].strip())
    if not timeline:
        raise ValueError(f"第 {block_idx} 个字幕块时间轴格式错误: '{lines[1]}'")

    start = _parse_timestamp(timeline.group(1))
    end = _parse_timestamp(timeline.group(2))

    if end < start:
        raise ValueError(f"第 {block_idx} 个字幕块: 结束时间早于开始时间")

    # 解析文本
    text = "\n".join(lines[2:]).strip() if len(lines) > 2 else ""

    return Subtitle(index=index, start_time=start, end_time=end, text=text)


# =============================================================================
#  公共接口
# =============================================================================

def parse_srt(content: str) -> SubtitleFile:
    """
    解析 SRT 字幕内容

    Args:
        content: SRT 文件内容

    Returns:
        SubtitleFile 实例
    """
    content = _normalize_content(content)
    blocks = re.split(r"\n\n+", content.strip())

    subtitles: list[Subtitle] = []
    max_end = 0.0

    for idx, block in enumerate(blocks, 1):
        if not block.strip():
            continue
        sub = _parse_block(block, idx)
        subtitles.append(sub)
        max_end = max(max_end, sub.end_time)

    return SubtitleFile(subtitles=subtitles, duration=max_end)


def parse_srt_file(path: str | Path) -> SubtitleFile:
    """
    解析 SRT 字幕文件

    Args:
        path: 文件路径

    Returns:
        SubtitleFile 实例
    """
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"文件不存在: {path}")

    # 尝试多种编码
    for encoding in ["utf-8", "utf-8-sig", "gbk", "gb2312", "latin-1"]:
        try:
            content = path.read_text(encoding=encoding)
            return parse_srt(content)
        except UnicodeDecodeError:
            continue

    raise ValueError(f"无法识别文件编码: {path}")


def decode_srt_bytes(data: bytes) -> str:
    """
    解码 SRT 字节数据

    Args:
        data: SRT 文件字节内容

    Returns:
        解码后的字符串
    """
    for encoding in ["utf-8", "utf-8-sig", "gbk", "gb2312", "latin-1"]:
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValueError("无法识别文件编码")
