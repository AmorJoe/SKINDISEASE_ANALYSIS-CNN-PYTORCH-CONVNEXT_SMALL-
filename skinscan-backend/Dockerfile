# Production Quality Docker Setup
# Multi-stage build for Python/Django

FROM python:3.11-slim

# Environments
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install drf-spectacular

# Copy project
COPY . .

# Run entrypoint script
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
