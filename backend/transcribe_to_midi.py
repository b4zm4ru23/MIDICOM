#!/usr/bin/env python3
"""
MIDICOM MIDI Transcriber
Script per trascrivere audio in MIDI usando onset detection + pitch detection
"""

import os
import sys
import argparse
import numpy as np
import librosa
import pretty_midi
from pathlib import Path
from typing import List, Tuple, Dict, Optional

# Import logger centralizzato
from backend.logger import setup_logger

# Configurazione logging
logger = setup_logger(__name__)

class MIDITranscriber:
    """Classe per trascrizione audio -> MIDI"""
    
    def __init__(self, 
                 hop_length: int = 512,
                 threshold_onset: float = 0.3,
                 min_note_duration: float = 0.1,
                 quantize_ms: int = 50):
        self.hop_length = hop_length
        self.threshold_onset = threshold_onset
        self.min_note_duration = min_note_duration
        self.quantize_ms = quantize_ms
        self.sample_rate = 22050  # Sample rate per analisi
        
    def check_dependencies(self) -> bool:
        """Verifica dipendenze"""
        try:
            import librosa
            import pretty_midi
            import numpy as np
            logger.info("✅ Dipendenze base verificate")
            
            # Prova a importare crepe (opzionale)
            try:
                import crepe
                logger.info("✅ CREPE disponibile per pitch detection avanzata")
                self.use_crepe = True
            except ImportError:
                logger.warning("⚠️ CREPE non disponibile, usando librosa per pitch detection")
                self.use_crepe = False
                
            return True
        except ImportError as e:
            logger.error(f"❌ Dipendenza mancante: {e}")
            return False
    
    def load_audio(self, file_path: str) -> Tuple[np.ndarray, int]:
        """Carica e preprocessa audio per analisi
        
        Args:
            file_path: Path del file audio
            
        Returns:
            Tuple[audio_data, sample_rate]: Audio mono e sample rate
        """
        logger.info(f"🎵 Caricamento audio: {file_path}")
        
        # Carica audio mono a sample rate standardizzato
        audio_data, sample_rate = librosa.load(file_path, sr=self.sample_rate, mono=True)
        
        logger.info(f"📊 Audio caricato: {len(audio_data)/sample_rate:.1f}s, {sample_rate}Hz")
        return audio_data, sample_rate
    
    def detect_onsets(self, y: np.ndarray, sr: int) -> np.ndarray:
        """Rileva onset delle note usando spectral flux analysis
        
        Algoritmo:
        1. Calcola spectral flux (differenza energia tra frame consecutivi)
        2. Applica threshold per filtrare rumore
        3. Rileva picchi significativi come onset
        4. Converte frame indices in timestamp
        """
        logger.info("🔍 Rilevamento onset...")
        
        # Onset detection con multiple features (spectral flux, energy, etc.)
        onset_frames = librosa.onset.onset_detect(
            y=y,
            sr=sr,
            hop_length=self.hop_length,
            threshold=self.threshold_onset,
            units='frames'
        )
        
        # Converti frame indices in secondi usando hop_length
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=self.hop_length)
        
        logger.info(f"✅ Trovati {len(onset_times)} onset")
        return onset_times
    
    def detect_pitch_crepe(self, y: np.ndarray, sr: int) -> Tuple[np.ndarray, np.ndarray]:
        """Pitch detection con CREPE (Convolutional Representation for Pitch Estimation)
        
        Algoritmo:
        1. Resample audio a 16kHz (requisito CREPE)
        2. Applica CNN pre-trained per pitch estimation
        3. Usa Viterbi algorithm per smoothing temporale
        4. Filtra risultati per confidence > 0.3
        
        CREPE è più accurato di librosa per pitch detection complessi
        """
        if not self.use_crepe:
            return self.detect_pitch_librosa(y, sr)
        
        logger.info("🎯 Pitch detection con CREPE...")
        
        import crepe
        
        # CREPE richiede audio a 16kHz per compatibilità con modello pre-trained
        y_16k = librosa.resample(y, orig_sr=sr, target_sr=16000)
        
        # Pitch detection con CNN + Viterbi smoothing
        time, frequency, confidence, activation = crepe.predict(
            y_16k, 16000, model_capacity='full', viterbi=True
        )
        
        # Filtra per confidence threshold (0.3 = 30% confidence)
        valid_mask = confidence > 0.3
        time = time[valid_mask]
        frequency = frequency[valid_mask]
        confidence = confidence[valid_mask]
        
        logger.info(f"✅ Pitch detection completata: {len(frequency)} note rilevate")
        return time, frequency
    
    def detect_pitch_librosa(self, audio_data: np.ndarray, sample_rate: int) -> Tuple[np.ndarray, np.ndarray]:
        """Pitch detection con librosa (fallback quando CREPE non disponibile)
        
        Algoritmo:
        1. Usa piptrack per pitch tracking
        2. Trova pitch dominanti per ogni frame
        3. Filtra pitch validi (threshold > 0)
        """
        logger.info("🎯 Pitch detection con librosa...")
        
        # Estrai pitch con librosa piptrack
        pitches, magnitudes = librosa.piptrack(
            y=audio_data,
            sr=sample_rate,
            hop_length=self.hop_length,
            threshold=0.1
        )
        
        # Trova pitch dominanti per ogni frame
        times = librosa.frames_to_time(np.arange(pitches.shape[1]), sr=sample_rate, hop_length=self.hop_length)
        frequencies = []
        valid_times = []
        
        for frame_idx in range(pitches.shape[1]):
            # Trova pitch con magnitudine massima
            max_magnitude_idx = magnitudes[:, frame_idx].argmax()
            pitch_frequency = pitches[max_magnitude_idx, frame_idx]
            
            if pitch_frequency > 0:  # Pitch valido
                frequencies.append(pitch_frequency)
                valid_times.append(times[frame_idx])
        
        frequencies = np.array(frequencies)
        valid_times = np.array(valid_times)
        
        logger.info(f"✅ Pitch detection completata: {len(frequencies)} note rilevate")
        return valid_times, frequencies
    
    def group_notes(self, onset_times: np.ndarray, pitch_times: np.ndarray, 
                   frequencies: np.ndarray) -> List[Dict]:
        """Raggruppa onset e pitch in note complete usando temporal matching
        
        Algoritmo:
        1. Per ogni onset, trova il pitch più vicino temporalmente
        2. Verifica che pitch sia entro 0.2s dall'onset
        3. Stima durata nota fino al prossimo onset
        4. Calcola velocity basata su frequenza e intensità
        5. Filtra note con durata minima
        """
        logger.info("🎼 Raggruppamento note...")
        
        notes = []
        
        for onset_time in onset_times:
            # Trova pitch più vicino temporalmente all'onset
            time_diff = np.abs(pitch_times - onset_time)
            closest_idx = np.argmin(time_diff)
            
            # Verifica che il pitch sia abbastanza vicino (entro 0.2s)
            if time_diff[closest_idx] < 0.2:
                frequency = frequencies[closest_idx]
                
                # Converti frequenza in MIDI note number (A4 = 440Hz = MIDI 69)
                midi_note = self.freq_to_midi(frequency)
                
                # Stima durata nota (fino al prossimo onset o fine)
                next_onset_idx = np.searchsorted(onset_times, onset_time + 0.1)
                if next_onset_idx < len(onset_times):
                    end_time = onset_times[next_onset_idx] - 0.05  # Piccolo gap tra note
                else:
                    end_time = onset_time + 1.0  # Durata default per ultima nota
                
                # Verifica durata minima per evitare note troppo brevi
                duration = end_time - onset_time
                if duration >= self.min_note_duration:
                    # Stima velocity basata su frequenza e intensità
                    velocity = self.estimate_velocity(frequency, onset_time)
                    
                    note = {
                        'start': onset_time,
                        'end': end_time,
                        'pitch': int(midi_note),
                        'velocity': velocity,
                        'frequency': frequency
                    }
                    notes.append(note)
        
        logger.info(f"✅ Raggruppate {len(notes)} note")
        return notes
    
    def freq_to_midi(self, frequency: float) -> float:
        """Converte frequenza in MIDI note number usando formula logaritmica
        
        Formula: MIDI = 12 * log2(freq / 440) + 69
        - 440 Hz = A4 = MIDI 69 (standard internazionale)
        - Ogni ottava = 12 semitoni
        - log2 per conversione lineare in scala logaritmica
        """
        if frequency <= 0:
            return 0
        return 12 * np.log2(frequency / 440.0) + 69
    
    def estimate_velocity(self, frequency: float, time: float) -> int:
        """Stima velocity MIDI basata su frequenza e timing
        
        Algoritmo:
        1. Velocity base = 80 (mezzo-forte)
        2. Fattore frequenza: note alte = velocity maggiore (range 0.5-1.5)
        3. Fattore timing: note in battere = velocity maggiore (futuro)
        4. Clamp risultato tra 1-127 (range MIDI standard)
        """
        # Velocity base (mezzo-forte)
        base_velocity = 80
        
        # Modifica basata su frequenza (note alte = velocity maggiore)
        freq_factor = min(1.5, max(0.5, frequency / 440.0))
        
        # Modifica basata su timing (note in battere = velocity maggiore)
        beat_factor = 1.0  # Semplificato per ora
        
        velocity = int(base_velocity * freq_factor * beat_factor)
        return max(1, min(127, velocity))  # Clamp MIDI range
    
    def quantize_notes(self, notes: List[Dict]) -> List[Dict]:
        """Quantizza timing delle note per allineamento alla griglia
        
        Algoritmo:
        1. Converte quantize_ms in secondi
        2. Arrotonda start/end time al più vicino intervallo
        3. Verifica durata minima dopo quantizzazione
        4. Mantiene timing perfetto per DAW compatibility
        """
        if self.quantize_ms <= 0:
            return notes
        
        quantize_interval = self.quantize_ms / 1000.0  # Converti in secondi
        
        logger.info(f"🎯 Quantizzazione a {self.quantize_ms}ms...")
        
        for note in notes:
            # Quantizza start time al più vicino intervallo
            note['start'] = round(note['start'] / quantize_interval) * quantize_interval
            
            # Quantizza end time al più vicino intervallo
            note['end'] = round(note['end'] / quantize_interval) * quantize_interval
            
            # Verifica durata minima dopo quantizzazione
            if note['end'] - note['start'] < self.min_note_duration:
                note['end'] = note['start'] + self.min_note_duration
        
        logger.info("✅ Quantizzazione completata")
        return notes
    
    def create_midi(self, notes: List[Dict], output_path: str, tempo: float = 120.0):
        """Crea file MIDI"""
        logger.info(f"🎼 Creazione MIDI: {output_path}")
        
        # Crea oggetto MIDI
        midi = pretty_midi.PrettyMIDI()
        
        # Crea traccia
        instrument = pretty_midi.Instrument(program=0)  # Piano
        
        # Aggiungi note
        for note_data in notes:
            note = pretty_midi.Note(
                velocity=note['velocity'],
                pitch=note['pitch'],
                start=note['start'],
                end=note['end']
            )
            instrument.notes.append(note)
        
        # Aggiungi traccia al MIDI
        midi.instruments.append(instrument)
        
        # Salva file
        midi.write(output_path)
        
        logger.info(f"✅ MIDI salvato: {output_path}")
        logger.info(f"📊 Note totali: {len(notes)}")
        
        return len(notes)
    
    def transcribe(self, input_path: str, output_path: str) -> Dict:
        """Trascrizione completa audio -> MIDI"""
        logger.info(f"🚀 Avvio trascrizione: {input_path}")
        
        # Verifica dipendenze
        if not self.check_dependencies():
            return {"success": False, "error": "Dipendenze mancanti"}
        
        # Verifica file input
        if not os.path.exists(input_path):
            return {"success": False, "error": f"File non trovato: {input_path}"}
        
        try:
            # Carica audio
            y, sr = self.load_audio(input_path)
            
            # Rileva onset
            onset_times = self.detect_onsets(y, sr)
            
            # Rileva pitch
            if self.use_crepe:
                pitch_times, frequencies = self.detect_pitch_crepe(y, sr)
            else:
                pitch_times, frequencies = self.detect_pitch_librosa(y, sr)
            
            # Raggruppa in note
            notes = self.group_notes(onset_times, pitch_times, frequencies)
            
            if not notes:
                return {"success": False, "error": "Nessuna nota rilevata"}
            
            # Quantizza
            notes = self.quantize_notes(notes)
            
            # Crea MIDI
            num_notes = self.create_midi(notes, output_path)
            
            # Statistiche
            duration = len(y) / sr
            note_density = num_notes / duration
            
            return {
                "success": True,
                "input_file": input_path,
                "output_file": output_path,
                "duration": duration,
                "num_notes": num_notes,
                "note_density": note_density,
                "onsets_detected": len(onset_times),
                "pitch_detected": len(frequencies),
                "parameters": {
                    "hop_length": self.hop_length,
                    "threshold_onset": self.threshold_onset,
                    "min_note_duration": self.min_note_duration,
                    "quantize_ms": self.quantize_ms,
                    "use_crepe": self.use_crepe
                }
            }
            
        except Exception as e:
            logger.error(f"❌ Errore durante trascrizione: {e}")
            return {"success": False, "error": str(e)}

