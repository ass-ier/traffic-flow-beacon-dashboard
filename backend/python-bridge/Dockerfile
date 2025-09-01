# Python Bridge Dockerfile for SUMO TraCI Interface

FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash python-user
RUN chown -R python-user:python-user /app
USER python-user

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8814/health')"

# Expose port
EXPOSE 8814

# Set environment variables
ENV FLASK_APP=sumo_bridge.py
ENV FLASK_ENV=production
ENV PYTHONPATH=/app

# Start the application
CMD ["python", "sumo_bridge.py"]
