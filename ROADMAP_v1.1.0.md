# MIDICOM v1.1.0 - Roadmap Tecnica Unificata

> **Versione corrente**: v1.0.0 (Stable - Unified Logging System)  
> **Target release**: Q1 2025  
> **Focus**: Precisione, Usabilità, Workflow Professionale

---

## 🎯 Obiettivi Principali v1.1.0

1. **🎵 Migliorare Precisione Trascrizione** - Polyphonic detection e chord recognition
2. **🎛️ Editing MIDI Avanzato** - Drag & drop, quantizzazione, velocity editing
3. **⚡ Performance e Stabilità** - GPU optimization, caching, error recovery
4. **🔄 Workflow Professionale** - Batch processing, preset, export avanzato
5. **🧪 Testing e Qualità** - Automated tests, validation, documentation

---

## 🟢 Alta Priorità

### 🎵 Backend Audio & MIDI

#### 1. Real Audio Processing [CRITICO]
**Status**: Mock data attualmente utilizzato  
**Moduli**: `backend/app.py`, `backend/separate.py`

- [ ] **Sostituire mock data con separazione Demucs reale**
  - Integrare `AudioSeparator` class in endpoint `/transcribe`
  - Gestire processamento asincrono per file grandi
  - Implementare progress tracking via WebSocket
  
- [ ] **Sostituire mock MIDI con trascrizione reale**
  - Integrare `MIDITranscriber` class in endpoint `/midi/{filename}`
  - Supportare parametri personalizzati per stem (batteria/basso/melodia)
  - Validare output MIDI prima di inviare al frontend

**File coinvolti**: `backend/app.py`, `backend/separate.py`, `backend/transcribe_to_midi.py`

#### 2. Polyphonic Detection [ALTA PRIORITÀ]
**Riferimento**: `backend/README_transcription.md` - Prossimi Sviluppi

- [ ] **Implementare rilevamento accordi**
  - Algoritmo per chord detection (C Major, Am, etc.)
  - Integrazione con librosa o Madmom
  - Output multi-note per singolo timestamp
  
- [ ] **Supporto multiple note simultanee**
  - Pitch detection polifonico con CREPE
  - Clustering temporale per note sovrapposte
  - Validazione armonica (evitare false positive)

**Librerie suggerite**: `madmom`, `music21`, `mir_eval`  
**Test**: Accordi chitarra, piano complesso, ensemble

#### 3. File Management e Cleanup [CRITICO]
**Riferimento**: `INTEGRATION_README.md` - Next Steps

- [ ] **Sistema di cleanup automatico**
  - Task periodico per eliminare file temporanei > 24h
  - Storage limits per evitare overflow disco
  - Logging cleanup operations
  
- [ ] **Gestione sessioni utente**
  - Session ID per tracciare file processati
  - Folder dedicati per utente/sessione
  - API endpoint per eliminare sessione

**File coinvolti**: `backend/app.py`, nuovo `backend/cleanup.py`

#### 4. Ottimizzazione GPU [PERFORMANCE]
**Riferimento**: `backend/README_separation.md` - Ottimizzazioni

- [ ] **Auto-detection GPU availability**
  ```python
  device = 'cuda' if torch.cuda.is_available() else 'cpu'
  ```
  
- [ ] **Parametri ottimizzati per GPU/CPU**
  - GPU: shifts=10, split=False
  - CPU: shifts=5, split=True (file lunghi)
  
- [ ] **Memory management**
  - Batch size dinamico basato su VRAM disponibile
  - Fallback CPU su OOM error

**Test**: Confronto tempi GPU vs CPU, memory usage profiling

---

### 🎛️ Frontend UI/UX & Interazione

#### 5. MIDI Editing Drag & Drop [ALTA PRIORITÀ]
**Riferimento**: `frontend/README.md` - Prossimi Sviluppi

- [ ] **Note dragging verticale (pitch)**
  - Snap to grid con feedback visivo
  - Constraint su scala musicale (opzionale)
  - Multi-select per spostamenti batch
  
- [ ] **Note dragging orizzontale (timing)**
  - Snap to beat/bar con quantizzazione
  - Visual feedback per timing corrente
  - Collision detection con altre note
  
