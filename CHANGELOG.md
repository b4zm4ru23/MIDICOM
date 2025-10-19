# Changelog

All notable changes to the MIDICOM project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-10-19

### Added
- **Unified Logging System**: Centralized logging across frontend and backend
  - Frontend: `devLog`, `devWarn`, `devError` wrappers in `frontend/src/utils/logger.js`
  - Backend: Colored logger with ANSI support in `backend/logger.py`
  - Development-only logging for frontend (auto-disabled in production)
  - Colored console output for backend (INFO=Green, WARNING=Yellow, ERROR=Red)
  
- **Frontend Components**:
  - `AudioInitializer.jsx` for AudioContext initialization
  - `AudioPlayer.jsx` for audio playback controls
  - `PianoRoll.jsx` for MIDI visualization
  - Complete hooks system (`useMIDI`, `useMIDIPlayer`, `useAudioPlayer`, `usePlayback`)
  
- **Backend API**:
  - FastAPI server with CORS support
  - Audio separation endpoints using Demucs
  - MIDI transcription endpoints using librosa
  - Health check and status endpoints
  
- **Documentation**:
  - `INTEGRATION_README.md` with API documentation and Logger System section
  - Backend README files for separation and transcription
  - Frontend README with development setup

### Changed
- **Code Quality**: Full cleanup and refactor of console.log statements
  - Replaced 60+ `console.log` with `devLog` in frontend
  - Replaced 5+ `console.warn` with `devWarn` in frontend
  - Preserved critical logs for AudioContext and Tone.Transport
  - Standardized backend logging with centralized logger

- **Import Structure**: Fixed backend imports for uvicorn compatibility
  - Changed `from backend.logger` to `from logger` in all backend files
  
### Fixed
- Backend module import errors when running with uvicorn
- Logger integration in `app.py`, `separate.py`, and `transcribe_to_midi.py`

### Technical Details

#### Frontend Logger Features:
- Automatic environment detection (`import.meta.env.DEV`)
- Zero production overhead
- Compatible with Vite build system
- Consistent API with console methods

#### Backend Logger Features:
- 180+ lines of professional logging infrastructure
- ANSI color support (auto-detects TTY)
- Configurable log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- Optional file logging
- Module name tracking
- Timestamp formatting

#### Statistics:
- **11 Frontend files** cleaned and refactored
- **4 Backend files** integrated with new logger
- **60+ console.log** replaced with devLog
- **5+ console.warn** replaced with devWarn
- **9 commits** total for cleanup and integration
- **0 linter errors** remaining

### Migration Guide

#### Frontend:
```javascript
// Before
console.log('Debug message')
console.warn('Warning')

// After
import { devLog, devWarn } from '../utils/logger'
devLog('Debug message')
devWarn('Warning')
```

#### Backend:
```python
# Before
import logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# After
from logger import setup_logger
logger = setup_logger(__name__)
```

### Breaking Changes
None. All changes are backward compatible.

### Upgrade Notes
- Frontend: Logs now only visible in development mode (`npm run dev`)
- Backend: Colored output requires ANSI-compatible terminal
- Production builds automatically disable development logging

---

## [0.1.0] - Initial Development

### Added
- Initial project structure
- Basic audio processing pipeline
- MIDI transcription prototype
- Frontend-backend integration

---

**Legend:**
- 🎉 Added - New features
- 🔄 Changed - Changes in existing functionality  
- 🐛 Fixed - Bug fixes
- ⚠️ Deprecated - Soon-to-be removed features
- 🗑️ Removed - Removed features
- 🔒 Security - Security fixes


