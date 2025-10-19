#!/usr/bin/env python3
"""
MIDICOM Audio Separator
Script per separare file audio in stem usando Demucs
"""

import os
import sys
import json
import argparse
import subprocess
import tempfile
from pathlib import Path
from typing import Dict, List, Optional
import time

# Import logger centralizzato
from logger import setup_logger

# Configurazione logging
logger = setup_logger(__name__)

class AudioSeparator:
    """Classe per separazione audio con Demucs"""
    
    def __init__(self, model_name: str = "htdemucs"):
        self.model_name = model_name
        self.temp_dir = None
        
    def check_dependencies(self) -> bool:
        """Verifica che tutte le dipendenze siano installate"""
        try:
            import demucs
            import librosa
            import soundfile
            logger.info("✅ Dipendenze Python verificate")
            return True
        except ImportError as e:
            logger.error(f"❌ Dipendenza mancante: {e}")
            logger.error("Installa con: pip install demucs librosa soundfile")
            return False
    
    def check_ffmpeg(self) -> bool:
        """Verifica che ffmpeg sia installato"""
        try:
            subprocess.run(['ffmpeg', '-version'], 
                         capture_output=True, check=True)
            logger.info("✅ FFmpeg trovato")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.error("❌ FFmpeg non trovato")
            logger.error("Installa FFmpeg da: https://ffmpeg.org/download.html")
            return False
    
    def convert_to_wav(self, input_path: str, output_path: str) -> bool:
        """Converte file audio in WAV 44100 Hz"""
        try:
            cmd = [
                'ffmpeg', '-i', input_path,
                '-ar', '44100',  # Sample rate
                '-ac', '2',      # Stereo
                '-y',            # Overwrite
                output_path
            ]
            
            logger.info(f"🔄 Conversione in corso: {input_path} -> {output_path}")
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                logger.info("✅ Conversione completata")
                return True
            else:
                logger.error(f"❌ Errore conversione: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Errore durante conversione: {e}")
            return False
    
    def get_audio_duration(self, file_path: str) -> float:
        """Ottiene durata file audio in secondi using librosa
        
        Args:
            file_path: Path al file audio
            
        Returns:
            float: Durata in secondi, 0.0 se errore
        """
        try:
            import librosa
            # Note: path parameter replaces deprecated filename in librosa 0.10.0+
            duration = librosa.get_duration(path=file_path)
            return duration
        except Exception as e:
            logger.warning(f"⚠️ Impossibile ottenere durata: {e}")
            return 0.0
    
    def separate_audio(self, input_path: str, output_dir: str) -> Dict:
        """Separa audio in stem usando Demucs (Deep Music Source Separation)
        
        Algoritmo Demucs:
        1. Usa CNN encoder-decoder per separare frequenze
        2. Applica U-Net architecture per preservare dettagli
        3. Usa shift augmentation per migliorare robustezza
        4. Separa in 4 stem: drums, bass, other, vocals
        
        Parametri:
        - shifts: numero di shift temporali per ensemble
        - split: split automatico per file lunghi
        """
        try:
            # Crea directory output se non esiste
            os.makedirs(output_dir, exist_ok=True)
            
            # Stima tempo (approssimativo: ~1x realtime per htdemucs)
            duration = self.get_audio_duration(input_path)
            estimated_time = duration * 1.2  # 20% buffer
            
            logger.info(f"🎵 Inizio separazione: {input_path}")
            logger.info(f"⏱️ Durata file: {duration:.1f}s")
            logger.info(f"⏱️ Tempo stimato: {estimated_time:.1f}s")
            logger.info(f"📁 Output: {output_dir}")
            
            start_time = time.time()
            
            # Usa Demucs CLI (Demucs 4.0+)
            # Crea directory temporanea per output demucs
            temp_output = tempfile.mkdtemp()
            
            cmd = [
                sys.executable,  # Usa Python corrente
                '-m', 'demucs',
                '--two-stems=vocals',  # Separa vocals da resto (più veloce per test)
                '-n', self.model_name,
                '-o', temp_output,
                '--mp3',  # Usa MP3 per evitare problemi torchcodec
                input_path
            ]
            
            logger.info(f"🔄 Esecuzione Demucs CLI...")
            logger.debug(f"Command: {' '.join(cmd)}")
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            logger.debug(f"Demucs stdout: {result.stdout}")
            logger.debug(f"Demucs stderr: {result.stderr}")
            logger.debug(f"Return code: {result.returncode}")
            
            if result.returncode != 0:
                error_msg = result.stderr or result.stdout or "Unknown error"
                logger.error(f"❌ Errore Demucs CLI: {error_msg}")
                return {
                    "success": False,
                    "error": f"Demucs failed: {error_msg}",
                    "duration": duration
                }
            
            # Demucs crea una sottocartella con il nome del modello e il nome del file
            # Struttura: temp_output/model_name/input_filename/stem.mp3
            import glob
            
            # Trova tutti i file MP3 generati
            stem_files = glob.glob(os.path.join(temp_output, self.model_name, "**", "*.mp3"), recursive=True)
            
            if not stem_files:
                logger.error(f"❌ Nessun file generato in {temp_output}")
                logger.debug(f"Directory structure: {os.listdir(temp_output)}")
                return {
                    "success": False,
                    "error": "No output files generated by Demucs",
                    "duration": duration
                }
            
            # Sposta i file separati
            stem_paths = {}
            import shutil
            for source_file in stem_files:
                stem_name = Path(source_file).stem  # Nome senza estensione
                dest_file = os.path.join(output_dir, f"{stem_name}.mp3")
                shutil.copy2(source_file, dest_file)
                stem_paths[stem_name] = dest_file
                logger.info(f"✅ Salvato: {stem_name}.mp3")
            
            # Cleanup temp directory
            import shutil
            shutil.rmtree(temp_output, ignore_errors=True)
            
            elapsed_time = time.time() - start_time
            logger.info(f"🎉 Separazione completata in {elapsed_time:.1f}s")
            
            return {
                "success": True,
                "stems": stem_paths,
                "duration": duration,
                "processing_time": elapsed_time,
                "model": self.model_name
            }
            
        except subprocess.TimeoutExpired:
            logger.error("❌ Timeout Demucs (>5min)")
            return {
                "success": False,
                "error": "Demucs timeout",
                "duration": duration
            }
        except Exception as e:
            logger.error(f"❌ Errore durante separazione: {e}")
            return {
                "success": False,
                "error": str(e),
                "duration": self.get_audio_duration(input_path)
            }
    
    def process_file(self, input_path: str, output_dir: str) -> Dict:
        """Processa file audio completo"""
        logger.info(f"🚀 Avvio processamento: {input_path}")
        
        # Verifica dipendenze
        if not self.check_dependencies():
            return {"success": False, "error": "Dipendenze mancanti"}
        
        if not self.check_ffmpeg():
            return {"success": False, "error": "FFmpeg non trovato"}
        
        # Verifica file input
        if not os.path.exists(input_path):
            return {"success": False, "error": f"File non trovato: {input_path}"}
        
        # Crea directory temporanea
        self.temp_dir = tempfile.mkdtemp()
        
        try:
            # Determina se serve conversione
            input_ext = Path(input_path).suffix.lower()
            if input_ext != '.wav':
                # Converte in WAV
                temp_wav = os.path.join(self.temp_dir, "temp.wav")
                if not self.convert_to_wav(input_path, temp_wav):
                    return {"success": False, "error": "Errore conversione"}
                input_path = temp_wav
            
            # Separazione
            result = self.separate_audio(input_path, output_dir)
            return result
            
        finally:
            # Cleanup directory temporanea
            if self.temp_dir and os.path.exists(self.temp_dir):
                import shutil
                shutil.rmtree(self.temp_dir)

def main():
    """Funzione principale"""
    parser = argparse.ArgumentParser(
        description="Separazione audio in stem con Demucs",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi di utilizzo:
  python separate.py input.mp3 output/
  python separate.py input.wav output/ --model htdemucs
  python separate.py input.flac output/ --verbose

Modelli disponibili:
  - htdemucs (default): Alta qualità, più lento
  - htdemucs_ft: Fine-tuned, migliore per alcuni generi
  - mdx: Più veloce, qualità leggermente inferiore
        """
    )
    
    parser.add_argument("input", help="Path file audio input")
    parser.add_argument("output", help="Directory output per stem")
    parser.add_argument("--model", default="htdemucs", 
                       help="Modello Demucs da usare (default: htdemucs)")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="Output verboso")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Crea separatore
    separator = AudioSeparator(model_name=args.model)
    
    # Processa file
    result = separator.process_file(args.input, args.output)
    
    # Output JSON
    print("\n" + "="*50)
    print("RISULTATO SEPARAZIONE")
    print("="*50)
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # Exit code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()