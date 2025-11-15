"""
Auto-Chapter-Bar Web Interface v2 with Interactive Editor
支持 AI 生成后编辑章节
"""

import os
import tempfile

import gradio as gr
import pandas as pd

from chapterbar.chapter_extractor import (
    BASE_COLOR,
    Chapter,
    extract_chapters_ai,
    extract_chapters_auto,
)
from chapterbar.chapter_validator import ChapterValidator
from chapterbar.generator import generate_video
from chapterbar.parser import parse_srt


def format_time(seconds: float) -> str:
    """格式化时间为 mm:ss"""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    return f"{minutes:02d}:{secs:02d}"


def parse_time(time_str: str) -> float:
    """解析时间字符串（mm:ss 或秒数）"""
    time_str = time_str.strip()
    if ":" in time_str:
        parts = time_str.split(":")
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
    return float(time_str)


def chapters_to_dataframe(chapters: list[Chapter]) -> pd.DataFrame:
    """将章节列表转换为 DataFrame"""
    data = []
    for i, ch in enumerate(chapters, 1):
        data.append(
            {
                "序号": i,
                "开始时间": format_time(ch.start_time),
                "结束时间": format_time(ch.end_time),
                "标题": ch.title,
            }
        )
    return pd.DataFrame(data)


def dataframe_to_chapters(df: pd.DataFrame, duration: float) -> tuple[list[Chapter], list[str]]:
    """将 DataFrame 转换为章节列表，并验证"""
    chapters = []
    for _, row in df.iterrows():
        try:
            start_time = parse_time(str(row["开始时间"]))
            end_time = parse_time(str(row["结束时间"]))
            title = str(row["标题"])

            chapter = Chapter(title=title, start_time=start_time, end_time=end_time, color=BASE_COLOR)
            chapters.append(chapter)
        except Exception as e:
            return [], [f"解析第 {row['序号']} 行失败: {str(e)}"]

    # 验证章节
    validator = ChapterValidator(chapters, duration)
    is_valid, errors, warnings = validator.validate()

    if errors:
        error_messages = [err.message for err in errors]
        return chapters, error_messages

    return chapters, []


def extract_duration_from_srt(srt_file_path: str) -> float | None:
    """从 SRT 文件提取时长"""
    try:
        entries = parse_srt(srt_file_path)
        if not entries:
            return None
        return entries[-1].end_time
    except Exception as e:
        print(f"提取时长失败: {e}")
        return None


def generate_chapters(srt_file, mode: str, interval: int, api_key: str, model: str) -> tuple[pd.DataFrame, str, float]:
    """生成章节列表

    返回: (章节DataFrame, 状态消息, 视频时长)
    """
    try:
        if not srt_file:
            return pd.DataFrame(), "❌ 请先上传 SRT 文件", 0

        # 解析 SRT
        file_path = srt_file.name if hasattr(srt_file, "name") else srt_file
        entries = parse_srt(file_path)
        if not entries:
            return pd.DataFrame(), "❌ SRT 文件解析失败", 0

        # 获取时长
        duration = extract_duration_from_srt(file_path)
        if not duration:
            return pd.DataFrame(), "❌ 无法获取视频时长", 0

        # 提取章节
        if mode == "ai":
            if not api_key or not api_key.strip():
                return pd.DataFrame(), "❌ AI 模式需要提供 API Key", duration
            chapters = extract_chapters_ai(entries, duration, api_key, model)
        else:
            chapters = extract_chapters_auto(entries, interval, duration)

        if not chapters:
            return pd.DataFrame(), "❌ 章节提取失败", duration

        # 转换为 DataFrame
        df = chapters_to_dataframe(chapters)
        mode_name = "AI 智能分段" if mode == "ai" else "固定间隔"
        status = f"✅ 成功生成 {len(chapters)} 个章节（{mode_name}）\n📏 视频时长: {duration:.2f} 秒"

        return df, status, duration

    except Exception as e:
        return pd.DataFrame(), f"❌ 生成失败: {str(e)}", 0


