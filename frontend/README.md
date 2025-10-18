# MIDICOM Frontend

Frontend Electron + React per l'applicazione MIDICOM.

## 🚀 Installazione

### Prerequisiti
- Node.js 18+
- npm o yarn

### Setup
```bash
# Installa dipendenze
npm install

# Avvia in modalità sviluppo
npm run dev
```

## 📁 Struttura

```
frontend/
├── electron/           # Main process Electron
│   ├── main.js        # Entry point principale
│   └── preload.mjs    # Preload script
├── src/
│   ├── components/    # Componenti React
│   │   ├── PianoRoll.jsx
│   │   └── AudioPlayer.jsx
│   ├── hooks/         # Custom hooks
│   │   ├── useMIDI.js
│   │   └── useAudioPlayer.js
│   ├── services/      # Servizi API
│   │   └── audioService.js
│   ├── App.jsx        # Componente principale
│   ├── main.jsx       # Entry point React
│   └── index.css      # Stili globali
├── package.json
├── vite.config.js
└── tailwind.config.js
```

## 🎵 Funzionalità

### Upload e Processamento
- **Drag & drop** per file audio
- **Supporto formati**: WAV, MP3, FLAC, M4A
- **Processamento** via API backend
- **Lista stem** separati (drums, bass, other, vocals)

### Piano Roll
- **Visualizzazione MIDI** su canvas
- **Zoom e pan** interattivi
- **Griglia temporale** e pitch
- **Note colorate** per velocity
- **Playhead** in tempo reale

### Playback
- **Sincronizzazione** audio + MIDI
- **Controlli** play/pause/stop
- **Volume** per stem
- **Timeline** interattiva

## 🛠 Scripts

```bash
# Sviluppo
npm run dev              # Avvia frontend + Electron
npm run dev:vite         # Solo Vite dev server
npm run dev:electron     # Solo Electron

# Build
npm run build            # Build completo
npm run build:vite       # Solo build Vite
npm run build:electron   # Solo build Electron

# Linting
npm run lint             # ESLint
npm run type-check       # TypeScript check
```

## 🎨 Tecnologie

- **Electron**: Desktop app framework
- **React**: UI library
- **Vite**: Build tool e dev server
- **Tailwind CSS**: Styling
- **Tone.js**: Audio processing e playback
- **Canvas API**: Piano roll rendering

## 🔧 Configurazione

### Vite
Configurato per Electron con:
- Base path relativo
- Alias `@` per `src/`
- Exclude Electron da optimizeDeps

### Electron
- **Main process**: Gestione finestre e IPC
- **Preload**: API sicure per renderer
- **File dialogs**: Selezione file audio/MIDI

### Tailwind
- **Tema scuro** predefinito
- **Colori personalizzati** per MIDICOM
- **Animazioni** custom

## 🎯 API Backend

Il frontend si connette al backend Python su `localhost:8000`:

```javascript
// Esempi di utilizzo
import { processAudio, transcribeStem } from './services/audioService'

// Processa audio
const result = await processAudio('/path/to/audio.wav')

// Trascrivi stem
const midi = await transcribeStem('/path/to/stem.wav', '/path/to/output.mid')
```

## 🧪 Test

```bash
# Test rapido
npm run dev

# Verifica build
npm run build
npm run preview
```

## 🐛 Troubleshooting

### "Backend not available"
- Verifica che il backend Python sia in esecuzione
- Controlla che sia su `localhost:8000`

### "Audio not playing"
- Verifica che i file audio siano accessibili
- Controlla console per errori Tone.js

### "MIDI not loading"
- Verifica formato file MIDI
- Controlla che il file non sia corrotto

### "Canvas not rendering"
- Verifica dimensioni container
- Controlla che il canvas sia visibile

## 📈 Prossimi Sviluppi

- [ ] Supporto MIDI real-time
- [ ] Editing note drag & drop
- [ ] Quantizzazione automatica
- [ ] Export MIDI
- [ ] Plugin system
- [ ] Temi personalizzabili
- [ ] Shortcut keyboard
- [ ] Undo/Redo






