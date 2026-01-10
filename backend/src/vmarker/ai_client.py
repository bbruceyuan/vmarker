"""
[INPUT]: 依赖 httpx
[OUTPUT]: 对外提供 AIClient 类
[POS]: AI API 调用客户端，被 chapter_bar 和未来的 shownotes/subtitle 消费
[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
"""

import json
import re
from dataclasses import dataclass

import httpx


# =============================================================================
#  配置
# =============================================================================

@dataclass
class AIConfig:
    """AI 配置"""
    api_key: str
    api_base: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    timeout: float = 60.0


# =============================================================================
#  AI 客户端
# =============================================================================

class AIClient:
    """AI API 客户端（兼容 OpenAI 格式）"""

    def __init__(self, config: AIConfig):
        self.config = config
        self._client: httpx.AsyncClient | None = None

    async def __aenter__(self) -> "AIClient":
        self._client = httpx.AsyncClient(timeout=self.config.timeout)
        return self

    async def __aexit__(self, *args) -> None:
        if self._client:
            await self._client.aclose()

    async def chat(self, prompt: str, temperature: float = 0.3) -> str:
        """
        发送聊天请求

        Args:
            prompt: 用户提示
            temperature: 温度参数

        Returns:
            AI 回复内容
        """
        if not self._client:
            raise RuntimeError("AIClient 未初始化，请使用 async with")

        url = f"{self.config.api_base.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.config.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.config.model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temperature,
        }

        response = await self._client.post(url, headers=headers, json=payload)
        response.raise_for_status()

        result = response.json()
        return result["choices"][0]["message"]["content"]

    async def chat_json(self, prompt: str, temperature: float = 0.3) -> dict:
        """
        发送聊天请求并解析 JSON 响应

        Args:
            prompt: 用户提示
            temperature: 温度参数

        Returns:
            解析后的 JSON 对象
        """
        content = await self.chat(prompt, temperature)
        return parse_json_response(content)


# =============================================================================
#  工具函数
# =============================================================================

def parse_json_response(content: str) -> dict:
    """
    从 AI 响应中提取 JSON

    Args:
        content: AI 响应内容

    Returns:
        解析后的 JSON 对象
    """
    # 尝试直接解析
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    # 提取 JSON 部分（可能被 markdown 代码块包裹）
    match = re.search(r"\{[\s\S]*\}", content)
    if not match:
        raise ValueError(f"响应中未找到 JSON: {content[:200]}")

    try:
        return json.loads(match.group())
    except json.JSONDecodeError as e:
        raise ValueError(f"JSON 解析失败: {e}")
