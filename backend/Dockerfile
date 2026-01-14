FROM python:3.13-slim AS builder

RUN pip install --no-cache-dir uv

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY src/ ./src/

RUN uv sync --frozen --no-dev

FROM python:3.13-slim AS runner

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        libgomp1 && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

EXPOSE 8000

CMD ["uvicorn", "vmarker.api:app", "--host", "0.0.0.0", "--port", "8000"]
