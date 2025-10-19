#!/usr/bin/env python3
"""
Generate Test Audio Files for MIDICOM Pipeline
===============================================

Genera file audio sintetici per testing della pipeline audio → MIDI

Author: MIDICOM Team
Version: 1.0.0
"""

import numpy as np
import soundfile as sf
from pathlib import Path
import argparse


def generate_tone(frequency: float, duration: float, sample_rate: int = 44100, amplitude: float = 0.5) -> np.ndarray:
    """
    Genera tono sinusoidale puro
    
    Args:
        frequency: Frequenza in Hz (es. 440 = A4)
        duration: Durata in secondi
        sample_rate: Sample rate (default: 44100 Hz)
        amplitude: Ampiezza 0.0-1.0 (default: 0.5)
    
    Returns:
        Array numpy con segnale audio
    """
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    audio = amplitude * np.sin(2 * np.pi * frequency * t)
    return audio


def generate_melody(notes: list, duration_per_note: float = 0.5, sample_rate: int = 44100) -> np.ndarray:
    """
    Genera melodia da lista di note MIDI
    
    Args:
        notes: Lista di MIDI note numbers (es. [60, 62, 64, 65])
        duration_per_note: Durata di ogni nota in secondi
        sample_rate: Sample rate
    
    Returns:
        Array numpy con melodia
    """
    audio_segments = []
    
    for note in notes:
        # Converti MIDI note number in frequenza
        # Formula: freq = 440 * 2^((note - 69) / 12)
        frequency = 440.0 * (2.0 ** ((note - 69) / 12.0))
        
        # Genera nota con envelope ADSR semplice
        tone = generate_tone(frequency, duration_per_note, sample_rate, amplitude=0.4)
        
        # Applica fade in/out per evitare click
        fade_samples = int(0.01 * sample_rate)  # 10ms fade
        tone[:fade_samples] *= np.linspace(0, 1, fade_samples)
        tone[-fade_samples:] *= np.linspace(1, 0, fade_samples)
        
        audio_segments.append(tone)
    
    # Concatena tutte le note
    return np.concatenate(audio_segments)


def generate_chord(notes: list, duration: float, sample_rate: int = 44100) -> np.ndarray:
    """
    Genera accordo da lista di note MIDI
    
    Args:
        notes: Lista di MIDI note numbers (es. [60, 64, 67] = C major)
        duration: Durata accordo in secondi
        sample_rate: Sample rate
    
    Returns:
        Array numpy con accordo
    """
    chord_audio = np.zeros(int(sample_rate * duration))
    
    for note in notes:
        frequency = 440.0 * (2.0 ** ((note - 69) / 12.0))
        tone = generate_tone(frequency, duration, sample_rate, amplitude=0.3)
        chord_audio += tone[:len(chord_audio)]
    
    # Normalizza per evitare clipping
    chord_audio = chord_audio / len(notes)
    
    # Applica fade out
    fade_samples = int(0.05 * sample_rate)
    chord_audio[-fade_samples:] *= np.linspace(1, 0, fade_samples)
    
    return chord_audio


