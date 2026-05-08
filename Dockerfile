# ══════════════════════════════════════════════════════
# BUILD STAGE (Frontend)
# ══════════════════════════════════════════════════════
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ══════════════════════════════════════════════════════
# RUNTIME STAGE (Backend + Served Frontend)
# ══════════════════════════════════════════════════════
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for Audio/ML
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy built frontend from previous stage
COPY --from=frontend-builder /app/dist ./public

# Copy backend source
COPY backend /app/backend

# Set environment variables
ENV PORT=8000
ENV HOST=0.0.0.0
ENV PYTHONPATH=/app/backend

# Command to run the engine
# We serve the static frontend via FastAPI for a single-port deployment
CMD ["python", "backend/run.py"]
