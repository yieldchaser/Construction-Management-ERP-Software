# Use official lightweight Python image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN set -e; for i in 1 2 3 4 5; do pip install --no-cache-dir --retries 10 --timeout 60 -r requirements.txt && break; [ "$i" -eq 5 ] && exit 1; echo "pip install attempt $i failed (PyPI throttling), retrying in 10s..."; sleep 10; done

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run application using uvicorn
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
