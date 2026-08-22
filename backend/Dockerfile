FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .
RUN chmod +x entrypoint.sh

# Create directory for vector store persistence and aliases
RUN mkdir -p /app/chroma_db && \
    ln -s /app /backend && \
    ln -s /app /app/backend

# Create a /bin/cd wrapper script in case a platform runs `cd` as a binary executable
RUN printf '#!/bin/sh\nexec /app/entrypoint.sh "$@"\n' > /bin/cd && \
    chmod +x /bin/cd

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/api/health || exit 1

ENTRYPOINT ["./entrypoint.sh"]
