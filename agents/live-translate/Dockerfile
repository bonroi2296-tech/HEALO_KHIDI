# HEALO 통역 에이전트 — LiveKit Cloud Agents 배포용 컨테이너
# `lk agent create/deploy` 가 이 Dockerfile 로 이미지를 빌드한다.
FROM python:3.11-slim

# uv (빠른 파이썬 패키지 매니저)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# 의존성 먼저(레이어 캐시)
COPY pyproject.toml ./
RUN uv sync --no-dev || uv sync

# 소스
COPY . .

# 프로덕션 워커 실행 (dev 아님)
CMD ["uv", "run", "python", "src/agent.py", "start"]
