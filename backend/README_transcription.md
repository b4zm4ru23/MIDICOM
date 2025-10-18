# Trascrizione MIDI

Questo modulo contiene gli script per la trascrizione audio in MIDI usando onset detection e pitch detection.

## 🚀 Installazione

### Dipendenze Base
```bash
pip install librosa pretty_midi numpy
```

### Dipendenze Opzionali (per qualità migliore)
```bash
# CREPE per pitch detection avanzata
pip install crepe tensorflow

# Oppure installa tutto
pip install -r requirements.txt
```

## 📁 File

- `transcribe_to_midi.py`: Script principale per trascrizione
- `test_transcription.py`: Script di test completo
- `requirements.txt`: Dipendenze aggiornate

## 🎵 Utilizzo

### Trascrizione Base
```bash
# Trascrizione semplice
python transcribe_to_midi.py input.wav output.mid

# Con parametri personalizzati
python transcribe_to_midi.py input.wav output.mid --threshold-onset 0.5 --quantize 100
```

### Parametri CLI

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `--hop-length` | 512 | Dimensione hop per analisi (maggiore = più veloce, meno preciso) |
| `--threshold-onset` | 0.3 | Soglia per rilevamento onset (0.1-1.0, maggiore = meno note) |
| `--min-duration` | 0.1 | Durata minima nota in secondi |
| `--quantize` | 50 | Quantizzazione in millisecondi (0 = disabilitata) |
| `--verbose` | - | Output dettagliato |

### Test Completo
```bash
# Test pipeline completa: separazione + trascrizione
python test_transcription.py
```

## 📊 Output

### File MIDI
Il script genera un file MIDI con:
- **Una traccia** (Piano, program 0)
- **Note con timing** start/end precisi
- **Velocity stimata** basata su frequenza e intensità
- **Quantizzazione** opzionale per timing perfetto

### Output JSON
```json
{
  "success": true,
  "input_file": "input.wav",
  "output_file": "output.mid",
  "duration": 8.5,
  "num_notes": 24,
  "note_density": 2.8,
  "onsets_detected": 28,
  "pitch_detected": 156,
  "parameters": {
    "hop_length": 512,
    "threshold_onset": 0.3,
    "min_note_duration": 0.1,
    "quantize_ms": 50,
    "use_crepe": true
  }
}
```

## 🎼 Esempio Output MIDI

Per un file audio di 8 secondi con melodia semplice, il MIDI generato potrebbe contenere:

```
Traccia: Piano (Program 0)
Tempo: 120 BPM

Note rilevate:
- C4 (Do centrale): 0.0s - 1.0s, velocity 85
- E4 (Mi): 1.0s - 2.0s, velocity 78
- G4 (Sol): 2.0s - 3.0s, velocity 82
- C5 (Do alto): 3.0s - 4.0s, velocity 90
- A4 (La): 4.5s - 5.5s, velocity 75
- F4 (Fa): 5.5s - 6.5s, velocity 80
- D4 (Re): 6.5s - 7.5s, velocity 77
- C4 (Do): 7.5s - 8.0s, velocity 85

Totale: 8 note, densità 1.0 note/s
```

## 🧪 Test

### 1. Test Rapido
```bash
# Genera audio di test
python generate_test_audio.py test.wav --duration 5

# Trascrivi
python transcribe_to_midi.py test.wav test.mid

# Verifica risultato
ls -la test.mid
```

### 2. Test Completo
```bash
# Test pipeline completa
python test_transcription.py
```

Questo script:
1. Genera audio di test (8 secondi)
2. Separa in 4 stem (drums, bass, other, vocals)
3. Trascrive ogni stem in MIDI
4. Testa parametri diversi
5. Fornisce statistiche complete

### 3. Test con Stem Esistenti
```bash
# Se hai già stem separati
python transcribe_to_midi.py drums.wav drums.mid --threshold-onset 0.5
python transcribe_to_midi.py bass.wav bass.mid --min-duration 0.2
python transcribe_to_midi.py melody.wav melody.mid --quantize 25
```

## ⚡ Performance

### Tempi di Elaborazione
- **Audio 5s**: ~2-3 secondi (con CREPE)
- **Audio 10s**: ~4-6 secondi
- **Audio 30s**: ~10-15 secondi

### Qualità vs Velocità
- **CREPE**: Qualità migliore, più lento
- **Librosa**: Più veloce, qualità buona
- **Hop length**: 512 (bilanciato), 1024 (veloce), 256 (preciso)

## 🎯 Ottimizzazione per Tipo di Audio

### Batteria
```bash
python transcribe_to_midi.py drums.wav drums.mid \
  --threshold-onset 0.5 \
  --quantize 100 \
  --min-duration 0.05
```

### Basso
```bash
python transcribe_to_midi.py bass.wav bass.mid \
  --threshold-onset 0.4 \
  --min-duration 0.2 \
  --quantize 50
```

### Melodia/Vocale
```bash
python transcribe_to_midi.py melody.wav melody.mid \
  --threshold-onset 0.3 \
  --min-duration 0.1 \
  --quantize 25
```

## 🐛 Troubleshooting

### Errore: "CREPE non disponibile"
```bash
pip install crepe tensorflow
# Oppure usa solo librosa (funziona comunque)
```

### Errore: "Nessuna nota rilevata"
- Riduci `--threshold-onset` (es. 0.1)
- Verifica che l'audio abbia contenuto musicale
- Controlla che il file non sia silenzioso

### Qualità trascrizione scarsa
- Installa CREPE per pitch detection migliore
- Riduci `--hop-length` per maggiore precisione
- Aumenta `--threshold-onset` per filtrare rumore

### MIDI non importabile in DAW
- Verifica che il file non sia vuoto
- Controlla che le note abbiano durata > 0
- Prova a quantizzare con `--quantize 50`

## 📈 Prossimi Sviluppi

- [ ] Supporto polyphonic detection
- [ ] Rilevamento accordi
- [ ] Quantizzazione ritmica intelligente
- [ ] Supporto multiple tracce MIDI
- [ ] Integrazione con API REST
- [ ] Batch processing
- [ ] Preview audio + MIDI sincronizzato