def main():
    """Funzione principale"""
    parser = argparse.ArgumentParser(
        description="Trascrizione audio in MIDI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi di utilizzo:
  python transcribe_to_midi.py input.wav output.mid
  python transcribe_to_midi.py input.wav output.mid --threshold-onset 0.5
  python transcribe_to_midi.py input.wav output.mid --quantize 100 --min-duration 0.2

Parametri:
  --hop-length: Dimensione hop per analisi (default: 512)
  --threshold-onset: Soglia per rilevamento onset (default: 0.3)
  --min-duration: Durata minima nota in secondi (default: 0.1)
  --quantize: Quantizzazione in millisecondi (default: 50)
        """
    )
    
    parser.add_argument("input", help="File audio input (WAV)")
    parser.add_argument("output", help="File MIDI output")
    parser.add_argument("--hop-length", type=int, default=512,
                       help="Hop length per analisi (default: 512)")
    parser.add_argument("--threshold-onset", type=float, default=0.3,
                       help="Soglia onset detection (default: 0.3)")
    parser.add_argument("--min-duration", type=float, default=0.1,
                       help="Durata minima nota in secondi (default: 0.1)")
    parser.add_argument("--quantize", type=int, default=50,
                       help="Quantizzazione in millisecondi (default: 50)")
    parser.add_argument("--verbose", "-v", action="store_true",
                       help="Output verboso")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Crea trascrittore
    transcriber = MIDITranscriber(
        hop_length=args.hop_length,
        threshold_onset=args.threshold_onset,
        min_note_duration=args.min_duration,
        quantize_ms=args.quantize
    )
    
    # Trascrizione
    result = transcriber.transcribe(args.input, args.output)
    
    # Output JSON
    print("\n" + "="*50)
    print("RISULTATO TRASCRIZIONE")
    print("="*50)
    print(f"Successo: {result['success']}")
    if result['success']:
        print(f"File input: {result['input_file']}")
        print(f"File output: {result['output_file']}")
        print(f"Durata: {result['duration']:.1f}s")
        print(f"Note rilevate: {result['num_notes']}")
        print(f"Densità note: {result['note_density']:.1f} note/s")
        print(f"Onset rilevati: {result['onsets_detected']}")
        print(f"Pitch rilevati: {result['pitch_detected']}")
    else:
        print(f"Errore: {result['error']}")
    
    # Exit code
    sys.exit(0 if result["success"] else 1)

if __name__ == "__main__":
    main()