- [ ] **Note resizing (durata)**
  - Drag endpoint per cambiare durata
  - Snap to quantizzazione
  - Durata minima (es. 16th note)

**File coinvolti**: `frontend/src/components/PianoRoll.jsx`  
**UX**: Cursor change on hover, tooltip con pitch/timing, undo/redo support

#### 6. Quantizzazione Automatica [FUNZIONALITÀ]
**Riferimento**: `frontend/README.md` - Prossimi Sviluppi

- [ ] **Preset di quantizzazione**
  - 1/4, 1/8, 1/16, 1/32 notes
  - Triplets support
  - Swing quantization
  
- [ ] **Smart quantization**
  - Analisi timing esistente
  - Preserva espressività (non quantizza tutto)
  - Strength slider (0% = off, 100% = strict)
  
- [ ] **UI Controls**
  - Dropdown menu con preset
  - Hotkey (Q per quantize)
  - Preview before/after

**File coinvolti**: `frontend/src/components/PianoRoll.jsx`, nuovo `frontend/src/utils/quantization.js`

#### 7. Export MIDI Avanzato [ESSENZIALE]
**Riferimento**: `frontend/README.md` - Prossimi Sviluppi

- [ ] **Export con metadata**
  - Tempo (BPM) personalizzabile
  - Time signature
  - Track names e program change
  
- [ ] **Formato export**
  - MIDI Type 0 (single track) / Type 1 (multi track)
  - Velocity normalization opzionale
  - Quantizzazione pre-export
  
- [ ] **Preview pre-export**
  - Anteprima modifiche (quantize, tempo)
  - File size estimate
  - Compatibility warnings (DAW compatibility)

**File coinvolti**: `frontend/src/services/midiExport.js` (nuovo), `frontend/src/App.jsx`

#### 8. Undo/Redo System [IMPORTANTE]
**Riferimento**: `frontend/README.md` - Prossimi Sviluppi

- [ ] **History stack**
  - Implementare command pattern per azioni
  - Stack size limit (es. 50 azioni)
  - Memoria ottimizzata (snapshot differenziali)
  
- [ ] **Azioni supportate**
  - Note create/delete/move/resize
  - Velocity changes
  - Quantizzazione
  
- [ ] **UI**
  - Bottoni Undo/Redo con icone
  - Hotkeys (Ctrl+Z, Ctrl+Y)
  - Status bar con action count

**File coinvolti**: `frontend/src/hooks/useHistory.js` (nuovo), `frontend/src/components/PianoRoll.jsx`

---

### 🌐 Integrazione API e Comunicazione

#### 9. WebSocket Progress Tracking [PERFORMANCE]
**Riferimento**: `INTEGRATION_README.md` - Next Steps

- [ ] **WebSocket backend**
  - Endpoint `/ws/{session_id}`
  - Eventi: `progress`, `status`, `error`, `complete`
  - Percentuale completamento real-time
  
- [ ] **Frontend integration**
  - Auto-reconnect su disconnessione
  - Progress bar con percentuale
  - Cancel operation support
  
- [ ] **Eventi emessi**
  ```json
  {
    "event": "progress",
    "session_id": "abc123",
    "step": "separation",
    "progress": 45.2,
    "message": "Separating vocals..."
  }
  ```

**File coinvolti**: `backend/app.py` (nuovo endpoint), `frontend/src/hooks/useWebSocket.js` (nuovo)

#### 10. Error Recovery e Retry [STABILITÀ]
**Riferimento**: `INTEGRATION_README.md` - Next Steps

- [ ] **Retry automatico**
  - Exponential backoff per network errors
  - Max 3 retry attempts
  - User notification su fallimento permanente
  
- [ ] **Graceful degradation**
  - Fallback a mock data su backend down (development)
  - Cache risultati processati
  - Offline mode con warning
  
- [ ] **Error reporting**
  - Error codes strutturati
  - User-friendly messages
  - Log dettagliati per debugging

**File coinvolti**: `frontend/src/services/apiService.js`, `backend/app.py`

---

## 🟡 Media Priorità

