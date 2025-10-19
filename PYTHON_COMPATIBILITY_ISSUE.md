# 🚨 Python 3.14 Compatibility Issue - MIDICOM

## ❌ Problema Rilevato

**Data:** 2025-10-19  
**Severity:** CRITICAL - Blocca pipeline audio completa

### Errore

```
RuntimeError: Cannot install on Python version 3.14.0; 
only versions >=3.10,<3.14 are supported.
```

### Pacchetti Incompatibili

| Pacchetto | Versione Richiesta | Python Supportato | Status |
|-----------|-------------------|-------------------|---------|
| `librosa` | >=0.10.0 | 3.10 - 3.13 | ❌ Incompatibile |
| `numba` | >=0.51.0 | 3.10 - 3.13 | ❌ Incompatibile |
| `demucs` | >=4.0.0 | 3.10 - 3.13 | ❌ Build fallita |
| `scipy` | >=1.11.0 | 3.10 - 3.13 | ❌ Dipendenza numba |

### Impatto

**Funzionalità Bloccate:**
- ❌ Audio → Stems separazione (richiede Demucs)
- ❌ Stems → MIDI trascrizione (richiede Librosa + numba)
- ❌ Pitch detection (richiede Librosa piptrack)
- ❌ Onset detection (richiede Librosa onset)

**Funzionalità Disponibili:**
- ✅ Backend API server (FastAPI)
- ✅ MIDI file loading (mido, pretty_midi)
- ✅ Frontend Piano Roll visualization
- ✅ MIDI playback con Tone.js
- ✅ Logging system

---

## ✅ Soluzioni

### Soluzione 1: Downgrade Python (CONSIGLIATO)

#### Windows

1. **Download Python 3.12.x**
   ```
   https://www.python.org/downloads/release/python-3120/
   ```
   Scegli: "Windows installer (64-bit)"

2. **Installa Python 3.12**
   - ☑️ "Add Python 3.12 to PATH"
   - ☑️ "Install for all users" (opzionale)

3. **Crea Virtual Environment**
   ```bash
   cd C:\Users\bazma\Desktop\MIDICOM
   py -3.12 -m venv venv_midicom
   venv_midicom\Scripts\activate
   ```

4. **Installa Dipendenze**
   ```bash
   pip install -r backend/requirements.txt
   ```

5. **Verifica Installazione**
   ```bash
   python --version  # Deve mostrare Python 3.12.x
   pip list | findstr /I "librosa demucs numba"
   ```

#### Linux/Mac

```bash
# Usa pyenv per gestire versioni Python
pyenv install 3.12.0
pyenv local 3.12.0

# Crea virtual environment
python -m venv venv_midicom
source venv_midicom/bin/activate

# Installa dipendenze
pip install -r backend/requirements.txt
```

---

### Soluzione 2: Docker (ALTERNATIVA)

Usa ambiente Docker con Python 3.12 pre-configurato:

**`Dockerfile.backend`:**
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Installa dipendenze di sistema per audio
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia codice backend
COPY backend/ .

# Esponi porta
EXPOSE 8000

# Avvia server
CMD ["uvicorn", "app_integrated:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build e Run:**
```bash
# Build immagine
docker build -f Dockerfile.backend -t midicom-backend .

# Run container
docker run -p 8000:8000 -v $(pwd)/backend:/app midicom-backend
```

---

### Soluzione 3: Mock Pipeline (TEMPORANEA)

Per testing immediato senza processing audio reale:

**`backend/app_mock.py`:**
```python
"""Mock version per testing senza librosa/demucs"""

@app.post("/transcribe-mock")
async def transcribe_audio_mock(file: UploadFile):
    # Simula processing
    await asyncio.sleep(2)
    
    # Ritorna MIDI mock
    return {
        "status": "success",
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "stems": ["drums", "bass", "vocals", "other"],
        "midi_data": {
            "duration": 30.0,
            "bpm": 120,
            "tracks": [
                {
                    "name": "Piano",
                    "notes": [
                        {"midi": 60, "time": 0.0, "duration": 1.0, "velocity": 80}
                    ]
                }
            ]
        }
    }
```

---

## 🧪 Testing con Python 3.14 (Limitato)

### Test Possibili

**1. Backend API (Solo MIDI esistenti)**
```bash
cd backend
py -m uvicorn app_integrated:app --reload

# Test health
curl http://localhost:8000/health

# Test MIDI loading
curl http://localhost:8000/midi/Frank_Sinatra_-_More.mid
```

**2. Frontend Completo**
```bash
cd frontend
npm run dev

# Carica MIDI file esistenti da test_samples/
# Visualizza Piano Roll
# Test playback
```

**3. Logging System**
```bash
cd backend
python logger.py  # Test logging colori
```

### Test NON Possibili

- ❌ Upload audio + separazione stems
- ❌ Trascrizione MIDI da audio
- ❌ Pipeline completa audio → MIDI

---

## 📊 Timeline Soluzione

| Azione | Tempo Stimato | Priorità |
|--------|---------------|----------|
| Download Python 3.12 | 5 min | 🔴 Alta |
| Setup virtual environment | 5 min | 🔴 Alta |
| Install dependencies | 10 min | 🔴 Alta |
| Test pipeline completa | 15 min | 🔴 Alta |
| **TOTALE** | **35 min** | |

---

## ✅ Verifica Post-Fix

Dopo aver installato Python 3.12:

```bash
# 1. Verifica versione
python --version
# Output atteso: Python 3.12.x

# 2. Verifica pacchetti critici
pip list | findstr /I "librosa"
# Output atteso: librosa 0.10.x o superiore

# 3. Test import
python -c "import librosa; import demucs; print('✅ All OK')"
# Output atteso: ✅ All OK

# 4. Test pipeline
cd backend
python test_pipeline.py
# Output atteso: 🎯 Score: 5/5 test passati
```

---

## 📚 Riferimenti

- **Librosa Compatibility:** https://librosa.org/doc/latest/install.html
- **Numba Compatibility:** https://numba.readthedocs.io/en/stable/user/installing.html
- **Demucs Requirements:** https://github.com/facebookresearch/demucs
- **Python Releases:** https://www.python.org/downloads/

---

## 🎯 Raccomandazione Finale

**Per MIDICOM v1.1.0:**
- ✅ Usa Python 3.12.x (stable, supportato da tutti i pacchetti)
- ✅ Virtual environment dedicato
- ✅ Requirements.txt con versioni pinned
- ❌ NON usare Python 3.14 fino a supporto librosa/numba

**Aggiungi in requirements.txt:**
```txt
# Python version requirement
# Requires: Python >=3.10, <3.14
```

**Aggiungi in README.md:**
```markdown
## Prerequisites

- **Python 3.12** (3.10-3.13 supported, 3.14 NOT supported yet)
- Node.js 18+
- FFmpeg (optional, for audio conversion)
```

---

**Status:** 🟡 ISSUE DOCUMENTED - Attendere fix Python 3.12 per pipeline completa



