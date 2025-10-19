# 🎯 MIDICOM - Session Recap 19 Ottobre 2025

## 📋 **INDICE**
1. [Obiettivo Iniziale](#obiettivo-iniziale)
2. [Lavoro Completato](#lavoro-completato)
3. [Problemi Risolti](#problemi-risolti)
4. [Stato Attuale](#stato-attuale)
5. [Prossimi Step](#prossimi-step)

---

## 🎯 **OBIETTIVO INIZIALE**

Implementare e testare la **pipeline completa** Audio → Stems → MIDI → Piano Roll per il progetto MIDICOM:

```
Audio File (.wav/.mp3)
    ↓
Separation (Demucs)
    ↓
Stems (vocals, bass, drums, other)
    ↓
Transcription (Librosa/CREPE)
    ↓
MIDI Files (.mid)
    ↓
Piano Roll Visualization
    ↓
Playback (Tone.js)
```

---

## ✅ **LAVORO COMPLETATO**

### 1. **Setup Ambiente Python**

#### Problema Python 3.14
- ❌ **Errore iniziale**: Python 3.14 non compatibile con `numba` e `demucs`
- ✅ **Soluzione**: Installato Python 3.12.10
- 📄 **Documentazione creata**: `PYTHON_COMPATIBILITY_ISSUE.md`

#### Dipendenze Installate
```bash
# Core audio processing
demucs==4.0.0
librosa==0.10.2
pretty_midi==0.2.10
numpy==1.26.4
soundfile==0.12.1

# Backend API
fastapi==0.115.0
uvicorn==0.30.6
python-multipart==0.0.12
aiofiles==24.1.0

# Logging
colorama==0.4.6
```

---

### 2. **Backend Integration**

#### File Principali Modificati/Creati

**`backend/app_integrated.py`** ✅
- **Endpoint `/transcribe`**: Pipeline completa in un'unica chiamata
  - Upload audio
  - Separazione stems con Demucs
  - Trascrizione MIDI con Librosa
  - Ritorna JSON con stems + MIDI data
- **Endpoint `/stems/{path}`**: Serve file audio stems (MP3/WAV)
- **Endpoint `/health`**: Health check servizi
- **CORS configurato** per comunicazione frontend-backend

**`backend/separate.py`** ✅
- **Fix Demucs 4.0+**: Migrazione da `demucs.api` (deprecato) a Demucs CLI via `subprocess`
- **Comando**: `python -m demucs --two-stems=vocals --mp3`
- **Output**: MP3 invece di WAV per evitare problemi `torchcodec`
- **Gestione path**: Ricerca ricorsiva file stems in sottodirectory timestamp

**`backend/transcribe_to_midi.py`** ✅
- **Fix Librosa 0.11.0**: Parametro `threshold` → `delta` in `onset_detect`
- **Fix bug `create_midi`**: Corretto `note['...']` → `note_data['...']`
- **Pipeline transcription**:
  1. Caricamento audio (librosa)
  2. Onset detection (delta=0.3)
  3. Pitch detection (librosa `pyin` o CREPE)
  4. Raggruppamento note
  5. Quantizzazione temporale (50ms default)
  6. Creazione file MIDI (pretty_midi)

**`backend/logger.py`** ✅
- Logger centralizzato con output ANSI colorato
- Livelli: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Emoji per maggiore leggibilità

**`backend/__init__.py`** ✅
- Creato per definire `backend/` come package Python
- Risolve problemi import relativi

---

### 3. **Frontend Integration**

#### File Modificati

**`frontend/src/services/apiService.js`** ✅
- **Fix endpoint**: `/status` → `/health` per backend health check
- **Metodo `uploadAudioFile`**: Supporta parametri opzionali `threshold_onset`, `quantize_ms`
- **Gestione errori CORS**

**`frontend/src/hooks/useMIDI.js`** ✅
- **Consolidato processing**: Singola chiamata `/transcribe` invece di chiamate separate
- **Parsing response**: Estrazione `stems` e `midi_data` dalla risposta unificata
- **Mock data fallback**: Se backend non disponibile

**`frontend/src/components/PianoRoll.jsx`** ✅
- **Fix suono doppio**: Rimosso collegamento automatico tra play Piano Roll e playback stems
- Ora:
  - Play Piano Roll → solo MIDI synth 🎹
  - Play Stems (sidebar) → solo audio stems 🎵
- **Visualizzazione note**: Canvas rendering con scroll e zoom

**`frontend/src/utils/logger.js`** ✅
- Logger frontend con `devLog`, `devWarn`, `devError`
- Attivo solo in development mode

---

### 4. **FFmpeg Integration**

#### Problema
- ❌ Demucs richiede FFmpeg per audio processing
- ❌ Errore: `FFmpeg non trovato`

#### Soluzione
```powershell
# Aggiunto FFmpeg al PATH della sessione
$env:PATH += ";C:\Users\bazma\Downloads\ffmpeg-...\bin"
```

**Nota**: FFmpeg deve essere aggiunto al PATH di sistema per permanenza

---

### 5. **Test Generati**

**`scripts/generate_test_audio.py`** ✅
- Genera file audio test:
  - Toni singoli (440Hz, 880Hz)
  - Melodie (scala C major)
  - Accordi (C major, G major)
  - Pattern drum
  - Composizioni complete

**Esecuzione**:
```bash
python scripts/generate_test_audio.py --all
```

**Output**: `backend/test_samples/*.wav`

---

## 🐛 **PROBLEMI RISOLTI**

### 1. **Python Version Incompatibility**
- **Errore**: `RuntimeError: Cannot install on Python 3.14`
- **Root cause**: `numba` (dipendenza `librosa`) non supporta Python 3.14
- **Fix**: Downgrade a Python 3.12.10
- **Status**: ✅ Risolto

### 2. **Unicode Encoding**
- **Errore**: `UnicodeEncodeError: 'charmap' codec can't encode character`
- **Root cause**: Windows console non supporta emoji UTF-8 di default
- **Fix**: `$env:PYTHONIOENCODING="utf-8"`
- **Status**: ✅ Risolto

### 3. **Demucs API Deprecation**
- **Errore**: `ModuleNotFoundError: No module named 'demucs.api'`
- **Root cause**: Demucs 4.0+ ha rimosso Python API
- **Fix**: Chiamata CLI via `subprocess.run([sys.executable, '-m', 'demucs', ...])`
- **Status**: ✅ Risolto

### 4. **TorchCodec Conflicts**
- **Errore**: `RuntimeError: Could not load libtorchcodec`
- **Root cause**: `torchaudio` non riusciva a salvare WAV
- **Fix**: Output Demucs in MP3 (`--mp3` flag)
- **Status**: ✅ Risolto

### 5. **Librosa API Changes**
- **Errore**: `peak_pick() got an unexpected keyword argument 'threshold'`
- **Root cause**: Librosa 0.11.0 ha rinominato `threshold` → `delta`
- **Fix**: Aggiornato codice in `transcribe_to_midi.py`
- **Status**: ✅ Risolto

### 6. **MIDI Creation Bug**
- **Errore**: `cannot access local variable 'note'`
- **Root cause**: Variabile sbagliata nel loop (`note` invece di `note_data`)
- **Fix**: Corretto in `create_midi()` method
- **Status**: ✅ Risolto

### 7. **Backend Endpoint Mismatch**
- **Errore**: `GET /status 404 Not Found`
- **Root cause**: Frontend chiamava `/status`, backend espone `/health`
- **Fix**: Aggiornato `apiService.js`
- **Status**: ✅ Risolto

### 8. **STEM_DIR Typo**
- **Errore**: `NameError: name 'STEM_DIR' is not defined`
- **Root cause**: Variabile chiamata `STEMS_DIR` nel codice
- **Fix**: Corretto in `app_integrated.py`
- **Status**: ✅ Risolto

### 9. **Double Audio Playback**
- **Errore**: Suono doppio (MIDI synth + stems) durante play Piano Roll
- **Root cause**: `useEffect` in `PianoRoll.jsx` avviava automaticamente stems
- **Fix**: Rimosso collegamento automatico, playback indipendenti
- **Status**: ✅ Risolto

### 10. **Module Import Errors**
- **Errore**: `ModuleNotFoundError: No module named 'backend'`
- **Root cause**: `backend/` non riconosciuta come package
- **Fix**: Creato `backend/__init__.py` + try-except imports in `app_integrated.py`
- **Status**: ✅ Risolto

---

## 📊 **STATO ATTUALE**

### ✅ **Funzionante**

#### Backend (Port 8000)
```bash
# Run command
cd backend
py -3.12 -m uvicorn app_integrated:app --reload --host 0.0.0.0 --port 8000
```

- ✅ `/health` - Health check
- ✅ `/transcribe` - Upload + Separation + Transcription
- ✅ `/stems/{path}` - Serve audio stems
- ✅ CORS configurato correttamente
- ✅ Logging colorato attivo
- ✅ FFmpeg integrato (con PATH configurato)

#### Frontend (Port 5173)
```bash
# Run command
cd frontend
npm run dev
```

- ✅ Upload file audio
- ✅ Backend connection test
- ✅ MIDI data parsing
- ✅ Piano Roll visualization
  - Rendering note su canvas
  - Scroll orizzontale/verticale
  - Zoom (default 195%)
  - Playhead sincronizzato
- ✅ MIDI synth playback (Tone.js)
- ✅ Stems audio playback (separato)
- ✅ AudioContext gestito correttamente

#### Pipeline Completa
```
1. User carica audio file ✅
2. Backend separa stems con Demucs ✅
3. Backend trascrive ogni stem in MIDI ✅
4. Frontend riceve stems + MIDI data ✅
5. Piano Roll visualizza note ✅
6. Playback MIDI synth funziona ✅
7. Playback stems funziona ✅
```

### ⚠️ **Limitazioni Attuali**

1. **Pitch Detection**: Solo `librosa.pyin` (monophonic)
   - CREPE non installato (richiederebbe TensorFlow)
   - Note polifoniche non rilevate correttamente

2. **Stem Separation**: Solo 2-stems (`vocals` / `no_vocals`)
   - Demucs può fare 4-stems (vocals, bass, drums, other)
   - Configurato per velocità test

3. **FFmpeg**: PATH configurato solo nella sessione corrente
   - Non persistente tra restart sistema

4. **Quantization**: Fissa a 50ms
   - Non configurabile da UI

5. **Processing Time**: ~8-10 secondi per file 4 secondi
   - Nessuna progress bar
   - Nessun processing asincrono

---

## 🚀 **PROSSIMI STEP**

### 🟢 **Alta Priorità**

#### 1. **Configurazione FFmpeg Permanente**
```powershell
# Aggiungere FFmpeg al PATH di sistema
[Environment]::SetEnvironmentVariable(
    "Path",
    $env:Path + ";C:\Users\bazma\Downloads\ffmpeg-...\bin",
    [EnvironmentVariableTarget]::User
)
```

#### 2. **4-Stems Separation**
Modificare `separate.py`:
```python
# Da:
'--two-stems=vocals'

# A:
# Nessun flag (default 4 stems: vocals, bass, drums, other)
```

#### 3. **Progress Bar Real-Time**
- **Opzione A**: WebSocket per aggiornamenti real-time
- **Opzione B**: Polling endpoint `/status/{job_id}`
- **UI**: Barra progress con steps:
  1. Upload (0-10%)
  2. Separation (10-60%)
  3. Transcription (60-90%)
  4. Finalization (90-100%)

#### 4. **Parametri UI per Tuning**
Aggiungere controlli in `App.jsx`:
```jsx
<div>
  <label>Onset Threshold: 
    <input type="range" min="0.1" max="1.0" step="0.1" />
  </label>
  <label>Quantize (ms): 
    <input type="number" min="10" max="200" />
  </label>
  <label>Stems: 
    <select>
      <option>2 (vocals/no_vocals)</option>
      <option>4 (vocals/bass/drums/other)</option>
    </select>
  </label>
</div>
```

#### 5. **Background Processing**
```python
# In app_integrated.py
from fastapi import BackgroundTasks

@app.post("/transcribe-async")
async def transcribe_async(
    file: UploadFile,
    background_tasks: BackgroundTasks
):
    job_id = generate_job_id()
    background_tasks.add_task(process_audio, job_id, file)
    return {"job_id": job_id, "status": "processing"}

@app.get("/status/{job_id}")
async def get_status(job_id: str):
    return {"progress": get_progress(job_id), "status": "processing"}
```

#### 6. **Export MIDI Button**
```jsx
// In App.jsx
<button onClick={async () => {
  const blob = await fetch(`http://localhost:8000/midi/download/${filename}`).then(r => r.blob())
  saveAs(blob, 'output.mid')
}}>
  💾 Export MIDI
</button>
```

Backend:
```python
@app.get("/midi/download/{filename}")
async def download_midi(filename: str):
    path = os.path.join(MIDI_DIR, filename)
    return FileResponse(path, media_type="audio/midi", filename=filename)
```

---

### 🟡 **Media Priorità**

#### 7. **CREPE Installation (Pitch Detection Avanzato)**
```bash
pip install crepe tensorflow
```

Pros:
- Pitch detection polifonico
- Maggiore accuratezza
- Supporta strumenti complessi

Cons:
- Richiede TensorFlow (~2GB)
- Più lento (~3-4x rispetto librosa)

#### 8. **UI/UX Improvements**

**File Manager**
- Lista upload recenti
- Preview waveform audio
- Metadata (duration, sample rate, channels)

**Piano Roll Enhancements**
- Note editing (drag, resize, delete)
- Multi-track color coding
- Grid snap settings
- Velocity editor

**Stems Mixer**
- Volume faders per stem
- Mute/Solo buttons
- Pan controls
- EQ basic (low/mid/high)

#### 9. **Persistent Storage**
- Database (SQLite) per job history
- Cache stems/MIDI per evitare reprocessing
- User projects/sessions

#### 10. **Error Handling UX**
- Toast notifications per errori
- Retry automatico per network failures
- Fallback graceful se backend offline

---

### 🔵 **Bassa Priorità**

#### 11. **Advanced Features**

**Auto Chord Detection**
```python
# Usando librosa
chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
chords = detect_chords(chroma)
```

**Batch Processing**
- Upload multipli file
- Queue management
- Parallel processing

**MIDI Export Options**
- Multi-format (Type 0/1, different TPQ)
- Stem routing per channel
- Tempo/key signature detection

**3D Piano Roll**
- Three.js visualization
- VR support (opzionale)

#### 12. **Optimization**

**Caching Strategy**
```python
import hashlib
import pickle

def cache_result(func):
    def wrapper(file_path, *args, **kwargs):
        cache_key = hashlib.md5(open(file_path, 'rb').read()).hexdigest()
        cache_file = f"cache/{cache_key}.pkl"
        
        if os.path.exists(cache_file):
            return pickle.load(open(cache_file, 'rb'))
        
        result = func(file_path, *args, **kwargs)
        pickle.dump(result, open(cache_file, 'wb'))
        return result
    return wrapper
```

**GPU Acceleration**
- Demucs su CUDA
- CREPE su GPU
- ~10-20x speed boost

**Quantization Models**
- Demucs quantized (lighter, faster)
- Trade-off: accuracy vs speed

---

## 📁 **FILE CREATI/MODIFICATI**

### Backend
- ✅ `backend/app_integrated.py` (modified)
- ✅ `backend/separate.py` (modified)
- ✅ `backend/transcribe_to_midi.py` (modified)
- ✅ `backend/logger.py` (existing, used)
- ✅ `backend/__init__.py` (created)

### Frontend
- ✅ `frontend/src/services/apiService.js` (modified)
- ✅ `frontend/src/hooks/useMIDI.js` (modified)
- ✅ `frontend/src/components/PianoRoll.jsx` (modified)

### Scripts
- ✅ `scripts/generate_test_audio.py` (existing, used)

### Documentation
- ✅ `PYTHON_COMPATIBILITY_ISSUE.md` (created)
- ✅ `TESTING_REPORT_FINAL.md` (created)
- ✅ `PIPELINE_TEST_REPORT.md` (created)
- ✅ `SESSION_RECAP_2025-10-19.md` (questo file)

---

## 🎯 **ROADMAP TIMELINE SUGGERITA**

### Sprint 1 (1-2 giorni) - Stabilizzazione ✅ COMPLETATO
- [x] Fix Python environment
- [x] Fix backend pipeline
- [x] Fix frontend integration
- [x] Basic playback funzionante

### Sprint 2 (2-3 giorni) - Core Features
- [ ] FFmpeg permanente
- [ ] 4-stems separation
- [ ] Progress bar
- [ ] Parametri UI
- [ ] Background processing

### Sprint 3 (3-4 giorni) - UX/Polish
- [ ] Export MIDI
- [ ] File manager
- [ ] Note editing base
- [ ] Error handling robusto
- [ ] CREPE installation (opzionale)

### Sprint 4 (1 settimana) - Advanced
- [ ] Chord detection
- [ ] Batch processing
- [ ] Persistent storage
- [ ] Piano Roll enhancements
- [ ] Optimization

---

## 🔧 **COMANDI RAPIDI**

### Backend
```bash
# Setup environment
py -3.12 -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt

# Run server
$env:PATH += ";C:\ffmpeg\bin"
$env:PYTHONIOENCODING="utf-8"
cd backend
py -3.12 -m uvicorn app_integrated:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
# Install dependencies
cd frontend
npm install

# Run dev server
npm run dev
```

### Testing
```bash
# Generate test audio
python scripts/generate_test_audio.py --all

# Test backend health
curl http://localhost:8000/health
```

---

## 📈 **METRICHE PERFORMANCE**

### Current Performance (Test File: 4 secondi)
- Upload: ~0.1s
- Separation (2-stems): ~8s
- Transcription (per stem): ~0.5s
- Total: ~10s

### Target Performance (con ottimizzazioni)
- Upload: ~0.1s
- Separation (GPU): ~2s
- Transcription (CREPE GPU): ~1s
- Total: ~4s

### Scalabilità
- File 30s → ~25-30s processing
- File 3min → ~2-3min processing
- Batch 10 file → ~5-10min (parallel)

---

## 🎓 **LESSONS LEARNED**

1. **Python Version Matters**: Sempre verificare compatibilità dipendenze
2. **API Deprecation**: Librerie audio cambiano spesso (Demucs, Librosa)
3. **Windows Unicode**: Configurare `PYTHONIOENCODING` per emoji/logger
4. **FFmpeg Path**: Cruciale per audio processing, deve essere nel PATH
5. **CORS Setup**: Fondamentale per comunicazione frontend-backend
6. **Async Processing**: Necessario per file grandi (>30s)
7. **Error Handling**: User experience dipende da gestione errori robusta
8. **Separation vs Quality**: Trade-off tra velocità (2-stems) e qualità (4-stems)

---

## 📞 **CONTATTI & SUPPORTO**

### Issues Tracking
- Backend: `backend/` + `TESTING_REPORT_FINAL.md`
- Frontend: `frontend/README.md`
- Pipeline: `PIPELINE_TEST_REPORT.md`

### Resources
- Demucs: https://github.com/facebookresearch/demucs
- Librosa: https://librosa.org/
- Tone.js: https://tonejs.github.io/
- FastAPI: https://fastapi.tiangolo.com/

---

## ✅ **CHECKLIST DEPLOYMENT**

### Pre-Production
- [ ] FFmpeg installato e nel PATH di sistema
- [ ] Python 3.12 configurato correttamente
- [ ] Tutte le dipendenze installate (`requirements.txt`)
- [ ] Environment variables configurate
- [ ] Test completi passano (upload → stems → MIDI → playback)

### Production Ready
- [ ] Background processing implementato
- [ ] Error handling robusto
- [ ] Logging production-ready (senza DEBUG)
- [ ] HTTPS configurato (per production)
- [ ] Database per job tracking
- [ ] Cache strategy implementata
- [ ] Backup system per file temporanei

---

**Data Report**: 19 Ottobre 2025  
**Versione Pipeline**: 1.0 (Core Functional)  
**Status**: ✅ **OPERATIONAL - Ready for Sprint 2**


