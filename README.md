# Taktische Bewertung von Wiederaufbereitungsalternativen im Remanufacturing

Web-Anwendung zur Masterarbeit von Maximilian Kühn. Rechenkern und API in Python (`kern/`, `api/`), Oberfläche in
Next.js (`web/`).

## Installation

Voraussetzungen: Python 3.12 oder neuer, Node.js 22.

```bash
# Terminal 1: API (http://localhost:8000)
pip install -r requirements.txt
uvicorn api.main:app

# Terminal 2: Oberfläche (http://localhost:3000)
cd web
npm install
npm run dev
```

Optional: Mit `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Umgebungsvariablen in `web/`)
wird die Anmeldung mit Konto aktiviert, sonst läuft die Anwendung im Gastmodus.
