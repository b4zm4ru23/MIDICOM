# Script di Test MIDICOM

Questa cartella contiene gli script di test per il progetto MIDICOM.

## File

- `test_transcription.py` - Test completo della pipeline: separazione audio → trascrizione MIDI
- `generate_test_audio.py` - Generatore di audio sintetico per test

## Utilizzo

```bash
# Dalla directory scripts/test/
cd scripts/test

# Test completo pipeline
python test_transcription.py

# Genera audio di test
python generate_test_audio.py test_audio.wav --duration 10
```

## Note

- Gli script fanno riferimento ai moduli backend tramite path relativi
- Assicurati di essere nella directory `scripts/test/` prima di eseguire
- I file di output vengono creati nella directory corrente