### 🎵 Backend Features

#### 11. Batch Processing [PRODUTTIVITÀ]
**Riferimento**: `backend/README_separation.md`, `backend/README_transcription.md` - Prossimi Sviluppi

- [ ] **API endpoint per batch**
  - POST `/batch/transcribe` con array di file
  - Queue management con priorità
  - Parallel processing (CPU cores)
  
- [ ] **Progress tracking batch**
  - Status per file: pending/processing/complete/error
  - Overall progress percentage
  - ETA calculation
  
- [ ] **Frontend UI**
  - Drag & drop multiple files
  - Progress table con status icons
  - Batch cancel/pause support

**File coinvolti**: `backend/app.py`, `backend/batch_processor.py` (nuovo)

#### 12. Quantizzazione Ritmica Intelligente [QUALITÀ]
**Riferimento**: `backend/README_transcription.md` - Prossimi Sviluppi

- [ ] **Tempo detection automatico**
  - BPM estimation da audio
  - Time signature detection (4/4, 3/4, etc.)
  - Downbeat detection
  
- [ ] **Context-aware quantization**
  - Preserva ghost notes
  - Rileva intenzionali off-beat
  - Strength parameter (soft vs hard quantize)
  
- [ ] **Musical rules**
  - Constraint su scale (C Major, A Minor, etc.)
  - Chord-aware note correction
  - Humanization post-quantize

**Librerie**: `essentia`, `madmom`, `librosa.beat`

#### 13. Cache Sistema [PERFORMANCE]
**Riferimento**: `backend/README_separation.md` - Prossimi Sviluppi

- [ ] **Cache modelli Demucs**
  - Pre-load modelli in memoria all'avvio
  - Evitare reload ripetuti
  - Memory management per modelli grandi
  
- [ ] **Cache risultati processamento**
  - Hash audio file per key
  - Store stems/MIDI in cache (Redis/FileSystem)
  - TTL configurable (24h default)
  
- [ ] **API cache headers**
  - ETag support
  - Last-Modified headers
  - Client-side caching

**Tecnologie**: Redis (cache distribuito) o filesystem + SQLite (cache locale)

---

### 🎛️ Frontend Enhancements

#### 14. Keyboard Shortcuts [UX]
**Riferimento**: `frontend/README.md` - Prossimi Sviluppi

- [ ] **Playback shortcuts**
  - Space: Play/Pause
  - Enter: Stop
  - Shift+Space: Play from cursor
  
- [ ] **Editing shortcuts**
  - Delete: Delete selected notes
  - Ctrl+A: Select all
  - Ctrl+C/V: Copy/Paste notes
  - Ctrl+D: Duplicate notes
  
- [ ] **Navigation**
  - Arrow keys: Move selection
  - +/-: Zoom in/out
  - Home/End: Jump to start/end
  
- [ ] **Tools**
  - Q: Quantize
  - T: Change tool (select/draw/erase)
  - M: Mute/unmute track

**File coinvolti**: `frontend/src/hooks/useKeyboard.js` (nuovo), `frontend/src/components/PianoRoll.jsx`

#### 15. Temi Personalizzabili [UI]
**Riferimento**: `frontend/README.md` - Prossimi Sviluppi

- [ ] **Theme presets**
  - Dark (default)
  - Light
  - High contrast
  - Custom color picker
  
- [ ] **Personalizzazione**
  - Background colors
  - Note colors (per velocity/track)
  - Grid colors
  - UI accent colors
  
- [ ] **Persistence**
  - Save theme in localStorage
  - Export/import theme JSON
  - Share themes (community)

**File coinvolti**: `frontend/src/contexts/ThemeContext.jsx` (nuovo), `tailwind.config.js`

#### 16. Velocity Editing [FUNZIONALITÀ]
**Riferimento**: Implicito da editing avanzato

- [ ] **Visual velocity**
  - Colore note basato su velocity (già implementato)
  - Barra velocity sotto piano roll
  - Range min/max indicators
  
- [ ] **Velocity editing**
  - Click & drag su velocity bar
  - Multi-note velocity scaling
  - Velocity curves (linear, exponential, random)
  
