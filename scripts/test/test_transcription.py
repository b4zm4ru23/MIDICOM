#!/usr/bin/env python3
"""
Test script per trascrizione MIDI
Testa la pipeline completa: separazione -> trascrizione
"""

import os
import sys
import subprocess
import json
from pathlib import Path

def run_command(cmd, description):
    """Esegue comando e stampa risultato"""
    print(f"\n🔄 {description}")
    print(f"Comando: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("✅ Comando completato con successo")
        if result.stdout:
            print(f"Output: {result.stdout}")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Errore: {e}")
        if e.stderr:
            print(f"Stderr: {e.stderr}")
        return False

def test_separation_and_transcription():
    """Test pipeline completa"""
    print("🧪 TEST PIPELINE COMPLETA: SEPARAZIONE + TRASCRIZIONE")
    print("="*60)
    
    # File di test
    test_audio = "test_audio.wav"
    output_dir = "test_output"
    midi_output = "test_output/transcription_test.mid"
    
    # 1. Genera audio di test
    if not os.path.exists(test_audio):
        print("\n📝 Generazione audio di test...")
        if not run_command([
            "python", "generate_test_audio.py", test_audio, "--duration", "8"
        ], "Generazione audio di test"):
            return False
    else:
        print(f"✅ Audio di test già esistente: {test_audio}")
    
    # 2. Separazione audio
    print("\n📝 Separazione audio in stem...")
    if not run_command([
        "python", "../backend/separate.py", test_audio, output_dir
    ], "Separazione audio"):
        return False
    
    # 3. Verifica stem generati
    stem_files = ["drums.wav", "bass.wav", "other.wav", "vocals.wav"]
    print(f"\n📁 Verifica stem generati in {output_dir}/")
    
    for stem in stem_files:
        stem_path = os.path.join(output_dir, stem)
        if os.path.exists(stem_path):
            size = os.path.getsize(stem_path)
            print(f"✅ {stem}: {size:,} bytes")
        else:
            print(f"❌ {stem}: NON TROVATO")
    
    # 4. Test trascrizione su ogni stem
    print(f"\n🎼 Test trascrizione MIDI...")
    
    for stem in stem_files:
        stem_path = os.path.join(output_dir, stem)
        if not os.path.exists(stem_path):
            continue
            
        midi_path = os.path.join(output_dir, f"{stem.replace('.wav', '')}.mid")
        
        print(f"\n🎵 Trascrizione: {stem}")
        
        # Parametri diversi per ogni stem
        if "drums" in stem:
            # Batteria: soglia più alta, quantizzazione maggiore
            cmd = [
                "python", "../backend/transcribe_to_midi.py", stem_path, midi_path,
                "--threshold-onset", "0.5",
                "--quantize", "100",
                "--min-duration", "0.05"
            ]
        elif "bass" in stem:
            # Basso: soglia media, durata minima maggiore
            cmd = [
                "python", "../backend/transcribe_to_midi.py", stem_path, midi_path,
                "--threshold-onset", "0.4",
                "--quantize", "50",
                "--min-duration", "0.2"
            ]
        else:
            # Melodia e altri: parametri standard
            cmd = [
                "python", "../backend/transcribe_to_midi.py", stem_path, midi_path,
                "--threshold-onset", "0.3",
                "--quantize", "50",
                "--min-duration", "0.1"
            ]
        
        if run_command(cmd, f"Trascrizione {stem}"):
            # Verifica file MIDI generato
            if os.path.exists(midi_path):
                size = os.path.getsize(midi_path)
                print(f"✅ MIDI generato: {size:,} bytes")
            else:
                print(f"❌ MIDI non generato per {stem}")
    
    # 5. Riepilogo risultati
    print(f"\n📊 RIEPILOGO RISULTATI")
    print("="*40)
    
    total_stems = 0
    total_midi = 0
    
    for stem in stem_files:
        stem_path = os.path.join(output_dir, stem)
        midi_path = os.path.join(output_dir, f"{stem.replace('.wav', '')}.mid")
        
        if os.path.exists(stem_path):
            total_stems += 1
            print(f"✅ {stem}: Stem OK")
            
            if os.path.exists(midi_path):
                total_midi += 1
                print(f"   🎼 MIDI: OK")
            else:
                print(f"   ❌ MIDI: MANCANTE")
        else:
            print(f"❌ {stem}: MANCANTE")
    
    print(f"\n📈 Statistiche:")
    print(f"   Stem generati: {total_stems}/4")
    print(f"   MIDI generati: {total_midi}/4")
    print(f"   Tasso successo: {total_midi/total_stems*100:.1f}%" if total_stems > 0 else "   Tasso successo: 0%")
    
    # 6. Test con parametri diversi
    print(f"\n🔧 TEST PARAMETRI DIVERSI")
    print("="*40)
    
    # Test con soglia molto alta (dovrebbe rilevare meno note)
    test_midi = os.path.join(output_dir, "test_high_threshold.mid")
    if os.path.exists(os.path.join(output_dir, "melody.wav")):
        melody_path = os.path.join(output_dir, "melody.wav")
        
        print("\n🎯 Test soglia alta (0.8)...")
        if run_command([
            "python", "../backend/transcribe_to_midi.py", melody_path, test_midi,
            "--threshold-onset", "0.8",
            "--verbose"
        ], "Test soglia alta"):
            if os.path.exists(test_midi):
                size = os.path.getsize(test_midi)
                print(f"✅ MIDI soglia alta: {size:,} bytes")
    
    print(f"\n🎉 Test completato!")
    print(f"📁 Controlla i file in: {output_dir}/")
    print(f"🎼 File MIDI pronti per importazione in DAW")

def main():
    """Funzione principale"""
    print("MIDICOM - Test Trascrizione MIDI")
    print("="*50)
    
    # Verifica che siamo nella directory corretta
    if not os.path.exists("../backend/separate.py") or not os.path.exists("../backend/transcribe_to_midi.py"):
        print("❌ Errore: Esegui questo script dalla directory scripts/test/")
        print("   cd scripts/test")
        print("   python test_transcription.py")
        sys.exit(1)
    
    # Esegui test
    test_separation_and_transcription()

if __name__ == "__main__":
    main()