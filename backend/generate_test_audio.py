#!/usr/bin/env python3
"""
Generatore audio di test per MIDICOM
Crea file audio sintetici per testare la separazione
"""

import numpy as np
import soundfile as sf
import argparse
from pathlib import Path

def generate_tone(frequency: float, duration: float, sample_rate: int = 44100, 
                 amplitude: float = 0.3) -> np.ndarray:
    """Genera un tono sinusoidale"""
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    return amplitude * np.sin(2 * np.pi * frequency * t)

def generate_chord(frequencies: list, duration: float, sample_rate: int = 44100,
                  amplitude: float = 0.3) -> np.ndarray:
    """Genera un accordo (somma di toni)"""
    chord = np.zeros(int(sample_rate * duration))
    for freq in frequencies:
        chord += generate_tone(freq, duration, sample_rate, amplitude / len(frequencies))
    return chord

def generate_drum_pattern(duration: float, sample_rate: int = 44100) -> np.ndarray:
    """Genera pattern di batteria semplice"""
    # Kick drum (bassi)
    kick_freq = 60
    kick_pattern = generate_tone(kick_freq, duration, sample_rate, 0.4)
    
    # Hi-hat (alti)
    hihat_freq = 8000
    hihat_pattern = generate_tone(hihat_freq, duration, sample_rate, 0.1)
    
    # Snare (medi)
    snare_freq = 200
    snare_pattern = generate_tone(snare_freq, duration, sample_rate, 0.2)
    
    # Applica pattern ritmico
    beats_per_second = 2  # 120 BPM
    beat_samples = int(sample_rate / beats_per_second)
    
    # Kick ogni beat
    for i in range(0, len(kick_pattern), beat_samples):
        if i + beat_samples < len(kick_pattern):
            kick_pattern[i:i+beat_samples//4] *= 2
    
    # Snare ogni 2 beat
    for i in range(beat_samples, len(snare_pattern), beat_samples * 2):
        if i + beat_samples < len(snare_pattern):
            snare_pattern[i:i+beat_samples//8] *= 3
    
    # Hi-hat continuo
    return kick_pattern + snare_pattern + hihat_pattern

def generate_test_audio(output_path: str, duration: float = 10.0, 
                       sample_rate: int = 44100):
    """Genera file audio di test con multiple tracce"""
    
    print(f"🎵 Generazione audio di test: {output_path}")
    print(f"⏱️ Durata: {duration}s")
    print(f"🎚️ Sample rate: {sample_rate} Hz")
    
    # Genera tracce separate
    print("🥁 Generando batteria...")
    drums = generate_drum_pattern(duration, sample_rate)
    
    print("🎸 Generando basso...")
    bass_freqs = [82.4, 110.0, 146.8, 196.0]  # E2, A2, D3, G3
    bass = generate_chord(bass_freqs, duration, sample_rate, 0.4)
    
    print("🎹 Generando melodia...")
    melody_freqs = [261.6, 329.6, 392.0, 523.3]  # C4, E4, G4, C5
    melody = generate_chord(melody_freqs, duration, sample_rate, 0.3)
    
    print("🎤 Generando altri...")
    other_freqs = [440.0, 554.4, 659.3]  # A4, C#5, E5
    other = generate_chord(other_freqs, duration, sample_rate, 0.2)
    
    # Combina in stereo mix
    print("🔄 Mixing tracce...")
    left_channel = drums + bass + melody * 0.7 + other * 0.5
    right_channel = drums + bass + melody * 0.3 + other * 0.7
    
    # Normalizza per evitare clipping
    max_val = max(np.max(np.abs(left_channel)), np.max(np.abs(right_channel)))
    if max_val > 1.0:
        left_channel /= max_val
        right_channel /= max_val
    
    # Combina in stereo
    stereo_audio = np.column_stack((left_channel, right_channel))
    
    # Salva file
    print(f"💾 Salvando: {output_path}")
    sf.write(output_path, stereo_audio, sample_rate)
    
    print("✅ Audio di test generato con successo!")
    print(f"📁 File: {output_path}")
    print(f"📊 Dimensioni: {stereo_audio.shape}")
    
    return output_path

def main():
    """Funzione principale"""
    parser = argparse.ArgumentParser(
        description="Genera audio di test per MIDICOM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi di utilizzo:
  python generate_test_audio.py test_audio.wav
  python generate_test_audio.py test_audio.wav --duration 15
  python generate_test_audio.py test_audio.wav --duration 5 --sample-rate 48000
        """
    )
    
    parser.add_argument("output", help="Path file audio output")
    parser.add_argument("--duration", "-d", type=float, default=10.0,
                       help="Durata in secondi (default: 10)")
    parser.add_argument("--sample-rate", "-r", type=int, default=44100,
                       help="Sample rate in Hz (default: 44100)")
    
    args = parser.parse_args()
    
    # Crea directory se non esiste
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Genera audio
    generate_test_audio(str(output_path), args.duration, args.sample_rate)

if __name__ == "__main__":
    main()





