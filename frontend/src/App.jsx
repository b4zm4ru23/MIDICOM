import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, Square, FileAudio, Music, Settings, FolderOpen, AlertCircle, Loader2 } from 'lucide-react'
import * as Tone from 'tone'
import PianoRoll from './components/PianoRoll'
import AudioPlayer from './components/AudioPlayer'
import AudioInitializer from './components/AudioInitializer'
import { usePlayback } from './hooks/usePlayback'
import { useMIDI } from './hooks/useMIDI'
import { useMIDIPlayer } from './hooks/useMIDIPlayer'
import { useAudioPlayer } from './hooks/useAudioPlayer'
import { testBackendConnection } from './utils/testBackendConnection'
import { uploadMIDIFile } from './services/apiService'
import { devLog, devWarn } from './utils/logger'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [selectedMidi, setSelectedMidi] = useState(null)
  const [audioContextState, setAudioContextState] = useState('not initialized')
  const [audioInitialized, setAudioInitialized] = useState(false)
  const [midiUploading, setMidiUploading] = useState(false)
  const [midiUploadError, setMidiUploadError] = useState(null)
  
  // Load MIDI data and process audio files
  const { midiData, stems, loading: midiLoading, error: midiError, processingStep } = useMIDI(selectedFile, selectedMidi)
  
  // Playback system
  const { isPlaying, currentTime, duration, play, pause, stop, seek } = usePlayback(midiData)
  
  // MIDI player for synthesized playback
  const { isInitialized: midiInitialized, activeNotes, trackVolumes, trackMutes, setTrackVolume, setTrackMute, testSynth } = useMIDIPlayer(midiData, isPlaying, currentTime)
  
  // Audio player for stems
  const { 
    isPlaying: stemsPlaying, 
    currentTime: stemsCurrentTime, 
    duration: stemsDuration, 
    loading: stemsLoading, 
    error: stemsError,
    stemVolumes, 
    stemMutes, 
    playStems, 
    stopStems, 
    pauseStems, 
    seekToTime: seekStems, 
    setVolume: setStemVolume, 
    setMute: setStemMute 
  } = useAudioPlayer(stems)

  // Check Electron API availability and test backend connection
  useEffect(() => {
    if (window.electronAPI) {
      devLog('Electron API available with methods:', Object.keys(window.electronAPI))
    }
    
    // Test backend connection on app start
    testBackendConnection().then(result => {
      if (result.success) {
        devLog('✅ Backend connection successful')
      } else {
        devWarn('⚠️ Backend connection failed:', result.error)
      }
    })
  }, [])

  // Log MIDI state changes (development only)
  useEffect(() => {
    if (selectedMidi) {
      devLog('MIDI state:', { selectedMidi, isPlaying, currentTime: currentTime.toFixed(1) })
    }
  }, [selectedMidi, isPlaying, currentTime])

  // Update AudioContext state
  useEffect(() => {
    const updateAudioContextState = () => {
      if (Tone.context) {
        setAudioContextState(Tone.context.state)
      }
    }
    
    updateAudioContextState()
    const interval = setInterval(updateAudioContextState, 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Add keyboard event listener for spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle spacebar when not typing in input fields
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        if (isPlaying) {
          pause()
        } else {
          play()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPlaying, play, pause])

  const handleFileSelect = useCallback(async () => {
    try {
      // Try Electron API first
      if (window.electronAPI && window.electronAPI.selectAudioFile) {
        const filePath = await window.electronAPI.selectAudioFile()
        if (filePath) {
          setSelectedFile(filePath)
          setSelectedMidi(null)
        }
      } else {
        // Fallback to browser file input
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'audio/*,.wav,.mp3,.flac,.m4a,.aac'
        input.onchange = (e) => {
          const file = e.target.files[0]
          if (file) {
            setSelectedFile(file) // Pass the actual file object for backend processing
            setSelectedMidi(null)
            devLog('Audio file selected:', file.name)
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Error selecting file:', error)
    }
  }, [])

  // Remove handleProcessAudio since processing is now handled automatically by useMIDI hook

  const handleMIDIUpload = useCallback(async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Verifica che sia un file MIDI
    if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
      setMidiUploadError('Seleziona un file MIDI (.mid o .midi)')
      return
    }

    setMidiUploading(true)
    setMidiUploadError(null)

    try {
      const result = await uploadMIDIFile(file)
      devLog('MIDI file uploaded successfully:', result)
      
      // Imposta il file MIDI caricato come selezionato
      devLog('🎵 Setting selectedMidi to:', file.name)
      setSelectedMidi(file.name)
      setSelectedFile(null) // Reset audio file selection
      
    } catch (error) {
      console.error('Error uploading MIDI file:', error)
      setMidiUploadError(error.message || 'Errore durante l\'upload del file MIDI')
    } finally {
      setMidiUploading(false)
    }
  }, [])

  const handleMidiSelect = useCallback(() => {
    // Create file input for MIDI upload
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.mid,.midi'
    input.onchange = handleMIDIUpload
    input.click()
  }, [handleMIDIUpload])

  const handlePlaybackToggle = useCallback(async () => {
    try {
      // Ensure AudioContext is started
      if (Tone.context.state !== 'running') {
        // Starting AudioContext for playback
        await Tone.start()
      }
      
      if (isPlaying) {
        pause()
      } else {
        play()
      }
    } catch (error) {
      console.error('Error toggling playback:', error)
    }
  }, [isPlaying, play, pause])

  const handleStop = useCallback(() => {
    stop()
  }, [stop])

  // Handle audio initialization
  const handleAudioInitialized = useCallback((success) => {
    setAudioInitialized(success)
    if (success) {
      setAudioContextState('running')
      console.log('✅ Audio system initialized successfully')
    } else {
      setAudioContextState('failed')
      console.error('❌ Audio system initialization failed')
    }
  }, [])

  return (
    <AudioInitializer onInitialized={handleAudioInitialized}>
      <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Music className="h-8 w-8 text-primary-500" />
            <h1 className="text-2xl font-bold">MIDICOM</h1>
            <span className="text-sm text-gray-400">MIDI Composition Tool</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded text-sm ${
              audioContextState === 'running' ? 'bg-green-600' : 
              audioContextState === 'failed' ? 'bg-red-600' : 'bg-gray-600'
            } text-white`}>
              Audio: {audioContextState}
            </div>
            <button 
              onClick={testSynth}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Test Audio
            </button>
            <button className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          {/* File Upload Section */}
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-semibold mb-4">File Audio</h2>
            
            {selectedFile ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg">
                  <FileAudio className="h-5 w-5 text-primary-500" />
                  <span className="text-sm truncate flex-1">
                    {typeof selectedFile === 'string' 
                      ? (selectedFile.includes('\\') ? selectedFile.split('\\').pop() : selectedFile)
                      : selectedFile.name
                    }
                  </span>
                </div>
                <button
                  onClick={handleFileSelect}
                  className="w-full p-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cambia file
                </button>
              </div>
            ) : (
              <button
                onClick={handleFileSelect}
                className="w-full p-6 border-2 border-dashed border-gray-600 rounded-lg hover:border-primary-500 hover:bg-gray-700 transition-colors flex flex-col items-center space-y-2"
              >
                <Upload className="h-8 w-8 text-gray-400" />
                <span className="text-sm">Seleziona file audio</span>
                <span className="text-xs text-gray-500">WAV, MP3, FLAC, M4A</span>
              </button>
            )}

            {/* Processing Status */}
            {midiLoading && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-300">{processingStep || 'Processing...'}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {midiError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-300">{midiError}</span>
                </div>
              </div>
            )}
          </div>

          {/* Stems List */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Stem Separati</h3>
            
            {Object.keys(stems).length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nessuno stem disponibile</p>
                <p className="text-xs">Carica un file audio per iniziare</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stems).map(([name, path]) => (
                  <div
                    key={name}
                    className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-medium capitalize">{name}</h4>
                        <p className="text-xs text-gray-400 truncate">
                          {typeof path === 'string' ? path.split('\\').pop() : 'Loading...'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        <button 
                          onClick={() => setStemMute(name, !stemMutes[name])}
                          className={`p-1 rounded transition-colors ${
                            stemMutes[name] ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                          title={stemMutes[name] ? 'Unmute' : 'Mute'}
                        >
                          {stemMutes[name] ? '🔇' : '🔊'}
                        </button>
                        <button 
                          onClick={() => playStems()}
                          className="p-1 hover:bg-gray-500 rounded transition-colors"
                          title="Play"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {/* Volume control */}
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">Vol:</span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={stemVolumes[name] || 1}
                        onChange={(e) => setStemVolume(name, parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                      />
                      <span className="text-xs text-gray-400 w-8">
                        {Math.round((stemVolumes[name] || 1) * 100)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* MIDI Section */}
          <div className="p-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-4">File MIDI</h3>
            
            {selectedMidi ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 bg-gray-700 rounded-lg">
                  <Music className="h-5 w-5 text-primary-500" />
                  <span className="text-sm truncate flex-1">
                    {selectedMidi.includes('\\') ? selectedMidi.split('\\').pop() : selectedMidi}
                  </span>
                </div>
                <button
                  onClick={handleMidiSelect}
                  className="w-full p-2 text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Cambia file MIDI
                </button>
              </div>
            ) : (
              <button
                onClick={handleMidiSelect}
                className="w-full p-3 border border-gray-600 rounded-lg hover:border-primary-500 hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Music className="h-5 w-5" />
                <span className="text-sm">Carica MIDI</span>
              </button>
            )}

            {/* MIDI Upload Status */}
            {midiUploading && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span className="text-sm text-blue-300">Caricamento file MIDI...</span>
                </div>
              </div>
            )}

            {/* MIDI Upload Error */}
            {midiUploadError && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-sm text-red-300">{midiUploadError}</span>
                </div>
              </div>
            )}

            {/* Test MIDI Files (Optional) */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">File di Test (Opzionale)</h4>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedMidi('Frank_Sinatra_-_More.mid')}
                  className="w-full p-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                >
                  🎵 Frank Sinatra - More
                </button>
                <button
                  onClick={() => setSelectedMidi('melody_test.mid')}
                  className="w-full p-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                >
                  🎵 Melodia (8 note)
                </button>
                <button
                  onClick={() => setSelectedMidi('chord_progression.mid')}
                  className="w-full p-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                >
                  🎹 Accordi (C-F-G-Am)
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col">
          {/* Playback Controls */}
          <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handlePlaybackToggle}
                  className="p-3 bg-primary-600 hover:bg-primary-700 rounded-full transition-colors"
                  title={isPlaying ? "Pause (o premi Spazio)" : "Play (o premi Spazio)"}
                >
                  {isPlaying ? (
                    <Pause className="h-5 w-5" />
                  ) : (
                    <Play className="h-5 w-5" />
                  )}
                </button>
                <button
                  onClick={handleStop}
                  className="p-3 bg-gray-600 hover:bg-gray-700 rounded-full transition-colors"
                  title="Stop"
                >
                  <Square className="h-5 w-5" />
                </button>
                <span className="text-xs text-gray-500">
                  (Spazio per play/pause)
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-400">
                  {Math.floor(currentTime / 60)}:{(currentTime % 60).toFixed(1).padStart(4, '0')}
                </span>
                <div 
                  className="w-64 bg-gray-700 rounded-full h-2 cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const clickX = e.clientX - rect.left
                    const newTime = (clickX / rect.width) * duration
                    seek(newTime)
                  }}
                >
                  <div 
                    className="bg-primary-500 h-2 rounded-full transition-all duration-100"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-sm text-gray-400">
                  {Math.floor(duration / 60)}:{(duration % 60).toFixed(1).padStart(4, '0')}
                </span>
              </div>
            </div>
          </div>

          {/* Piano Roll */}
          <div className="flex-1 p-6">
            {midiData ? (
              <PianoRoll 
                midiFile={selectedMidi}
                midiData={midiData}
                stems={stems}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
                activeNotes={activeNotes}
                trackVolumes={trackVolumes}
                trackMutes={trackMutes}
                setTrackVolume={setTrackVolume}
                setTrackMute={setTrackMute}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Nessun MIDI caricato</h3>
                  <p className="text-sm">Carica un file audio o MIDI per visualizzare il piano roll</p>
                  {midiLoading && (
                    <div className="mt-4 flex items-center justify-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                      <span className="text-sm text-blue-300">{processingStep || 'Processing...'}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
    </AudioInitializer>
  )
}

export default App
