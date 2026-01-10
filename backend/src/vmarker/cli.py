"""
[INPUT]: 依赖 typer, rich, dotenv, chapter_bar, parser, themes
[OUTPUT]: 对外提供 app (通用入口), acb_app (Chapter Bar 专用入口)
[POS]: CLI 入口点，提供命令行界面
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import asyncio
from enum import Enum
from pathlib import Path
from typing import Annotated, Optional

import typer
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()
from rich.console import Console
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn
from rich.table import Table

from vmarker import __version__
from vmarker import chapter_bar as cb
from vmarker.models import Chapter, ChapterBarConfig, VideoConfig
from vmarker.parser import parse_srt_file
from vmarker.themes import THEMES

console = Console()


# =============================================================================
#  枚举
# =============================================================================


class SegmentMode(str, Enum):
    auto = "auto"
    ai = "ai"


# =============================================================================
#  公共函数
# =============================================================================


def _print_chapters(chapters: list[Chapter]) -> None:
    """打印章节表格"""
    table = Table(title="章节列表", show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", width=4)
    table.add_column("标题", min_width=20)
    table.add_column("开始", justify="right", width=8)
    table.add_column("结束", justify="right", width=8)
    table.add_column("时长", justify="right", width=8)

    for i, ch in enumerate(chapters, 1):
        d = ch.end_time - ch.start_time
        table.add_row(
            str(i),
            ch.title,
            f"{int(ch.start_time//60):02d}:{int(ch.start_time%60):02d}",
            f"{int(ch.end_time//60):02d}:{int(ch.end_time%60):02d}",
            f"{d:.1f}s",
        )
    console.print(table)


def _run_chapter_bar(
    input_file: Path,
    output: Optional[Path],
    mode: SegmentMode,
    interval: int,
    theme: str,
    width: int,
    height: int,
    api_key: Optional[str],
    api_base: str,
    model: str,
) -> None:
    """执行 Chapter Bar 生成流程"""
    # 验证配色
    if theme not in THEMES:
        console.print(f"[red]错误: 配色方案 '{theme}' 不存在[/red]")
        console.print(f"可用: {', '.join(THEMES.keys())}")
        raise typer.Exit(1)

    # AI 模式需要 API Key
    if mode == SegmentMode.ai and not api_key:
        console.print("[red]错误: AI 模式需要 --api-key 或 API_KEY 环境变量[/red]")
        raise typer.Exit(1)

    # 输出路径
    if output is None:
        output = input_file.with_suffix(".mov")

    console.print(f"\n[bold]vmarker v{__version__}[/bold] - Chapter Bar\n")

    # 解析 SRT
    with console.status("[green]解析字幕..."):
        try:
            srt = parse_srt_file(input_file)
        except (FileNotFoundError, ValueError) as e:
            console.print(f"[red]解析失败: {e}[/red]")
            raise typer.Exit(1)

    console.print(f"✓ {len(srt.subtitles)} 条字幕, 时长 {srt.duration:.1f}s")

    # 提取章节
    if mode == SegmentMode.ai:
        with console.status("[green]AI 智能分段..."):
            try:
                chapters = asyncio.run(
                    cb.extract_ai(
                        srt.subtitles,
                        srt.duration,
                        api_key=api_key,
                        api_base=api_base,
                        model=model,
                    )
                )
            except Exception as e:
                console.print(f"[yellow]AI 失败，降级为自动分段: {e}[/yellow]")
                chapters = cb.extract_auto(srt.subtitles, srt.duration, interval)
    else:
        chapters = cb.extract_auto(srt.subtitles, srt.duration, interval)

    console.print(f"✓ {len(chapters.chapters)} 个章节")
    _print_chapters(chapters.chapters)

    # 验证
    result = cb.validate(chapters.chapters, srt.duration)
    if not result.valid:
        console.print("\n[red]章节配置错误:[/red]")
        for issue in result.issues:
            console.print(f"  [red]✗ {issue.message}[/red]")
        raise typer.Exit(1)

    if result.issues:
        console.print("\n[yellow]警告:[/yellow]")
        for issue in result.issues:
            console.print(f"  ⚠ {issue.message}")

    # 生成视频
    config = ChapterBarConfig(
        chapters=result.chapters,
        duration=srt.duration,
        video=VideoConfig(width=width, height=height),
        theme=theme,
    )

    console.print(f"\n配置: {width}x{height} | {theme} | {srt.duration:.1f}s")

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
    ) as progress:
        task = progress.add_task("[green]生成视频...", total=100)

        def on_progress(cur: int, total: int) -> None:
            progress.update(task, completed=int(cur / total * 100))

        try:
            cb.generate(config, output, progress_callback=on_progress)
        except RuntimeError as e:
            console.print(f"\n[red]生成失败: {e}[/red]")
            raise typer.Exit(1)

    console.print(f"\n[green]✓ 完成: {output}[/green]\n")


# =============================================================================
#  acb - Chapter Bar 专用入口
# =============================================================================

acb_app = typer.Typer(
    name="acb",
    help="Auto Chapter Bar - 将 SRT 字幕转换为章节进度条视频",
    add_completion=False,
    no_args_is_help=True,
)


@acb_app.command()
def acb_main(
    input_file: Annotated[Path, typer.Argument(help="SRT 字幕文件", exists=True)],
    output: Annotated[Optional[Path], typer.Option("-o", "--output", help="输出文件")] = None,
    mode: Annotated[SegmentMode, typer.Option("-m", "--mode", help="分段模式")] = SegmentMode.auto,
    interval: Annotated[int, typer.Option("-i", "--interval", min=30, max=300)] = 60,
    theme: Annotated[str, typer.Option("-t", "--theme")] = "tech-blue",
    width: Annotated[int, typer.Option("-w", "--width", min=100, max=4096)] = 1920,
    height: Annotated[int, typer.Option("-H", "--height", min=20, max=200)] = 60,
    api_key: Annotated[Optional[str], typer.Option("--api-key", envvar="API_KEY")] = None,
    api_base: Annotated[
        str, typer.Option("--api-base", envvar="API_BASE")
    ] = "https://api.openai.com/v1",
    model: Annotated[str, typer.Option("--model", envvar="API_MODEL")] = "gpt-4o-mini",
) -> None:
    """将 SRT 字幕转换为章节进度条视频"""
    _run_chapter_bar(
        input_file,
        output,
        mode,
        interval,
        theme,
        width,
        height,
        api_key,
        api_base,
        model,
    )


@acb_app.command("themes")
def acb_themes() -> None:
    """列出配色方案"""
    _list_themes()


@acb_app.command("version")
def acb_version() -> None:
    """显示版本"""
    console.print(f"acb (vmarker) v{__version__}")


# =============================================================================
#  vmarker - 通用入口（子命令）
# =============================================================================

app = typer.Typer(
    name="vmarker",
    help="vmarker - 视频标记工具集\n\nMake video structure visible.",
    add_completion=False,
    no_args_is_help=True,
)


@app.command("chapter")
def cmd_chapter(
    input_file: Annotated[Path, typer.Argument(help="SRT 字幕文件", exists=True)],
    output: Annotated[Optional[Path], typer.Option("-o", "--output")] = None,
    mode: Annotated[SegmentMode, typer.Option("-m", "--mode")] = SegmentMode.auto,
    interval: Annotated[int, typer.Option("-i", "--interval", min=30, max=300)] = 60,
    theme: Annotated[str, typer.Option("-t", "--theme")] = "tech-blue",
    width: Annotated[int, typer.Option("-w", "--width", min=100, max=4096)] = 1920,
    height: Annotated[int, typer.Option("-H", "--height", min=20, max=200)] = 60,
    api_key: Annotated[Optional[str], typer.Option("--api-key", envvar="API_KEY")] = None,
    api_base: Annotated[
        str, typer.Option("--api-base", envvar="API_BASE")
    ] = "https://api.openai.com/v1",
    model: Annotated[str, typer.Option("--model", envvar="API_MODEL")] = "gpt-4o-mini",
) -> None:
    """生成章节进度条视频 (Chapter Bar)"""
    _run_chapter_bar(
        input_file,
        output,
        mode,
        interval,
        theme,
        width,
        height,
        api_key,
        api_base,
        model,
    )


@app.command("themes")
def cmd_themes() -> None:
    """列出配色方案"""
    _list_themes()


@app.command("version")
def cmd_version() -> None:
    """显示版本"""
    console.print(f"vmarker v{__version__}")


def _list_themes() -> None:
    """打印配色方案表格"""
    table = Table(title="配色方案", show_header=True, header_style="bold magenta")
    table.add_column("名称", min_width=15)
    table.add_column("显示名")
    table.add_column("已播放背景")
    table.add_column("未播放背景")

    for name, scheme in THEMES.items():
        table.add_row(
            name,
            scheme.name,
            f"[on {scheme.played_bg}]  {scheme.played_bg}  [/]",
            f"[on {scheme.unplayed_bg}]  {scheme.unplayed_bg}  [/]",
        )
    console.print(table)


# =============================================================================
#  入口
# =============================================================================

if __name__ == "__main__":
    app()
