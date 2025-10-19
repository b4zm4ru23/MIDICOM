#!/usr/bin/env python3
"""
MIDICOM Pipeline Test Suite
============================

Script per testare la pipeline completa: Audio → Stems → MIDI

Author: MIDICOM Team
Version: 1.0.0
"""

import requests
import time
import json
from pathlib import Path
from typing import Dict, Optional

# Configurazione
API_URL = "http://localhost:8000"
TEST_FILES_DIR = Path("test_samples")


def print_section(title: str):
    """Stampa sezione formattata"""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def test_server_health() -> bool:
    """Test 1: Verifica server attivo"""
    print_section("TEST 1: Server Health Check")
    
    try:
        response = requests.get(f"{API_URL}/health", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Server status: {data['status']}")
            print(f"   Services: {json.dumps(data['services'], indent=6)}")
            return True
        else:
            print(f"❌ Server non raggiungibile: {response.status_code}")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Errore connessione: {e}")
        print("\n💡 Suggerimento: Avvia il server con:")
        print("   cd backend && py -m uvicorn app_integrated:app --reload")
        return False


def test_transcription_pipeline(audio_file: Path) -> Optional[Dict]:
    """Test 2: Pipeline completa audio → MIDI"""
    print_section(f"TEST 2: Transcription Pipeline - {audio_file.name}")
    
    if not audio_file.exists():
        print(f"❌ File non trovato: {audio_file}")
        print(f"   Cerca file audio in: {TEST_FILES_DIR}")
        return None
    
    print(f"📁 File: {audio_file.name}")
    print(f"📏 Dimensione: {audio_file.stat().st_size / 1024:.1f} KB")
    
    try:
        # Upload e processing
        print("\n📤 Upload in corso...")
        
        with open(audio_file, "rb") as f:
            files = {"file": (audio_file.name, f, "audio/wav")}
            data = {
                "separation_model": "htdemucs",
                "transcription_method": "librosa",
                "threshold_onset": 0.3,
                "quantize_ms": 50
            }
            
            start_time = time.time()
            response = requests.post(f"{API_URL}/transcribe", files=files, data=data, timeout=300)
            elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            
            print(f"\n✅ Processing completato in {elapsed:.1f}s")
            print("\n📊 Risultati:")
            print(f"   Timestamp: {result['timestamp']}")
            print(f"   File originale: {result['metadata']['original_file']}")
            print(f"   Dimensione: {result['metadata']['file_size']} bytes")
            
            print(f"\n🎵 Stems generati:")
            for stem_name in result['stems'].keys():
                print(f"   - {stem_name}")
                
                # Mostra dettagli trascrizione se disponibili
                if 'transcription_details' in result['metadata']:
                    details = result['metadata']['transcription_details'].get(stem_name, {})
                    if details.get('success'):
                        print(f"     Note: {details.get('num_notes', 0)}")
                        print(f"     Durata: {details.get('duration', 0):.2f}s")
            
            print(f"\n🎼 MIDI Data:")
            print(f"   Tracks totali: {len(result['midi_data']['tracks'])}")
            print(f"   Note totali: {result['metadata']['total_notes']}")
            print(f"   Durata: {result['midi_data']['duration']:.2f}s")
            print(f"   BPM: {result['midi_data']['bpm']}")
            
            # Mostra dettaglio prime note di ogni track
            print(f"\n📝 Prime note per track:")
            for track in result['midi_data']['tracks'][:3]:  # Primi 3 tracks
                stem = track.get('stem', 'unknown')
                notes_count = len(track['notes'])
                if notes_count > 0:
                    first_note = track['notes'][0]
                    print(f"   {stem}: {notes_count} note")
                    print(f"     Prima nota: MIDI {first_note['midi']}, "
                          f"time {first_note['time']:.2f}s, "
                          f"duration {first_note['duration']:.2f}s, "
                          f"velocity {first_note['velocity']}")
            
            if len(result['midi_data']['tracks']) > 3:
                remaining = len(result['midi_data']['tracks']) - 3
                print(f"   ... e altri {remaining} tracks")
            
            return result
            
        else:
            print(f"\n❌ Errore: {response.status_code}")
            print(f"   Dettaglio: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print(f"\n⏱️ Timeout: Il processing sta richiedendo troppo tempo")
        print(f"   Suggerimento: Prova con un file più piccolo o aumenta timeout")
        return None
    except Exception as e:
        print(f"\n❌ Errore durante test: {e}")
        return None


def test_stem_download(timestamp: str, stem_name: str) -> bool:
    """Test 3: Download stem audio"""
    print_section(f"TEST 3: Stem Download - {stem_name}")
    
    try:
        url = f"{API_URL}/stems/download/{timestamp}/{stem_name}"
        print(f"🌐 URL: {url}")
        
        response = requests.head(url, timeout=5)
        
        if response.status_code == 200:
            size = response.headers.get('Content-Length', 'unknown')
            print(f"✅ Stem disponibile")
            print(f"   Dimensione: {size} bytes")
            print(f"   Tipo: {response.headers.get('Content-Type', 'unknown')}")
            return True
        else:
            print(f"❌ Stem non disponibile: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Errore: {e}")
        return False


def test_transcription_status(timestamp: str) -> bool:
    """Test 4: Status check processing"""
    print_section(f"TEST 4: Transcription Status Check")
    
    try:
        response = requests.get(f"{API_URL}/transcribe/status/{timestamp}", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Status: {data['status']}")
            
            if 'metadata' in data:
                meta = data['metadata']
                print(f"\n📊 Metadata:")
                print(f"   Timestamp: {meta.get('timestamp', 'N/A')}")
                print(f"   File originale: {meta.get('original_file', 'N/A')}")
                print(f"   Modello separazione: {meta.get('separation_model', 'N/A')}")
                print(f"   Metodo trascrizione: {meta.get('transcription_method', 'N/A')}")
                print(f"   Note totali: {meta.get('total_notes', 0)}")
                print(f"   Processing completo: {meta.get('processing_complete', False)}")
            
            return True
        else:
            print(f"❌ Status non disponibile: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Errore: {e}")
        return False


def test_midi_retrieval(filename: str) -> bool:
    """Test 5: Recupero dati MIDI"""
    print_section(f"TEST 5: MIDI Data Retrieval - {filename}")
    
    try:
        response = requests.get(f"{API_URL}/midi/{filename}", timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ MIDI caricato")
            print(f"   Filename: {data['filename']}")
            print(f"   Source: {data['source']}")
            
            midi_data = data['midi_data']
            print(f"\n📊 MIDI Info:")
            print(f"   Durata: {midi_data['duration']:.2f}s")
            print(f"   Tracks: {len(midi_data['tracks'])}")
            print(f"   BPM: {midi_data['bpm']}")
            
            total_notes = sum([len(t['notes']) for t in midi_data['tracks']])
            print(f"   Note totali: {total_notes}")
            
            return True
        else:
            print(f"❌ MIDI non trovato: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Errore: {e}")
        return False


def find_audio_test_file() -> Optional[Path]:
    """Cerca file audio di test"""
    # Cerca file audio nei test_samples
    audio_extensions = ['.wav', '.mp3', '.flac', '.m4a', '.ogg']
    
    if TEST_FILES_DIR.exists():
        for ext in audio_extensions:
            files = list(TEST_FILES_DIR.glob(f"*{ext}"))
            if files:
                return files[0]
    
    print("\n⚠️ Nessun file audio trovato per test")
    print(f"   Cerca in: {TEST_FILES_DIR}")
    print(f"   Estensioni supportate: {', '.join(audio_extensions)}")
    return None


def run_all_tests():
    """Esegui tutti i test della pipeline"""
    print("\n")
    print("╔═══════════════════════════════════════════════════════════════════╗")
    print("║                 MIDICOM PIPELINE TEST SUITE                       ║")
    print("║                     Audio → Stems → MIDI                          ║")
    print("╚═══════════════════════════════════════════════════════════════════╝")
    
    results = {
        "server_health": False,
        "transcription": False,
        "stem_download": False,
        "status_check": False,
        "midi_retrieval": False
    }
    
    # Test 1: Server health
    results["server_health"] = test_server_health()
    
    if not results["server_health"]:
        print("\n❌ Server non disponibile. Interrompo i test.")
        return results
    
    # Test 2: Transcription pipeline
    audio_file = find_audio_test_file()
    
    if audio_file:
        transcription_result = test_transcription_pipeline(audio_file)
        results["transcription"] = transcription_result is not None
        
        if transcription_result:
            timestamp = transcription_result['timestamp']
            stems = list(transcription_result['stems'].keys())
            
            # Test 3: Stem download
            if stems:
                results["stem_download"] = test_stem_download(timestamp, stems[0])
            
            # Test 4: Status check
            results["status_check"] = test_transcription_status(timestamp)
    else:
        print("\n⚠️ Skip transcription test: nessun file audio disponibile")
    
    # Test 5: MIDI retrieval (usa file test esistente)
    test_midi_files = list(TEST_FILES_DIR.glob("*.mid"))
    if test_midi_files:
        results["midi_retrieval"] = test_midi_retrieval(test_midi_files[0].name)
    else:
        print("\n⚠️ Skip MIDI retrieval test: nessun file MIDI disponibile")
    
    # Summary
    print_section("TEST SUMMARY")
    
    total = len(results)
    passed = sum(results.values())
    
    print(f"\n📊 Risultati:")
    for test_name, passed_test in results.items():
        status = "✅ PASS" if passed_test else "❌ FAIL"
        print(f"   {status} - {test_name.replace('_', ' ').title()}")
    
    print(f"\n🎯 Score: {passed}/{total} test passati ({passed/total*100:.0f}%)")
    
    if passed == total:
        print("\n🎉 Tutti i test passati! Pipeline funzionante.")
    elif passed > 0:
        print(f"\n⚠️ Alcuni test falliti. Verifica configurazione.")
    else:
        print("\n❌ Tutti i test falliti. Controlla che il server sia attivo.")
    
    return results


def main():
    """Main entry point"""
    import sys
    
    # Parse argomenti
    if len(sys.argv) > 1:
        if sys.argv[1] == "--help":
            print("\nUSAGE:")
            print("  python test_pipeline.py              Run all tests")
            print("  python test_pipeline.py --health     Test only server health")
            print("  python test_pipeline.py --transcribe Test only transcription")
            print("\nPREREQUISITES:")
            print("  1. Start backend server:")
            print("     cd backend && py -m uvicorn app_integrated:app --reload")
            print("  2. Place audio files in backend/test_samples/")
            return
        elif sys.argv[1] == "--health":
            test_server_health()
            return
        elif sys.argv[1] == "--transcribe":
            audio_file = find_audio_test_file()
            if audio_file:
                test_transcription_pipeline(audio_file)
            return
    
    # Run all tests
    results = run_all_tests()
    
    # Exit code based on results
    sys.exit(0 if all(results.values()) else 1)


if __name__ == "__main__":
    main()



