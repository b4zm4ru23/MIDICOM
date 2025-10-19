# Changelog

All notable changes to MIDICOM will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned for Sprint 2
- Progress bar for audio processing
- 4-stems separation (vocals, bass, drums, other)
- Tuning parameters UI (threshold_onset, quantize_ms)
- Background processing with FastAPI BackgroundTasks
- MIDI export button
- FFmpeg permanent PATH configuration

## [1.0.0] - 2025-10-19

### 🎉 Sprint 1 Complete - Core Pipeline Functional

#### Added
- **Backend**: Complete audio → stems → MIDI pipeline
  - FastAPI server with integrated `/transcribe` endpoint
  - Demucs 4.0 integration for stem separation (CLI-based)
  - Librosa-based MIDI transcription (onset + pitch detection)
  - Unified `/stems/{path}` endpoint for serving audio files
  - Centralized logging system with ANSI colors
  - Health check endpoint `/health`
  
- **Frontend**: Full UI for audio processing and visualization
  - Audio file upload with drag & drop
  - Piano Roll visualization with zoom and scroll
  - MIDI synth playback using Tone.js
  - Separate stems audio playback
  - Backend connection testing
  - Development logger (devLog/devWarn/devError)
  
- **Documentation**:
  - `SESSION_RECAP_2025-10-19.md` - Complete work summary
  - `PIPELINE_TEST_REPORT.md` - Testing report
  - `PYTHON_COMPATIBILITY_ISSUE.md` - Python 3.14 issue doc
  - `TESTING_REPORT_FINAL.md` - Final test status
  
- **Scripts**:
  - `generate_test_audio.py` - Generate test audio files
  - `test_pipeline.py` - Automated pipeline testing

#### Fixed
- **Python Environment**: 
  - Fixed Python 3.14 incompatibility (downgraded to 3.12.10)
  - Fixed `numba` dependency issues
  
- **Demucs Integration**:
  - Migrated from deprecated `demucs.api` to CLI via subprocess
  - Fixed FFmpeg integration
  - Changed output format to MP3 to avoid torchcodec issues
  
- **Librosa API**:
  - Updated `onset_detect` to use `delta` instead of deprecated `threshold`
  - Fixed `get_duration` to use `path` instead of deprecated `filename`
  
- **MIDI Transcription**:
  - Fixed variable scope bug in `create_midi` method
  - Improved note grouping and quantization
  
- **Frontend**:
  - Fixed double audio playback (MIDI + stems playing together)
  - Fixed backend endpoint mismatch (`/status` → `/health`)
  - Fixed CORS issues
  - Fixed AudioContext initialization
  
- **Backend**:
  - Fixed module import errors (added `backend/__init__.py`)
  - Fixed STEM_DIR vs STEMS_DIR typo
  - Improved error handling and logging

#### Changed
- **Backend**: 
  - Unified `/transcribe` endpoint (single call for full pipeline)
  - Separated stem playback from Piano Roll playback
  - Improved logging throughout pipeline
  
- **Frontend**:
  - Consolidated processing flow in `useMIDI.js`
  - Separated MIDI synth and stems audio players
  - Improved error messages and user feedback

### Technical Details

#### Dependencies Installed
```
Backend:
- demucs==4.0.0
- librosa==0.10.2
- pretty_midi==0.2.10
- fastapi==0.115.0
- uvicorn==0.30.6
- python-multipart==0.0.12
- aiofiles==24.1.0
- colorama==0.4.6

Frontend:
- tone (existing)
- React + Vite (existing)
- Electron (existing)
```

#### Performance
- Audio processing: ~10s for 4s audio file (2-stems)
- Separation: ~8s (Demucs CLI)
- Transcription: ~1s per stem (Librosa)
- Total pipeline: Upload → Stems → MIDI → Visualization: ~12s

#### Known Limitations
- Only 2-stems separation (vocals/no_vocals) for speed
- Monophonic pitch detection (Librosa pyin)
- No real-time progress bar
- FFmpeg PATH not permanent (session-only)
- No CREPE installation (would add 2GB+ dependencies)

## [0.1.0] - Pre-Sprint 1

### Initial Setup
- Project structure created
- Basic frontend with Piano Roll
- Basic backend structure
- Electron integration

---

## Legend

- 🎉 Major release
- ✨ New feature
- 🐛 Bug fix
- 🔧 Configuration change
- 📝 Documentation
- ⚡ Performance improvement
- ♻️ Refactoring
- 🚀 Deployment