- [ ] **MIDI CC support (futuro)**
  - Modulation, expression, pan
  - Visual editing con curves
  - Per-track CC

**File coinvolti**: `frontend/src/components/PianoRoll.jsx`, `frontend/src/components/VelocityEditor.jsx` (nuovo)

---

### ⚙️ Testing, Build, Documentation

#### 17. Automated Testing [QUALITÀ]

- [ ] **Backend tests**
  - Unit tests per `AudioSeparator`, `MIDITranscriber`
  - Integration tests per API endpoints
  - Performance benchmarks
  
- [ ] **Frontend tests**
  - Component tests (React Testing Library)
  - Hook tests
  - E2E tests (Playwright/Cypress)
  
- [ ] **CI/CD**
  - GitHub Actions per test automatici
  - Pre-commit hooks (ESLint, pytest)
  - Coverage reports (>80% target)

**File**: `backend/tests/`, `frontend/src/__tests__/`, `.github/workflows/`

#### 18. Validazione MIDI [QUALITÀ]
**Riferimento**: `backend/README_transcription.md` - Troubleshooting

- [ ] **Pre-export validation**
  - Note duration > 0
  - MIDI numbers validi (0-127)
  - Velocities valide (1-127)
  - Timing non negativi
  
- [ ] **DAW compatibility checks**
  - Test import in Logic Pro, Ableton, FL Studio
  - Warning per problemi noti
  - Auto-fix per issues comuni
  
- [ ] **Quality metrics**
  - Note density (notes/second)
  - Pitch range
  - Timing quantization score
  - Harmony validation (accordi validi)

**File coinvolti**: `backend/transcribe_to_midi.py`, nuovo `backend/midi_validator.py`

---

## 🔵 Bassa Priorità / Futuro

### 🧠 AI/Machine Learning

#### 19. CREPE Integration [QUALITÀ]
**Riferimento**: `backend/README_transcription.md` - Dipendenze Opzionali

- [ ] Installazione opzionale CREPE + TensorFlow
- [ ] Parametro API `use_crepe=true` per pitch migliore
- [ ] Fallback automatico a librosa se CREPE non disponibile
- [ ] Benchmark qualità CREPE vs librosa

**Note**: +2-3x tempo elaborazione ma qualità pitch superiore

#### 20. Chord Recognition AI [SPERIMENTALE]

- [ ] Modello ML per chord detection (jazz chords, inversioni)
- [ ] Integrazione con `music21` per analisi armonica
- [ ] API endpoint `/analyze/harmony`
- [ ] UI per visualizzare chord progressions

**Librerie**: `music21`, `chordify`, custom ML model

#### 21. Genre-Specific Presets [UX]

- [ ] Preset parametri per genere (Rock, Jazz, EDM, Classical)
- [ ] Auto-tuning basato su audio analysis
- [ ] Community preset sharing
- [ ] Preset marketplace (futuro)

---

### 🌐 Advanced Features

#### 22. Plugin System [ESTENSIBILITÀ]
**Riferimento**: `frontend/README.md`, `README.md` - Roadmap Q3 2024

- [ ] Plugin API per processing customizzato
- [ ] Marketplace per plugin community
- [ ] Sandboxing per sicurezza
- [ ] Hot reload per sviluppo plugin

**Architettura**: Plugin come npm packages, API hooks per audio/MIDI processing

#### 23. Mobile Companion App [FUTURO]
**Riferimento**: `README.md` - Roadmap Q4 2024

- [ ] React Native app per iOS/Android
- [ ] Remote control per desktop app
- [ ] Preview MIDI on mobile
- [ ] Cloud sync (Firebase/AWS)

#### 24. Collaborative Editing [SPERIMENTALE]

- [ ] Real-time collaboration (WebSocket + CRDT)
- [ ] User cursors e selections
- [ ] Chat integrato
- [ ] Version control per progetti

**Tecnologie**: Yjs, Socket.io, Firebase Realtime Database

#### 25. 3D Piano Roll Visualization [INNOVAZIONE]

- [ ] WebGL/Three.js rendering
- [ ] Visualizzazione 3D tempo/pitch/velocity
- [ ] VR support (Oculus/PSVR)
- [ ] Effetti particellari per note playback

