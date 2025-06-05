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
        cmake \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .

# Upgrade pip and install core dependencies
RUN python -m pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir wheel==0.41.0 setuptools==69.0.0

# Install dependencies in groups with error handling
RUN echo "Installing core dependencies..." && \
    pip install --no-cache-dir numpy==1.24.3 && \
    echo "Installing web framework..." && \
    pip install --no-cache-dir fastapi==0.104.1 uvicorn==0.24.0 python-multipart==0.0.6 pydantic==1.10.13 && \
    echo "Installing document processing..." && \
    pip install --no-cache-dir pypdf==3.17.1 python-docx==1.0.1 pandas==2.1.3 requests==2.31.0 && \
    echo "Installing machine learning core..." && \
    pip install --no-cache-dir torch==2.1.0+cpu --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir transformers==4.35.2 safetensors==0.4.0 accelerate==0.24.1 && \
    echo "Installing machine learning additional..." && \
    pip install --no-cache-dir diffusers[torch]==0.21.4 faster-whisper==0.9.0 && \
    echo "Installing LangChain ecosystem..." && \
    pip install --no-cache-dir langchain==0.0.350 langchain-community==0.0.10 langchain-core==0.1.10 && \
    pip install --no-cache-dir chromadb==0.4.15 langchain-chroma==0.0.10 langchain-ollama==0.0.1 && \
    echo "Installing text-to-speech..." && \
    pip install --no-cache-dir gtts==2.4.0 pyttsx3==2.90 && \
    echo "Installing spaCy..." && \
    pip install --no-cache-dir spacy==3.7.2 && \
    echo "Installing Kokoro TTS..." && \
    pip install --no-cache-dir soundfile==0.12.1 kokoro==0.9.4 kokoro-onnx==0.4.9 misaki[en]==0.1.0 onnxruntime==1.16.3 && \
    rm -rf /root/.cache/pip/*

# Install spaCy model separately
RUN python -m spacy download en_core_web_sm && \
    python -c "import spacy; nlp = spacy.load('en_core_web_sm'); print('✅ spaCy model loaded successfully')"

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