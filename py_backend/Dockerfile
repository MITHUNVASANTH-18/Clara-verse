FROM python:3.11-slim

# Add labels for the image
LABEL org.opencontainers.image.title="Clara Backend"
LABEL org.opencontainers.image.description="Clara AI Assistant Backend Service"
LABEL org.opencontainers.image.authors="Clara Team"
LABEL org.opencontainers.image.source="https://github.com/clara17verse/clara"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.vendor="Clara"
LABEL org.opencontainers.image.version="1.0.0"

WORKDIR /app

# Install system dependencies
RUN apt-get update \
    && apt-get install -y \
        build-essential \
        curl \
        git \
        pkg-config \
        python3-dev \
        libssl-dev \
        libffi-dev \
        libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Upgrade pip and install dependencies with better error handling
RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir wheel setuptools && \
    pip install --no-cache-dir -r requirements.txt || \
    (echo "Retrying pip install with verbose output..." && \
     pip install --no-cache-dir -v -r requirements.txt) && \
    rm -rf /root/.cache/pip/*

# Install spaCy and download the English model explicitly
RUN pip install spacy>=3.4.0 && \
    python -m spacy download en_core_web_sm && \
    python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('✅ spaCy model loaded successfully')" && \
    rm -rf /root/.cache/pip/*

# Copy application code
COPY . .

# Create data directory
RUN mkdir -p /app/data

# Set environment variables
ENV HOST="0.0.0.0" \
    PORT=5000 \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NUMPY_ALLOCATE_DEFAULT=0

# Create a non-root user
RUN useradd -m -r -u 1000 clara && \
    chown -R clara:clara /app

# Switch to non-root user
USER clara

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Run the application with environment variables
CMD ["sh", "-c", "python main.py --host $HOST --port $PORT"] 