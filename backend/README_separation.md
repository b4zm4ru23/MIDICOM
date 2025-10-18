# Audio Separation con Demucs

Questo modulo contiene gli script per la separazione audio in stem usando Demucs.

## 🚀 Installazione

### 1. Dipendenze Python
```bash
# Installa dipendenze base
pip install -r requirements.txt

# Oppure installa manualmente
pip install demucs librosa soundfile fastapi uvicorn
```

### 2. FFmpeg
**Windows:**
```bash
# Con Chocolatey
choco install ffmpeg

# Con winget
winget install ffmpeg

# Oppure scarica da: https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt update
sudo apt install ffmpeg
```

### 3. Modelli Demucs
I modelli vengono scaricati automaticamente al primo utilizzo:
- `htdemucs` (default): Alta qualità, ~1x realtime
- `htdemucs_ft`: Fine-tuned, migliore per alcuni generi
- `mdx`: Più veloce, qualità leggermente inferiore

## 📁 File

- `separate.py`: Script principale per separazione
- `generate_test_audio.py`: Generatore audio di test
- `requirements.txt`: Dipendenze Python

## 🎵 Utilizzo

### Separazione Audio
```bash
# Separazione base
python separate.py input.mp3 output/

# Con modello specifico
python separate.py input.wav output/ --model htdemucs_ft

# Output verboso
python separate.py input.flac output/ --verbose
```

### Generazione Audio di Test
```bash
# Audio di test base (10 secondi)
python generate_test_audio.py test_audio.wav

# Audio personalizzato
python generate_test_audio.py test_audio.wav --duration 15 --sample-rate 48000
```

## 📊 Output

Lo script `separate.py` restituisce JSON con:
```json
{
  "success": true,
  "stems": {
    "drums": "output/drums.wav",
    "bass": "output/bass.wav", 
    "other": "output/other.wav",
    "vocals": "output/vocals.wav"
  },
  "duration": 10.5,
  "processing_time": 12.3,
  "model": "htdemucs"
}
```

## 🧪 Test

### 1. Genera audio di test
```bash
cd backend
python generate_test_audio.py test_audio.wav --duration 5
```

### 2. Testa separazione
```bash
python separate.py test_audio.wav output_test/
```

### 3. Verifica risultati
```bash
# Controlla file generati
ls -la output_test/

# Dovresti vedere:
# - drums.wav
# - bass.wav  
# - other.wav
# - vocals.wav
```

## ⚡ Performance

### Tempi di elaborazione (approssimativi)
- **htdemucs**: ~1x realtime (10s audio = ~10s processing)
- **htdemucs_ft**: ~1.2x realtime
- **mdx**: ~0.5x realtime

### Ottimizzazioni
- **GPU**: Cambia `device='cpu'` in `device='cuda'` in `separate.py`
- **Parallelo**: Aumenta `jobs` parameter per file lunghi
- **Shifts**: Riduci `shifts` per velocità, aumenta per qualità

## 🐛 Troubleshooting

### Errore: "Demucs non trovato"
```bash
pip install demucs
```

### Errore: "FFmpeg non trovato"
- Installa FFmpeg e aggiungi al PATH
- Verifica con: `ffmpeg -version`

### Errore: "Modello non trovato"
```bash
# Forza download modello
python -c "import demucs; demucs.api.separate_track('test.wav', model='htdemucs')"
```

### Errore: "Out of memory"
- Riduci `shifts` parameter
- Usa `split=True` per file lunghi
- Chiudi altre applicazioni

### Qualità separazione scarsa
- Prova modello `htdemucs_ft`
- Aumenta `shifts` parameter
- Verifica qualità audio input

## 📈 Prossimi Sviluppi

- [ ] Supporto batch processing
- [ ] Integrazione GPU automatica
- [ ] Cache modelli
- [ ] API REST endpoint
- [ ] Progress tracking real-time
- [ ] Supporto formati aggiuntivi





