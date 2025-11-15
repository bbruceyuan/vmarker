.PHONY: format check test install clean help test-deploy export-requirements

format:
	uv run ruff format .
	uv run ruff check --fix .

check:
	uv run ruff check .

test:
	uv run pytest

install:
	uv pip install -e ".[dev]"

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete

export-requirements:
	uv export --no-hashes --no-dev -o requirements.txt
	@echo "✅ requirements.txt exported"

test-deploy:
	@echo "🧪 Testing Hugging Face deployment configuration..."
	@./.github/test-deployment.sh

help:
	@echo "Available commands:"
	@echo "  make format              - Format code with ruff"
	@echo "  make check               - Run linting"
	@echo "  make test                - Run tests"
	@echo "  make install             - Install in dev mode"
	@echo "  make clean               - Clean cache files"
	@echo "  make export-requirements - Export requirements.txt for deployment"
	@echo "  make test-deploy         - Test Hugging Face deployment setup"
	@echo "  make help                - Show this help message"