**Librerie**: Three.js, WebXR API

---

## 💡 Suggerimenti Tecnici

### 🎚️ Parametri Ottimali per Trascrizione

#### Batteria
```bash
--threshold-onset 0.5        # Rilevamento onset più strict
--min-duration 0.05          # Note molto brevi
--quantize 100               # Quantizzazione forte (groove)
--hop-length 256             # Precisione alta per transient
```

#### Basso
```bash
--threshold-onset 0.4        # Onset moderato
--min-duration 0.2           # Note sostenute
--quantize 50                # Quantizzazione media
--hop-length 512             # Bilanciamento velocità/qualità
```

#### Melodia/Vocale
```bash
--threshold-onset 0.3        # Onset sensibile
--min-duration 0.1           # Note brevi ma non brevissime
--quantize 25                # Quantizzazione leggera (espressività)
--hop-length 512             # Standard
--use-crepe                  # Pitch detection avanzato
```

#### Pianoforte Complesso
```bash
--threshold-onset 0.25       # Molto sensibile per note sovrapposte
--min-duration 0.08          # Supporta staccato
--quantize 0                 # No quantizzazione (rubato)
--hop-length 256             # Alta precisione
--polyphonic true            # Abilita detection polifonico (v1.1.0)
```

---

### ⚡ Performance Tuning

#### GPU Optimization
```python
# backend/separate.py
device = 'cuda' if torch.cuda.is_available() else 'cpu'

# Parametri ottimali GPU
if device == 'cuda':
    shifts = 10          # Qualità massima
    split = False        # Process in memoria
    overlap = 0.25       # Overlap alto per qualità
else:
    shifts = 5           # Bilanciato
    split = True         # Chunk processing
    overlap = 0.1        # Overlap basso per velocità
```

#### Memory Management
```python
# Limiti memoria per file grandi
MAX_FILE_SIZE_MB = 100  # Warning sopra 100MB
CHUNK_SIZE_MB = 10      # Process in chunk da 10MB

# Auto-split per file lunghi
if duration > 600:  # 10 minuti
    split = True
    chunk_duration = 60  # 1 minuto chunks
```

---

### 🧪 Testing Best Practices

#### Unit Test Structure
```python
# backend/tests/test_transcriber.py
def test_transcription_accuracy():
    """Test con audio sintetico noto"""
    audio = generate_sine_wave(440, duration=1.0)  # A4
    midi = transcriber.transcribe(audio)
    
    assert len(midi.notes) == 1
    assert midi.notes[0].pitch == 69  # A4 = MIDI 69
    assert 0.95 < midi.notes[0].duration < 1.05  # ±5% tolleranza
```

#### Integration Test
```python
# backend/tests/test_api.py
def test_full_pipeline(client, test_audio_file):
    """Test upload → separation → transcription"""
    # 1. Upload
    response = client.post('/transcribe', files={'file': test_audio_file})
    assert response.status_code == 200
    
    # 2. Get stems
    stems = client.get(f'/stems/{test_audio_file.name}')
    assert 'drums' in stems.json()['stems']
    
    # 3. Get MIDI
    midi = client.get(f'/midi/{test_audio_file.name}')
    assert midi.json()['midi_data']['tracks']
```

#### E2E Test (Frontend)
```javascript
// frontend/src/__tests__/e2e/upload.spec.js
test('Full upload and transcription workflow', async () => {
  const { page } = await setupTest()
  
  // 1. Upload file
  await page.click('[data-testid="upload-button"]')
  await page.setInputFiles('input[type="file"]', 'test.wav')
  
  // 2. Wait for processing
  await page.waitForSelector('[data-testid="processing-complete"]')
  
  // 3. Verify piano roll
  const notes = await page.$$('[data-testid="midi-note"]')
  expect(notes.length).toBeGreaterThan(0)
})
```

---

### 📚 Documentation Standards

