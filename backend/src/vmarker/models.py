"""
[INPUT]: 依赖 pydantic 的 BaseModel, Field
[OUTPUT]: 对外提供 Subtitle, Chapter, ColorScheme, VideoConfig 等数据模型
[POS]: vmarker 核心数据模型，被所有功能模块消费
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

from pydantic import BaseModel, Field


# =============================================================================
#  通用数据模型
# =============================================================================

class Subtitle(BaseModel):
    """单条字幕"""
    index: int = Field(..., description="字幕序号，从 1 开始")
    start_time: float = Field(..., ge=0, description="开始时间，单位秒")
    end_time: float = Field(..., ge=0, description="结束时间，单位秒")
    text: str = Field(..., description="字幕文本内容")


class SubtitleFile(BaseModel):
    """SRT 字幕文件解析结果"""
    subtitles: list[Subtitle] = Field(default_factory=list)
    duration: float = Field(0, ge=0, description="推断的视频总时长")


class VideoConfig(BaseModel):
    """视频输出配置（通用）"""
    width: int = Field(1920, ge=100, le=4096, description="视频宽度")
    height: int = Field(60, ge=20, le=200, description="视频高度")
    fps: int = Field(30, description="帧率")


class ColorScheme(BaseModel):
    """配色方案（通用）"""
    name: str = Field(..., description="配色名称")
    played_bg: str = Field(..., description="已播放区域背景色")
    unplayed_bg: str = Field(..., description="未播放区域背景色")
    played_text: str = Field(..., description="已播放区域文字颜色")
    unplayed_text: str = Field(..., description="未播放区域文字颜色")
    indicator: str = Field(..., description="播放指示器颜色")
    separator: str = Field(..., description="分隔线颜色")


# =============================================================================
#  Chapter Bar 专用模型
# =============================================================================

class Chapter(BaseModel):
    """章节"""
    title: str = Field("", description="章节标题")
    start_time: float = Field(..., ge=0, description="开始时间")
    end_time: float = Field(..., ge=0, description="结束时间")


class ChapterList(BaseModel):
    """章节列表"""
    chapters: list[Chapter] = Field(default_factory=list)
    duration: float = Field(0, ge=0, description="视频总时长")


class ChapterBarConfig(BaseModel):
    """章节进度条生成配置"""
    chapters: list[Chapter] = Field(..., min_length=1)
    duration: float = Field(..., gt=0, description="视频总时长")
    video: VideoConfig = Field(default_factory=VideoConfig)
    theme: str = Field("tech-blue", description="配色方案名称")


# =============================================================================
#  验证结果模型（通用）
# =============================================================================

class ValidationIssue(BaseModel):
    """验证问题"""
    code: str = Field(..., description="问题代码")
    message: str = Field(..., description="问题描述")
    blocking: bool = Field(True, description="是否阻止生成")
    index: int | None = Field(None, description="关联的索引")


class ValidationResult(BaseModel):
    """验证结果"""
    valid: bool = Field(..., description="是否通过验证")
    issues: list[ValidationIssue] = Field(default_factory=list)


class ChapterValidationResult(ValidationResult):
    """章节验证结果"""
    chapters: list[Chapter] = Field(default_factory=list, description="修正后的章节")
