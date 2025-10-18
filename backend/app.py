"""
MIDICOM Backend API Server
==========================

Server FastAPI per l'applicazione MIDICOM.
Gestisce separazione audio, trascrizione MIDI e servizi correlati.

Author: MIDICOM Team
Version: 1.0.0
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
import json
import asyncio
from typing import Optional
import logging
from datetime import datetime
from pathlib import Path
import mido

# Configurazione logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Inizializzazione app FastAPI
app = FastAPI(
    title="MIDICOM API",
    description="API per separazione audio e trascrizione MIDI",
    version="1.0.0",
    docs_url="/docs",  # Swagger UI disponibile su /docs
    redoc_url="/redoc"  # ReDoc disponibile su /redoc
)

# Configurazione CORS per permettere richieste dal frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://127.0.0.1:5173",
        "http://192.168.1.28:5173",  # IP di rete del frontend
        "http://192.168.56.1:5173"   # Altro IP di rete
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory per file temporanei
UPLOAD_DIR = "temp_uploads"
STEMS_DIR = "temp_stems"
MIDI_DIR = "temp_midi"
TEST_MIDI_DIR = "test_samples"  # Directory per file MIDI di test
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(STEMS_DIR, exist_ok=True)
os.makedirs(MIDI_DIR, exist_ok=True)
os.makedirs(TEST_MIDI_DIR, exist_ok=True)

def read_midi_file(file_path):
    """
    Legge un file MIDI e restituisce i dati in formato JSON.
    
    Args:
        file_path: Percorso del file MIDI
        
    Returns:
        dict: Dati MIDI in formato JSON con BPM e timing info
    """
    try:
        mid = mido.MidiFile(file_path)
        
        tracks = []
        total_duration = 0
        tempo = 500000  # Default tempo (microseconds per beat, 500000 = 120 BPM)
        
        # Extract tempo from first track (usually contains tempo meta messages)
        for track in mid.tracks:
            for msg in track:
                if msg.type == 'set_tempo':
                    tempo = msg.tempo
                    break
            if tempo != 500000:  # Found a tempo, break outer loop
                break
        
        # Calculate BPM from tempo (microseconds per beat)
        bpm = round(60_000_000 / tempo, 2)  # Convert microseconds to BPM
        logger.info(f"MIDI file BPM: {bpm}, ticks_per_beat: {mid.ticks_per_beat}")
        
        # Calculate seconds per tick for time conversion
        seconds_per_beat = 60.0 / bpm
        seconds_per_tick = seconds_per_beat / mid.ticks_per_beat
        
        for i, track in enumerate(mid.tracks):
            track_name = f"Track {i+1}"
            notes = []
            current_time_ticks = 0
            
            for msg in track:
                current_time_ticks += msg.time
                
                if msg.type == 'note_on' and msg.velocity > 0:
                    # Trova il note_off corrispondente
                    note_off_time_ticks = current_time_ticks
                    for j, next_msg in enumerate(track[track.index(msg)+1:], track.index(msg)+1):
                        if (next_msg.type == 'note_off' and next_msg.note == msg.note) or \
                           (next_msg.type == 'note_on' and next_msg.note == msg.note and next_msg.velocity == 0):
                            note_off_time_ticks += sum(m.time for m in track[track.index(msg)+1:j+1])
                            break
                    
                    duration_ticks = note_off_time_ticks - current_time_ticks
                    if duration_ticks > 0:
                        # Convert ticks to seconds
                        time_seconds = current_time_ticks * seconds_per_tick
                        duration_seconds = duration_ticks * seconds_per_tick
                        
                        # Log first note conversion for debugging
                        if len(notes) == 0:
                            logger.info(f"First note conversion: {current_time_ticks} ticks -> {time_seconds:.4f}s (seconds_per_tick={seconds_per_tick:.6f})")
                        
                        notes.append({
                            "midi": msg.note,
                            "time": time_seconds,
                            "duration": duration_seconds,
                            "velocity": msg.velocity
                        })
                
                # Cerca track name
                if msg.type == 'track_name':
                    track_name = msg.name
            
            if notes:  # Solo aggiungi track con note
                tracks.append({
                    "name": track_name,
                    "notes": notes
                })
                
                # Calcola durata totale
                for note in notes:
                    total_duration = max(total_duration, note["time"] + note["duration"])
        
        return {
            "duration": total_duration,
            "tracks": tracks,
            "bpm": bpm,
            "ticks_per_beat": mid.ticks_per_beat
        }
        
    except Exception as e:
        logger.error(f"Errore nella lettura del file MIDI {file_path}: {str(e)}")
        raise

@app.get("/")
async def root():
    """
    Endpoint root - informazioni base API
    """
    return {
        "message": "MIDICOM API Server",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/status")
async def get_status():
    """
    Endpoint di stato del server
    
    Returns:
        dict: Stato del server e informazioni di sistema
    """
    return {
        "status": "ok",
        "server": "MIDICOM API",
        "version": "1.0.0",
        "uptime": "running"
    }

@app.post("/upload-midi")
async def upload_midi_file(midi_file: UploadFile = File(...)):
    """
    Upload e salvataggio di un file MIDI dal frontend.
    
    Args:
        midi_file: File MIDI caricato dall'utente
        
    Returns:
        JSON con informazioni sul file caricato
    """
    try:
        # Verifica che sia un file MIDI
        if not midi_file.filename.lower().endswith('.mid'):
            raise HTTPException(status_code=400, detail="File deve essere un file MIDI (.mid)")
        
        # Crea directory se non esiste
        os.makedirs(TEST_MIDI_DIR, exist_ok=True)
        
        # Salva il file
        file_path = os.path.join(TEST_MIDI_DIR, midi_file.filename)
        with open(file_path, "wb") as buffer:
            content = await midi_file.read()
            buffer.write(content)
        
        logger.info(f"File MIDI caricato: {midi_file.filename} ({len(content)} bytes)")
        
        return JSONResponse({
            "status": "success",
            "filename": midi_file.filename,
            "size": len(content),
            "message": f"File MIDI '{midi_file.filename}' caricato con successo"
        })
        
    except Exception as e:
        logger.error(f"Errore durante l'upload del file MIDI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore durante l'upload: {str(e)}")

@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    separation_model: str = Form("htdemucs"),
    transcription_method: str = Form("librosa")
):
    """
    Endpoint per trascrizione audio in MIDI
    
    Args:
        file (UploadFile): File audio da trascrivere
        separation_model (str): Modello per separazione audio (htdemucs, mdxt, etc.)
        transcription_method (str): Metodo di trascrizione (librosa, crepe, etc.)
    
    Returns:
        dict: Risultato della trascrizione con file MIDI generato
    """
    try:
        # Validazione file
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nessun file selezionato")
        
        # Controllo estensione file
        allowed_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Formato file non supportato. Usa: {', '.join(allowed_extensions)}"
            )
        
        # Salvataggio file temporaneo
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"File ricevuto: {file.filename} ({len(content)} bytes)")
        
        # TODO: Implementare logica di trascrizione
        # 1. Separazione audio con Demucs
        # 2. Trascrizione MIDI con librosa/CREPE
        # 3. Generazione file MIDI
        
        # Per ora, simula il processing e crea file mock
        await asyncio.sleep(2)  # Simula processing time
        
        # Crea stems mock
        stems_data = {
            "drums": f"{STEMS_DIR}/drums_{file.filename}",
            "bass": f"{STEMS_DIR}/bass_{file.filename}",
            "other": f"{STEMS_DIR}/other_{file.filename}",
            "vocals": f"{STEMS_DIR}/vocals_{file.filename}"
        }
        
        # Crea MIDI mock
        midi_data = {
            "duration": 10.0,
            "tracks": [
                {
                    "name": "Piano",
                    "notes": [
                        {"midi": 60, "time": 0, "duration": 1, "velocity": 80},
                        {"midi": 64, "time": 1, "duration": 1, "velocity": 75},
                        {"midi": 67, "time": 2, "duration": 1, "velocity": 82},
                        {"midi": 72, "time": 3, "duration": 1, "velocity": 90}
                    ]
                }
            ]
        }
        
        # Salva stems info
        stems_file = os.path.join(STEMS_DIR, f"stems_{file.filename}.json")
        with open(stems_file, "w") as f:
            json.dump(stems_data, f)
        
        # Salva MIDI data
        midi_file = os.path.join(MIDI_DIR, f"midi_{file.filename}.json")
        with open(midi_file, "w") as f:
            json.dump(midi_data, f)
        
        return {
            "status": "success",
            "message": "File ricevuto e processato correttamente",
            "filename": file.filename,
            "size": len(content),
            "separation_model": separation_model,
            "transcription_method": transcription_method,
            "stems_file": stems_file,
            "midi_file": midi_file,
            "processing_time": 2.0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore durante trascrizione: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")

@app.get("/stems/{filename}")
async def get_stems(filename: str):
    """
    Endpoint per ottenere i stems separati
    
    Args:
        filename (str): Nome del file processato
    
    Returns:
        dict: Informazioni sui stems disponibili
    """
    try:
        stems_file = os.path.join(STEMS_DIR, f"stems_{filename}.json")
        
        if not os.path.exists(stems_file):
            raise HTTPException(status_code=404, detail="Stems non trovati per questo file")
        
        with open(stems_file, "r") as f:
            stems_data = json.load(f)
        
        return {
            "status": "success",
            "filename": filename,
            "stems": stems_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore nel recupero stems: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")

@app.get("/midi/{filename}")
async def get_midi(filename: str):
    """
    Endpoint per ottenere i dati MIDI trascritti
    Cerca prima nei file processati, poi nei file di test
    
    Args:
        filename (str): Nome del file processato o di test
    
    Returns:
        dict: Dati MIDI trascritti
    """
    try:
        # Prima cerca nei file processati
        midi_file = os.path.join(MIDI_DIR, f"midi_{filename}.json")
        
        if os.path.exists(midi_file):
            with open(midi_file, "r") as f:
                midi_data = json.load(f)
            
            return {
                "status": "success",
                "filename": filename,
                "midi_data": midi_data,
                "source": "processed"
            }
        
        # Se non trovato, cerca nei file di test
        test_midi_path = os.path.join(TEST_MIDI_DIR, filename)
        
        if os.path.exists(test_midi_path):
            try:
                # Leggi il file MIDI reale
                real_midi_data = read_midi_file(test_midi_path)
                logger.info(f"✅ MIDI file read successfully: {filename}")
                
                return {
                    "status": "success",
                    "filename": filename,
                    "midi_data": real_midi_data,
                    "source": "uploaded_file"
                }
            except Exception as e:
                logger.error(f"Errore nella lettura del file MIDI {filename}: {str(e)}")
                # Fallback a dati mock se la lettura fallisce
                mock_midi_data = {
                    "duration": 4.0,
                    "tracks": [
                        {
                            "name": "Piano",
                            "notes": [
                                {"midi": 60, "time": 0, "duration": 1, "velocity": 80},
                                {"midi": 64, "time": 1, "duration": 1, "velocity": 75},
                                {"midi": 67, "time": 2, "duration": 1, "velocity": 85},
                                {"midi": 72, "time": 3, "duration": 1, "velocity": 90}
                            ]
                        },
                        {
                            "name": "Bass",
                            "notes": [
                                {"midi": 36, "time": 0, "duration": 2, "velocity": 70},
                                {"midi": 40, "time": 2, "duration": 2, "velocity": 75}
                            ]
                        }
                    ]
                }
                
                return {
                    "status": "success",
                    "filename": filename,
                    "midi_data": mock_midi_data,
                    "source": "fallback_mock"
                }
        
        # Se non trovato da nessuna parte
        raise HTTPException(status_code=404, detail=f"MIDI file {filename} not found")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore nel recupero MIDI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")

@app.get("/download/{file_type}/{filename}")
async def download_file(file_type: str, filename: str):
    """
    Endpoint per scaricare file processati
    
    Args:
        file_type (str): Tipo di file ('stems' o 'midi')
        filename (str): Nome del file
    
    Returns:
        FileResponse: File da scaricare
    """
    try:
        if file_type == "stems":
            file_path = os.path.join(STEMS_DIR, f"stems_{filename}.json")
        elif file_type == "midi":
            file_path = os.path.join(MIDI_DIR, f"midi_{filename}.json")
        else:
            raise HTTPException(status_code=400, detail="Tipo file non supportato")
        
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File non trovato")
        
        return FileResponse(
            path=file_path,
            filename=f"{file_type}_{filename}",
            media_type="application/json"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Errore nel download: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")

@app.get("/health")
async def health_check():
    """
    Endpoint per health check del server
    
    Returns:
        dict: Stato di salute del server
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "services": {
            "api": "ok",
            "audio_processing": "pending",  # TODO: Verificare stato servizi
            "midi_generation": "pending"
        }
    }

# Handler per errori 404
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint non trovato", "path": str(request.url)}
    )

# Handler per errori 500
@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Errore interno: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Errore interno del server"}
    )

if __name__ == "__main__":
    """
    Avvio del server di sviluppo
    
    Comando per avviare:
    python backend/app.py
    
    Oppure con uvicorn direttamente:
    uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
    """
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Auto-reload durante sviluppo
        log_level="info"
    )
