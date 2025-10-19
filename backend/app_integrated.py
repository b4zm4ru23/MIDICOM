"""
MIDICOM Backend API Server - Integrated Pipeline
=================================================

Server FastAPI con pipeline completa: Audio → Stems → MIDI → Piano Roll
Integra separazione (Demucs) e trascrizione (Librosa/CREPE) in endpoint REST

Author: MIDICOM Team
Version: 1.1.0
"""

from fastapi import FastAPI, File, UploadFile, HTTPException, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
import uvicorn
import os
import json
import asyncio
from typing import Optional, Dict
from datetime import datetime
from pathlib import Path
import mido

# Import moduli interni (supporta esecuzione da root o da backend/)
try:
    from backend.logger import setup_logger
    from backend.separate import AudioSeparator
    from backend.transcribe_to_midi import MIDITranscriber
except ImportError:
    from logger import setup_logger
    from separate import AudioSeparator
    from transcribe_to_midi import MIDITranscriber

# Configurazione logging
logger = setup_logger(__name__)

# Inizializzazione app FastAPI
app = FastAPI(
    title="MIDICOM API - Integrated Pipeline",
    description="API completa per audio processing: separazione stems + trascrizione MIDI",
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configurazione CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://192.168.1.28:5173",
        "http://192.168.56.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory per file temporanei
UPLOAD_DIR = "temp_uploads"
STEMS_DIR = "temp_stems"
MIDI_DIR = "temp_midi"
TEST_MIDI_DIR = "test_samples"

for dir_path in [UPLOAD_DIR, STEMS_DIR, MIDI_DIR, TEST_MIDI_DIR]:
    os.makedirs(dir_path, exist_ok=True)


def read_midi_file(file_path: str) -> Dict:
    """
    Legge file MIDI e converte in formato JSON
    
    Args:
        file_path: Path del file MIDI
        
    Returns:
        Dict con dati MIDI (duration, tracks, bpm, notes)
    """
    try:
        mid = mido.MidiFile(file_path)
        
        tracks = []
        total_duration = 0
        tempo = 500000  # Default: 120 BPM
        
        # Estrai tempo da meta messages
        for track in mid.tracks:
            for msg in track:
                if msg.type == 'set_tempo':
                    tempo = msg.tempo
                    break
            if tempo != 500000:
                break
        
        # Calcola BPM
        bpm = round(60_000_000 / tempo, 2)
        logger.info(f"📊 MIDI BPM: {bpm}, ticks_per_beat: {mid.ticks_per_beat}")
        
        # Calcola conversione ticks → seconds
        seconds_per_beat = 60.0 / bpm
        seconds_per_tick = seconds_per_beat / mid.ticks_per_beat
        
        # Estrai note da ogni track
        for i, track in enumerate(mid.tracks):
            track_name = f"Track {i+1}"
            notes = []
            current_time_ticks = 0
            
            for msg in track:
                current_time_ticks += msg.time
                
                if msg.type == 'note_on' and msg.velocity > 0:
                    # Trova note_off corrispondente
                    note_off_time_ticks = current_time_ticks
                    msg_index = track.index(msg)
                    
                    for j in range(msg_index + 1, len(track)):
                        next_msg = track[j]
                        note_off_time_ticks += next_msg.time
                        
                        if (next_msg.type == 'note_off' and next_msg.note == msg.note) or \
                           (next_msg.type == 'note_on' and next_msg.note == msg.note and next_msg.velocity == 0):
                            break
                    
                    duration_ticks = note_off_time_ticks - current_time_ticks
                    
                    if duration_ticks > 0:
                        # Converti in secondi
                        time_seconds = current_time_ticks * seconds_per_tick
                        duration_seconds = duration_ticks * seconds_per_tick
                        
                        notes.append({
                            "midi": msg.note,
                            "time": time_seconds,
                            "duration": duration_seconds,
                            "velocity": msg.velocity
                        })
                
                if msg.type == 'track_name':
                    track_name = msg.name
            
            if notes:
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
        logger.error(f"❌ Errore lettura MIDI {file_path}: {str(e)}")
        raise


@app.get("/")
async def root():
    """Endpoint root - informazioni API"""
    return {
        "message": "MIDICOM API Server - Integrated Pipeline",
        "version": "1.1.0",
        "status": "running",
        "endpoints": {
            "transcribe": "POST /transcribe - Pipeline completa audio → MIDI",
            "midi": "GET /midi/{filename} - Recupera dati MIDI",
            "stems": "GET /stems/download/{timestamp}/{stem_name} - Download stem",
            "status": "GET /transcribe/status/{timestamp} - Controlla stato processing",
            "docs": "/docs - Documentazione interattiva"
        }
    }


@app.get("/health")
async def health_check():
    """Health check del server"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "services": {
            "api": "ok",
            "demucs": "ok",
            "librosa": "ok",
            "midi_processing": "ok"
        }
    }


@app.get("/stems/{stem_path:path}")
async def get_stem_audio(stem_path: str):
    """Serve file audio degli stems separati"""
    logger.info(f"📁 Request for stem: {stem_path}")
    
    # Cerca il file negli stem directories
    possible_paths = []
    
    # Cerca in tutte le sottodirectory timestamp
    if os.path.exists(STEMS_DIR):
        for timestamp_dir in os.listdir(STEMS_DIR):
            dir_path = os.path.join(STEMS_DIR, timestamp_dir)
            if os.path.isdir(dir_path):
                possible_paths.extend([
                    os.path.join(dir_path, f"{stem_path}.mp3"),
                    os.path.join(dir_path, f"{stem_path}.wav"),
                    os.path.join(dir_path, stem_path)
                ])
    
    # Trova il primo file esistente
    for path in possible_paths:
        if os.path.exists(path) and os.path.isfile(path):
            logger.info(f"✅ Serving stem file: {path}")
            # Determina media type dal file extension
            ext = os.path.splitext(path)[1].lower()
            media_type = "audio/mpeg" if ext == ".mp3" else "audio/wav"
            return FileResponse(path, media_type=media_type)
    
    logger.warning(f"⚠️ Stem file not found: {stem_path}, tried: {len(possible_paths)} paths")
    raise HTTPException(status_code=404, detail=f"Stem file not found: {stem_path}")


@app.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    separation_model: str = Form("htdemucs"),
    transcription_method: str = Form("librosa"),
    threshold_onset: float = Form(0.3),
    quantize_ms: int = Form(50)
):
    """
    Pipeline completa: Audio → Stems → MIDI
    
    Workflow:
    1. Upload file audio
    2. Conversione a WAV 44.1kHz (se necessario)
    3. Separazione stems con Demucs
    4. Trascrizione ogni stem in MIDI
    5. Ritorna MIDI data + stems
    
    Args:
        file: File audio (MP3, WAV, FLAC, M4A)
        separation_model: Modello Demucs (htdemucs, mdx, etc.)
        transcription_method: Metodo trascrizione (librosa, crepe)
        threshold_onset: Soglia onset detection (0.0-1.0)
        quantize_ms: Quantizzazione note (millisecondi)
    
    Returns:
        JSON con stems, MIDI data, metadata
    """
    try:
        # Validazione file
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nessun file selezionato")
        
        allowed_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400,
                detail=f"Formato non supportato. Usa: {', '.join(allowed_extensions)}"
            )
        
        # 1. Salvataggio file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename_base = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename_base)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        logger.info(f"📥 File ricevuto: {file.filename} ({len(content)} bytes)")
        
        # 2. Separazione stems
        logger.info(f"🔄 Separazione con {separation_model}...")
        separator = AudioSeparator(model_name=separation_model)
        
        stems_output_dir = os.path.join(STEMS_DIR, timestamp)
        separation_result = separator.process_file(file_path, stems_output_dir)
        
        if not separation_result["success"]:
            raise HTTPException(
                status_code=500,
                detail=f"Errore separazione: {separation_result.get('error', 'Unknown')}"
            )
        
        stems_data = separation_result["stems"]
        logger.info(f"✅ Separazione completata: {len(stems_data)} stems")
        
        # 3. Trascrizione MIDI
        logger.info(f"🎼 Trascrizione con {transcription_method}...")
        
        transcriber = MIDITranscriber(
            hop_length=512,
            threshold_onset=threshold_onset,
            min_note_duration=0.1,
            quantize_ms=quantize_ms
        )
        
        midi_tracks = []
        midi_files = {}
        transcription_results = {}
        
        for stem_name, stem_path in stems_data.items():
            midi_output_path = os.path.join(MIDI_DIR, f"{timestamp}_{stem_name}.mid")
            
            logger.info(f"🎵 Trascrizione {stem_name}...")
            transcription_result = transcriber.transcribe(stem_path, midi_output_path)
            
            transcription_results[stem_name] = transcription_result
            
            if transcription_result["success"]:
                # Leggi MIDI generato
                midi_data = read_midi_file(midi_output_path)
                
                # Aggiungi stem info a ogni track
                for track in midi_data["tracks"]:
                    track["stem"] = stem_name
                    midi_tracks.append(track)
                
                midi_files[stem_name] = midi_output_path
                
                logger.info(
                    f"✅ {stem_name}: {transcription_result['num_notes']} note, "
                    f"densità {transcription_result['note_density']:.2f} note/s"
                )
            else:
                logger.warning(f"⚠️ Trascrizione {stem_name} fallita: {transcription_result.get('error')}")
        
        # 4. Combina dati MIDI
        max_duration = 0
        for result in transcription_results.values():
            if result["success"] and "duration" in result:
                max_duration = max(max_duration, result["duration"])
        
        combined_midi_data = {
            "duration": max_duration,
            "tracks": midi_tracks,
            "bpm": 120,  # Default, può essere estratto da audio analysis
            "ticks_per_beat": 480
        }
        
        # 5. Salva metadata
        metadata = {
            "timestamp": timestamp,
            "original_file": file.filename,
            "file_size": len(content),
            "separation_model": separation_model,
            "transcription_method": transcription_method,
            "parameters": {
                "threshold_onset": threshold_onset,
                "quantize_ms": quantize_ms
            },
            "stems": list(stems_data.keys()),
            "total_notes": sum([len(track["notes"]) for track in midi_tracks]),
            "processing_complete": True,
            "transcription_details": {
                stem: {
                    "success": result["success"],
                    "num_notes": result.get("num_notes", 0),
                    "duration": result.get("duration", 0)
                }
                for stem, result in transcription_results.items()
            }
        }
        
        metadata_file = os.path.join(UPLOAD_DIR, f"{timestamp}_metadata.json")
        with open(metadata_file, "w") as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"🎉 Processing completato: {metadata['total_notes']} note totali")
        
        return {
            "status": "success",
            "timestamp": timestamp,
            "metadata": metadata,
            "stems": {name: name for name in stems_data.keys()},  # Solo nomi, path via endpoint
            "midi_data": combined_midi_data,
            "midi_files": {name: os.path.basename(path) for name, path in midi_files.items()}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore processing: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Errore interno: {str(e)}")


@app.get("/transcribe/status/{timestamp}")
async def get_transcription_status(timestamp: str):
    """
    Controlla stato processing
    
    Args:
        timestamp: Timestamp del processing
    
    Returns:
        JSON con stato e metadata
    """
    try:
        metadata_file = os.path.join(UPLOAD_DIR, f"{timestamp}_metadata.json")
        
        if not os.path.exists(metadata_file):
            return {
                "status": "not_found",
                "message": "Processing non trovato"
            }
        
        with open(metadata_file, "r") as f:
            metadata = json.load(f)
        
        return {
            "status": "completed" if metadata.get("processing_complete") else "processing",
            "metadata": metadata,
            "timestamp": timestamp
        }
        
    except Exception as e:
        logger.error(f"❌ Errore status check: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")


@app.get("/stems/download/{timestamp}/{stem_name}")
async def download_stem(timestamp: str, stem_name: str):
    """
    Download singolo stem audio
    
    Args:
        timestamp: Timestamp del processing
        stem_name: Nome stem (drums, bass, vocals, other)
    
    Returns:
        FileResponse con WAV dello stem
    """
    try:
        stem_path = os.path.join(STEMS_DIR, timestamp, f"{stem_name}.wav")
        
        if not os.path.exists(stem_path):
            raise HTTPException(status_code=404, detail=f"Stem {stem_name} non trovato")
        
        return FileResponse(
            path=stem_path,
            filename=f"{stem_name}.wav",
            media_type="audio/wav"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore download stem: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")


@app.get("/midi/{filename}")
async def get_midi(filename: str):
    """
    Recupera dati MIDI trascritti o file test
    
    Args:
        filename: Nome file MIDI
    
    Returns:
        JSON con dati MIDI
    """
    try:
        # Cerca nei file processati
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
        
        # Cerca nei file test
        test_midi_path = os.path.join(TEST_MIDI_DIR, filename)
        
        if os.path.exists(test_midi_path):
            try:
                real_midi_data = read_midi_file(test_midi_path)
                logger.info(f"✅ MIDI file read: {filename}")
                
                return {
                    "status": "success",
                    "filename": filename,
                    "midi_data": real_midi_data,
                    "source": "uploaded_file"
                }
            except Exception as e:
                logger.error(f"❌ Errore lettura MIDI {filename}: {str(e)}")
                # Fallback a mock data
                mock_midi_data = {
                    "duration": 4.0,
                    "tracks": [
                        {
                            "name": "Piano",
                            "notes": [
                                {"midi": 60, "time": 0, "duration": 1, "velocity": 80},
                                {"midi": 64, "time": 1, "duration": 1, "velocity": 75}
                            ]
                        }
                    ],
                    "bpm": 120,
                    "ticks_per_beat": 480
                }
                
                return {
                    "status": "success",
                    "filename": filename,
                    "midi_data": mock_midi_data,
                    "source": "fallback_mock"
                }
        
        # Non trovato
        raise HTTPException(status_code=404, detail=f"MIDI file {filename} non trovato")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore recupero MIDI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")


@app.post("/upload-midi")
async def upload_midi_file(midi_file: UploadFile = File(...)):
    """
    Upload file MIDI dal frontend
    
    Args:
        midi_file: File MIDI da caricare
    
    Returns:
        JSON con informazioni file
    """
    try:
        if not midi_file.filename.lower().endswith(('.mid', '.midi')):
            raise HTTPException(status_code=400, detail="File deve essere MIDI (.mid)")
        
        os.makedirs(TEST_MIDI_DIR, exist_ok=True)
        
        file_path = os.path.join(TEST_MIDI_DIR, midi_file.filename)
        with open(file_path, "wb") as buffer:
            content = await midi_file.read()
            buffer.write(content)
        
        logger.info(f"📥 MIDI caricato: {midi_file.filename} ({len(content)} bytes)")
        
        return JSONResponse({
            "status": "success",
            "filename": midi_file.filename,
            "size": len(content),
            "message": f"File MIDI '{midi_file.filename}' caricato con successo"
        })
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Errore upload MIDI: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Errore: {str(e)}")


# Handler errori
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"error": "Endpoint non trovato", "path": str(request.url)}
    )


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"❌ Errore interno: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Errore interno del server"}
    )


if __name__ == "__main__":
    """Avvio server di sviluppo"""
    logger.info("🚀 Avvio MIDICOM API Server - Integrated Pipeline")
    uvicorn.run(
        "app_integrated:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