#### Code Comments
```python
# ✅ GOOD: Spiega WHY, non WHAT
def quantize_notes(notes, grid_ms):
    """
    Quantizza timing note alla griglia specificata.
    
    Uses round-to-nearest per preservare groove naturale,
    non snap-to-grid strict che distruggerebbe l'espressività.
    """
    # Preserva prime/ultime note (intro/outro spesso off-grid)
    if len(notes) <= 2:
        return notes
    
    # ... implementation
```

#### API Documentation
```python
@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile,
    separation_model: str = "htdemucs",
    transcription_method: str = "librosa",
    threshold_onset: float = 0.3
):
    """
    Transcribe audio file to MIDI.
    
    Args:
        file: Audio file (WAV, MP3, FLAC)
        separation_model: Demucs model (htdemucs|htdemucs_ft|mdx)
        transcription_method: Pitch detection (librosa|crepe)
        threshold_onset: Onset detection threshold (0.1-1.0)
    
    Returns:
        JSON with stems paths and MIDI data
        
    Performance:
        - ~1x realtime with htdemucs
        - ~2-3x with CREPE pitch detection
        
    Example:
        curl -X POST -F "file=@song.wav" \\
             -F "threshold_onset=0.4" \\
             http://localhost:8000/transcribe
    """
```

---

### 🔒 Security Considerations

#### File Upload Validation
```python
ALLOWED_EXTENSIONS = {'.wav', '.mp3', '.flac', '.m4a'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

def validate_upload(file: UploadFile):
    # Check extension
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, "Unsupported file format")
    
    # Check size
    file.file.seek(0, 2)  # Seek to end
    size = file.file.tell()
    file.file.seek(0)     # Reset
    
    if size > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large")
```

#### Sanitize Filenames
```python
import re
from pathlib import Path

def sanitize_filename(filename: str) -> str:
    """Remove dangerous characters from filename"""
    # Remove path traversal
    name = Path(filename).name
    
    # Remove dangerous chars
    name = re.sub(r'[^\w\s.-]', '', name)
    
    # Limit length
    return name[:255]
```

---

## 📅 Timeline Suggerita

### Sprint 1 (2 settimane) - Fondamenta
- Real audio processing integration
- File management e cleanup
- WebSocket progress tracking

### Sprint 2 (2 settimane) - Editing
- MIDI drag & drop
- Quantizzazione automatica
- Export MIDI avanzato

### Sprint 3 (2 settimane) - Qualità
- Polyphonic detection
- Undo/Redo system
- Error recovery

### Sprint 4 (1 settimana) - Polish
- Keyboard shortcuts
- Velocity editing
- Testing e bug fixing

### Sprint 5 (1 settimana) - Release
- Documentation
- Performance optimization
- Release v1.1.0

**Total**: ~8 settimane sviluppo attivo

---

## 🎯 Metriche di Successo v1.1.0

### Performance
- [ ] Separazione audio: < 1.5x realtime (CPU), < 0.5x (GPU)
- [ ] Trascrizione MIDI: < 2x realtime con CREPE
- [ ] Frontend rendering: 60 FPS costanti con 500+ note

### Qualità
- [ ] Accuratezza pitch: >90% su test set
- [ ] Accuratezza onset: >85% su test set
- [ ] Zero crash su file validi <100MB

### UX
- [ ] Workflow completo senza tutorial: <5 minuti
- [ ] Export MIDI compatibile con 95% DAW comuni
- [ ] Zero log console.log in production

### Testing
- [ ] Code coverage: >80%
- [ ] CI/CD green builds: >95%
- [ ] E2E tests passing: 100%

---

## 🤝 Contributi Community

Per contribuire a v1.1.0:

1. **Scegli un task** dalla roadmap (priorità 🟢 o 🟡)
2. **Crea issue** su GitHub con label `v1.1.0`
3. **Fork & branch** naming: `feature/v1.1.0-taskname`
4. **PR con descrizione** dettagliata + test coverage
5. **Review** da maintainer + merge

---

## 📞 Contatti & Supporto

- **GitHub Issues**: Bug reports e feature requests
- **Discussions**: Domande tecniche e brainstorming
- **Discord** (futuro): Community chat real-time

---

**Last updated**: 2025-10-19  
**Document version**: 1.0  
**Maintained by**: MIDICOM Team