def generate_drum_pattern(bpm: int = 120, bars: int = 4, sample_rate: int = 44100) -> np.ndarray:
    """
    Genera pattern ritmico di batteria sintetico
    
    Args:
        bpm: Tempo in BPM
        bars: Numero di battute (4/4)
        sample_rate: Sample rate
    
    Returns:
        Array numpy con pattern batteria
    """
    # Calcola durata
    beats_per_bar = 4
    beat_duration = 60.0 / bpm
    total_duration = (bars * beats_per_bar * beat_duration)
    total_samples = int(sample_rate * total_duration)
    
    audio = np.zeros(total_samples)
    
    # Kick drum (bassa frequenza, 60 Hz)
    for beat in range(bars * beats_per_bar):
        if beat % 4 == 0 or beat % 4 == 2:  # Kick su beat 1 e 3
            start_sample = int(beat * beat_duration * sample_rate)
            kick_duration = 0.1  # 100ms
            kick = generate_tone(60, kick_duration, sample_rate, amplitude=0.8)
            
            # Envelope decay esponenziale per kick
            decay = np.exp(-np.linspace(0, 5, len(kick)))
            kick = kick * decay
            
            end_sample = start_sample + len(kick)
            if end_sample <= len(audio):
                audio[start_sample:end_sample] += kick
    
    # Snare drum (rumore + tono, 200 Hz)
    for beat in range(bars * beats_per_bar):
        if beat % 4 == 1 or beat % 4 == 3:  # Snare su beat 2 e 4
            start_sample = int(beat * beat_duration * sample_rate)
            snare_duration = 0.08  # 80ms
            
            # Snare = rumore + tono
            noise = np.random.normal(0, 0.3, int(snare_duration * sample_rate))
            tone = generate_tone(200, snare_duration, sample_rate, amplitude=0.4)
            snare = noise + tone
            
            # Envelope decay
            decay = np.exp(-np.linspace(0, 8, len(snare)))
            snare = snare * decay
            
            end_sample = start_sample + len(snare)
            if end_sample <= len(audio):
                audio[start_sample:end_sample] += snare
    
    # Hi-hat (rumore alta frequenza)
    for beat in range(bars * beats_per_bar * 4):  # Hi-hat su ogni 1/16
        start_sample = int((beat * beat_duration / 4) * sample_rate)
        hihat_duration = 0.03  # 30ms
        
        hihat = np.random.normal(0, 0.15, int(hihat_duration * sample_rate))
        
        # Envelope decay rapido
        decay = np.exp(-np.linspace(0, 15, len(hihat)))
        hihat = hihat * decay
        
        end_sample = start_sample + len(hihat)
        if end_sample <= len(audio):
            audio[start_sample:end_sample] += hihat
    
    # Normalizza
    audio = audio / np.max(np.abs(audio)) * 0.7
    
    return audio


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="Genera file audio di test per MIDICOM",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Esempi di utilizzo:
  python generate_test_audio.py --tone         # Genera tono singolo (A4)
  python generate_test_audio.py --melody       # Genera melodia semplice
  python generate_test_audio.py --chord        # Genera accordo C major
  python generate_test_audio.py --drums        # Genera pattern batteria
  python generate_test_audio.py --all          # Genera tutti i file
        """
    )
    
    parser.add_argument("--tone", action="store_true", help="Genera tono singolo")
    parser.add_argument("--melody", action="store_true", help="Genera melodia")
    parser.add_argument("--chord", action="store_true", help="Genera accordo")
    parser.add_argument("--drums", action="store_true", help="Genera batteria")
    parser.add_argument("--all", action="store_true", help="Genera tutti i file")
    parser.add_argument("--output", default="../backend/test_samples", help="Directory output")
    
    args = parser.parse_args()
    
    # Output directory
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    sample_rate = 44100
    
    # Se nessuna opzione specificata, genera tutti
    if not any([args.tone, args.melody, args.chord, args.drums]):
        args.all = True
    
    print("\n🎵 MIDICOM - Test Audio Generator\n")
    print(f"📁 Output directory: {output_dir}\n")
    
    # 1. Tono singolo (A4 = 440 Hz)
    if args.tone or args.all:
        print("🎵 Generazione tono singolo (A4 = 440 Hz)...")
        tone_audio = generate_tone(440.0, duration=3.0, sample_rate=sample_rate)
        
        output_file = output_dir / "test_tone_440hz.wav"
        sf.write(output_file, tone_audio, sample_rate)
        print(f"✅ Salvato: {output_file} ({tone_audio.shape[0] / sample_rate:.1f}s)")
    
    # 2. Melodia (scala C major)
    if args.melody or args.all:
        print("\n🎶 Generazione melodia (C major scale)...")
        # C4, D4, E4, F4, G4, A4, B4, C5
        melody_notes = [60, 62, 64, 65, 67, 69, 71, 72]
        melody_audio = generate_melody(melody_notes, duration_per_note=0.5, sample_rate=sample_rate)
        
        output_file = output_dir / "test_melody_cmajor.wav"
        sf.write(output_file, melody_audio, sample_rate)
        print(f"✅ Salvato: {output_file} ({len(melody_notes)} note, {melody_audio.shape[0] / sample_rate:.1f}s)")
    
    # 3. Accordo (C major chord)
    if args.chord or args.all:
        print("\n🎹 Generazione accordo (C major)...")
        # C4, E4, G4
        chord_notes = [60, 64, 67]
        chord_audio = generate_chord(chord_notes, duration=2.0, sample_rate=sample_rate)
        
        output_file = output_dir / "test_chord_cmajor.wav"
        sf.write(output_file, chord_audio, sample_rate)
        print(f"✅ Salvato: {output_file} ({len(chord_notes)} note, {chord_audio.shape[0] / sample_rate:.1f}s)")
    
    # 4. Pattern batteria
    if args.drums or args.all:
        print("\n🥁 Generazione pattern batteria (120 BPM, 4 bars)...")
        drums_audio = generate_drum_pattern(bpm=120, bars=4, sample_rate=sample_rate)
        
        output_file = output_dir / "test_drums_120bpm.wav"
        sf.write(output_file, drums_audio, sample_rate)
        print(f"✅ Salvato: {output_file} ({drums_audio.shape[0] / sample_rate:.1f}s)")
    
    # 5. Composizione completa (melodia + batteria)
    if args.all:
        print("\n🎼 Generazione composizione completa...")
        
        # Genera melodia più lunga (2 ottave)
        melody_notes = [60, 62, 64, 65, 67, 69, 71, 72,  # C major ascendente
                       72, 71, 69, 67, 65, 64, 62, 60]  # C major discendente
        melody_audio = generate_melody(melody_notes, duration_per_note=0.5, sample_rate=sample_rate)
        
        # Genera batteria per stessa durata
        melody_duration = len(melody_audio) / sample_rate
        bars_needed = int(np.ceil(melody_duration / (4 * 60 / 120)))
        drums_audio = generate_drum_pattern(bpm=120, bars=bars_needed, sample_rate=sample_rate)
        
        # Mix melody + drums
        max_length = max(len(melody_audio), len(drums_audio))
        melody_padded = np.pad(melody_audio, (0, max_length - len(melody_audio)))
        drums_padded = np.pad(drums_audio, (0, max_length - len(drums_audio)))
        
        mixed_audio = (melody_padded * 0.6 + drums_padded * 0.4)
        
        # Normalizza
        mixed_audio = mixed_audio / np.max(np.abs(mixed_audio)) * 0.8
        
        output_file = output_dir / "test_composition_full.wav"
        sf.write(output_file, mixed_audio, sample_rate)
        print(f"✅ Salvato: {output_file} ({mixed_audio.shape[0] / sample_rate:.1f}s)")
    
    print("\n🎉 Generazione completata!")
    print(f"\n📂 File generati in: {output_dir}")
    print("\n💡 Usa questi file per testare la pipeline:")
    print(f"   cd backend")
    print(f"   python test_pipeline.py")
    print(f"\nOppure caricali nel frontend: http://localhost:5173")


if __name__ == "__main__":
    main()



