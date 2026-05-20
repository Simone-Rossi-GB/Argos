# ── Stage 1: Build ─────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Installa dipendenze di sistema per compilare pacchetti Python
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    rustc \
    cargo \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e installa in una cartella isolata
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ───────────────────
FROM python:3.12-slim

WORKDIR /app

# Installa solo le librerie di runtime necessarie
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copia i pacchetti Python dallo stage di build
COPY --from=builder /root/.local /root/.local

# Assicura che i binari siano nel PATH
ENV PATH=/root/.local/bin:$PATH

# Copia il codice dell'applicazione
COPY . .

# Crea la directory uploads
RUN mkdir -p uploads

# Porta su cui ascolta il backend
EXPOSE 10170

# Comando di avvio: applica migrazioni e avvia uvicorn
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 10170"]