def generate_video_from_chapters(
    chapters_df: pd.DataFrame, duration: float, width: int, height: int
) -> tuple[str, str | None]:
    """从章节 DataFrame 生成视频

    返回: (状态消息, 视频路径)
    """
    try:
        if chapters_df.empty:
            return "❌ 章节列表为空，请先生成章节", None

        if duration <= 0:
            return "❌ 视频时长无效", None

        # 转换为章节列表并验证
        chapters, errors = dataframe_to_chapters(chapters_df, duration)

        if errors:
            error_msg = "❌ 验证失败:\n" + "\n".join(f"  • {err}" for err in errors)
            return error_msg, None

        # 生成视频
        with tempfile.NamedTemporaryFile(suffix=".mov", delete=False) as tmp_file:
            output_path = tmp_file.name

        generate_video(
            chapters=chapters,
            duration=duration,
            output_path=output_path,
            width=width,
            height=height,
        )

        if not os.path.exists(output_path):
            return "❌ 视频生成失败", None

        return (
            f"✅ 视频生成成功！\n📊 共 {len(chapters)} 个章节\n📏 时长: {duration:.2f} 秒",
            output_path,
        )

    except Exception as e:
        return f"❌ 生成失败: {str(e)}", None


def sort_and_renumber_chapters(chapters_df: pd.DataFrame) -> tuple[pd.DataFrame, str]:
    """整理章节：按开始时间排序并重新编号"""
    try:
        if chapters_df.empty:
            return chapters_df, "❌ 章节列表为空"

        # 移除空行
        chapters_df = chapters_df.dropna(subset=["标题"]).reset_index(drop=True)

        if chapters_df.empty:
            return chapters_df, "❌ 没有有效的章节"

        # 解析时间并排序
        chapters_df["_start_seconds"] = chapters_df["开始时间"].apply(lambda x: parse_time(str(x)))
        chapters_df = chapters_df.sort_values("_start_seconds").reset_index(drop=True)
        chapters_df = chapters_df.drop("_start_seconds", axis=1)

        # 重新编号
        chapters_df["序号"] = range(1, len(chapters_df) + 1)

        return chapters_df, f"✅ 已整理 {len(chapters_df)} 个章节"
    except Exception as e:
        return chapters_df, f"❌ 整理失败: {str(e)}"


def validate_chapters_only(chapters_df: pd.DataFrame, duration: float) -> str:
    """仅验证章节，不生成视频"""
    try:
        if chapters_df.empty:
            return "❌ 章节列表为空"

        if duration <= 0:
            return "❌ 视频时长无效"

        # 转换并验证
        chapters, errors = dataframe_to_chapters(chapters_df, duration)

        if errors:
            error_msg = "❌ 验证失败:\n" + "\n".join(f"  • {err}" for err in errors)
            return error_msg

        # 获取警告
        validator = ChapterValidator(chapters, duration)
        is_valid, _, warnings = validator.validate()

        if warnings:
            warning_msg = "\n⚠️ 警告:\n" + "\n".join(f"  • {w.message}" for w in warnings)
            return f"✅ 验证通过！共 {len(chapters)} 个章节{warning_msg}"

        return f"✅ 验证通过！共 {len(chapters)} 个章节，无警告"

    except Exception as e:
        return f"❌ 验证失败: {str(e)}"


