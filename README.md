# MIDICOM

**MIDI Composition Tool** - Desktop app per separare, trascrivere e editare audio in MIDI

## 🎯 Obiettivo

MIDICOM è una desktop application che permette di:
- Caricare file audio (WAV, MP3, FLAC)
- Separare automaticamente gli stem (batteria, basso, melodia, altri)
- Trascrivere ogni stem in note MIDI
- Visualizzare e editare le note in un piano-roll interattivo
- Esportare il risultato come file MIDI

## 🚀 Status

### ✅ Sprint 1 - Core Pipeline (COMPLETED - 2025-10-19)
- [x] Setup progetto e struttura base
- [x] Interfaccia Electron + React per caricamento file
- [x] Backend Python per separazione stem (Demucs)
- [x] Trascrizione MIDI con librosa + pretty_midi
- [x] Piano-roll editor base con zoom e scroll
- [x] Playback MIDI synth + stems audio
- [x] Logging centralizzato frontend/backend
- [x] Pipeline completa funzionante

**Status**: ✅ **OPERATIONAL** - Pipeline audio → stems → MIDI → Piano Roll funzionante

### 🔄 Sprint 2 - Enhanced Features (PLANNED)
- [ ] Progress bar real-time per processing
- [ ] 4-stems separation (vocals, bass, drums, other)
- [ ] Parametri UI per tuning (threshold, quantization)
- [ ] Background processing asincrono
- [ ] Export MIDI button
- [ ] FFmpeg PATH permanente

### 📋 Sprint 3 - UX/Polish (FUTURE)
- [ ] Editing avanzato piano-roll (drag notes, resize, delete)
- [ ] File manager con upload history
- [ ] Toast notifications per errori
- [ ] Note editing nel Piano Roll
- [ ] CREPE pitch detection (opzionale)

## 🛠 Tech Stack

### Frontend
- **Electron** - Desktop app framework
- **React** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Piano Roll** - MIDI editor component

### Backend
- **Python 3.12** - Core processing (required: >=3.10, <3.14)
- **FastAPI** - REST API server
- **Demucs 4.0** - Audio source separation (CLI-based)
- **librosa 0.10.2** - Audio analysis
- **pretty_midi** - MIDI manipulation
- **uvicorn** - ASGI server
- **FFmpeg** - Audio format conversion

### Comunicazione
- **Local REST API** - Frontend ↔ Backend
- **WebSocket** - Real-time updates (futuro)

## 📁 Struttura Progetto

```
MIDICOM/
├── frontend/                 # Electron + React app
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # App pages
│   │   ├── hooks/          # Custom hooks
│   │   ├── utils/          # Utilities
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   ├── package.json
│   └── electron.js
├── backend/                 # Python FastAPI server
│   ├── app/
│   │   ├── api/            # API endpoints
│   │   ├── core/           # Core logic
│   │   ├── models/         # Data models
│   │   └── services/       # Business logic
│   ├── tests/              # Unit tests
│   ├── requirements.txt
│   └── main.py
├── shared/                  # Shared types/utilities
├── docs/                    # Documentation
├── scripts/                 # Build/deploy scripts
└── .github/                 # GitHub Actions
```

## 🚀 Quick Start

### Prerequisiti
- Node.js 18+
- Python 3.9+
- Git

### Installazione
```bash
# Clone repository
git clone https://github.com/username/MIDICOM.git
cd MIDICOM

# Setup backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup frontend
cd ../frontend
npm install

# Avvia sviluppo
npm run dev  # Frontend + Backend
```

## 📋 Roadmap

- **Q1 2024**: MVP con funzionalità base
- **Q2 2024**: Editing avanzato e performance
- **Q3 2024**: Plugin system e community features
- **Q4 2024**: Mobile companion app

## 🤝 Contribuire

1. Fork del repository
2. Crea feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push branch (`git push origin feature/amazing-feature`)
5. Apri Pull Request

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per maggiori informazioni.

## 🙏 Ringraziamenti

- [Demucs](https://github.com/facebookresearch/demucs) - Audio source separation
- [librosa](https://librosa.org/) - Audio analysis
- [pretty_midi](https://github.com/craffel/pretty-midi) - MIDI manipulation
- [Electron](https://electronjs.org/) - Desktop app framework