def create_interface():
    """创建 Gradio 界面"""

    with gr.Blocks(title="Auto-Chapter-Bar v2", theme=gr.themes.Soft()) as app:
        # 状态变量
        duration_state = gr.State(0.0)

        gr.Markdown(
            """
            # 🎬 [Auto-Chapter-Bar](https://github.com/bbruceyuan/auto-chapter-bar)
            ### 将 SRT 字幕文件转换为可叠加的视频章节进度条动画

            **使用说明**：上传 SRT 文件 → 设置参数 → 点击生成 → 下载透明视频

            **特性**:

            * AI 智能分段（需要 Moonshot API Key）
            * 固定间隔分段（免费）
            * 透明通道输出（直接叠加到原视频）
            * 支持中文字幕
            """
        )

        with gr.Row():
            # 左侧：输入和设置
            with gr.Column(scale=1):
                gr.Markdown("### 1️⃣ 上传文件")
                srt_file = gr.File(label="SRT 字幕文件", file_types=[".srt"], file_count="single")

                gr.Markdown("### 2️⃣ 生成章节")
                mode = gr.Radio(
                    label="提取模式",
                    choices=[("固定间隔", "auto"), ("AI 智能分段", "ai")],
                    value="auto",
                )

                with gr.Group() as auto_group:
                    interval = gr.Slider(label="间隔（秒）", minimum=30, maximum=300, value=60, step=30)

                with gr.Group(visible=False) as ai_group:
                    api_key = gr.Textbox(label="API Key", type="password", placeholder="sk-...")
                    model = gr.Dropdown(
                        label="模型",
                        choices=["moonshot-v1-8k", "moonshot-v1-32k"],
                        value="moonshot-v1-8k",
                    )

                generate_chapters_btn = gr.Button("🎯 生成章节", variant="primary", size="lg")

                status_gen = gr.Textbox(label="生成状态", lines=3, interactive=False)

            # 右侧：章节编辑和生成
            with gr.Column(scale=1):
                gr.Markdown("### 3️⃣ 编辑章节")

                gr.Markdown(
                    """
                    **编辑说明**：
                    - 📝 **直接编辑**: 双击单元格修改内容
                    - ➕ **添加行**: 点击表格右上角的 ➕ 按钮
                    - 🗑️ **删除行**: 选中行后点击表格右上角的 🗑️ 按钮
                    - 🔄 **重新排序**: 编辑后点击"整理章节"按钮
                    """
                )

                chapters_table = gr.Dataframe(
                    headers=["序号", "开始时间", "结束时间", "标题"],
                    datatype=["number", "str", "str", "str"],
                    label="章节列表",
                    interactive=True,
                    wrap=True,
                    row_count=(1, "dynamic"),  # 允许动态添加行
                    col_count=(4, "fixed"),
                )

                with gr.Row():
                    sort_btn = gr.Button("🔄 整理章节（按时间排序并重新编号）", size="sm")
                    validate_btn = gr.Button("✅ 验证章节", size="sm", variant="secondary")

                status_edit = gr.Textbox(label="编辑状态", lines=3, interactive=False)

        gr.Markdown("### 4️⃣ 生成视频")

        with gr.Row():
            width = gr.Number(label="宽度", value=1920, minimum=640)
            height = gr.Number(label="高度", value=60, minimum=40)

        generate_video_btn = gr.Button("🎬 生成视频", variant="primary", size="lg")

        status_video = gr.Textbox(label="生成状态", lines=3, interactive=False)

        output_video = gr.Video(label="预览")
        download_file = gr.File(label="下载")

        gr.Markdown(
            """
            ---
            ### 💡 使用提示
            
            1. **时间格式**: 支持 `mm:ss` (如 `01:30`) 或秒数 (如 `90`)
            2. **直接编辑**: 点击表格单元格可直接修改
            3. **验证**: 生成视频时会自动检查时间重叠和间隙
            4. **保存**: 编辑后的章节会在生成视频时使用

            ---

            ### 💡 其他

            **固定间隔模式（推荐新手）**:
            - 免费使用，无需 API Key
            - 适合结构均匀的教程、课程类视频

            **AI 智能分段模式（推荐高质量内容）**:
            - 需要 Moonshot API Key
            - 自动识别主题转换点，生成更自然的章节
            - 成本约 ¥0.05/视频（5 分钟时长）

            **后续步骤**:
            1. 下载生成的 `.mov` 文件（透明通道）
            2. 在 PR/剪映/达芬奇中导入原视频
            3. 将章节条拖到最上层轨道
            4. 导出最终视频

            **GitHub 仓库**: [https://github.com/bbruceyuan/auto-chapter-bar](https://github.com/bbruceyuan/auto-chapter-bar)

            ---
            Made with ❤️ by [Chaofa Yuan](https://yuanchaofa.com)
            """
        )

        # 事件处理
        def toggle_mode(mode_value):
            if mode_value == "ai":
                return gr.Group(visible=False), gr.Group(visible=True)
            return gr.Group(visible=True), gr.Group(visible=False)

        mode.change(fn=toggle_mode, inputs=[mode], outputs=[auto_group, ai_group])

        generate_chapters_btn.click(
            fn=generate_chapters,
            inputs=[srt_file, mode, interval, api_key, model],
            outputs=[chapters_table, status_gen, duration_state],
        )

        sort_btn.click(
            fn=sort_and_renumber_chapters,
            inputs=[chapters_table],
            outputs=[chapters_table, status_edit],
        )

        validate_btn.click(
            fn=validate_chapters_only,
            inputs=[chapters_table, duration_state],
            outputs=[status_edit],
        )

        def generate_and_display(df, dur, w, h):
            status, video_path = generate_video_from_chapters(df, dur, int(w), int(h))
            return status, video_path, video_path

        generate_video_btn.click(
            fn=generate_and_display,
            inputs=[chapters_table, duration_state, width, height],
            outputs=[status_video, output_video, download_file],
        )

    return app


if __name__ == "__main__":
    app = create_interface()
    app.launch()
