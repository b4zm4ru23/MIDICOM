import React, { useState, useCallback, useEffect } from 'react'
import { Upload, Play, Pause, Square, FileAudio, Music, Settings, FolderOpen } from 'lucide-react'
import * as Tone from 'tone'
import PianoRoll from './components/PianoRoll'
import AudioPlayer from './components/AudioPlayer'
import { processAudio, getStems } from './services/audioService'
import { usePlayback } from './hooks/usePlayback'
import { useMIDI } from './hooks/useMIDI'

function App() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [stems, setStems] = useState([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [selectedMidi, setSelectedMidi] = useState(null)
  const [audioContextState, setAudioContextState] = useState('not initialized')
  
  // Load MIDI data
  const { midiData } = useMIDI(selectedMidi)
  
  // Playback system
  const { isPlaying, currentTime, duration, play, pause, stop, seek } = usePlayback(midiData)

  // Check Electron API availability (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && window.electronAPI) {
      console.log('Electron API available with methods:', Object.keys(window.electronAPI))
    }
  }, [])

  // Log MIDI state changes (development only)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && selectedMidi) {
      console.log('MIDI state:', { selectedMidi, isPlaying, currentTime: currentTime.toFixed(1) })
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
          setStems([])
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
            setSelectedFile(file.name)
            setStems([])
            setSelectedMidi(null)
            // File selected successfully
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Error selecting file:', error)
    }
  }, [])

  const handleProcessAudio = useCallback(async () => {
    if (!selectedFile) return

    setIsProcessing(true)
    try {
      const result = await processAudio(selectedFile)
      if (result.success) {
        setStems(result.stems)
        // Audio processing completed
      } else {
        console.error('Processing failed:', result.error)
      }
    } catch (error) {
      console.error('Error processing audio:', error)
    } finally {
      setIsProcessing(false)
    }
  }, [selectedFile])

  const handleMidiSelect = useCallback(async () => {
    try {
      // Try Electron API first
      if (window.electronAPI && window.electronAPI.selectMidiFile) {
        const filePath = await window.electronAPI.selectMidiFile()
        if (filePath) {
          setSelectedMidi(filePath)
        }
      } else {
        // Fallback to browser file input
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.mid,.midi'
        input.onchange = (e) => {
          const file = e.target.files[0]
          if (file) {
            setSelectedMidi(file.name)
            // MIDI file selected successfully
          }
        }
        input.click()
      }
    } catch (error) {
      console.error('Error selecting MIDI file:', error)
    }
  }, [])

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

  // Initialize AudioContext on first user interaction
  const initializeAudio = useCallback(async () => {
    try {
      if (Tone.context.state !== 'running') {
        console.log('Initializing AudioContext...')
        await Tone.start()
        // AudioContext ready for playback
      }
    } catch (error) {
      console.error('Error initializing AudioContext:', error)
    }
  }, [])

  return (
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
            <button
              onClick={initializeAudio}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Init Audio
            </button>
            <div className="px-3 py-1 bg-gray-600 rounded text-sm text-white">
              AudioContext: {audioContextState}
            </div>
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
                    {selectedFile.includes('\\') ? selectedFile.split('\\').pop() : selectedFile}
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

            {selectedFile && (
              <button
                onClick={handleProcessAudio}
                disabled={isProcessing}
                className="w-full mt-4 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    <span>Processa Audio</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Stems List */}
          <div className="flex-1 p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Stem Separati</h3>
            
            {stems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nessuno stem disponibile</p>
                <p className="text-xs">Processa un file audio per iniziare</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stems).map(([name, path]) => (
                  <div
                    key={name}
                    className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium capitalize">{name}</h4>
                        <p className="text-xs text-gray-400 truncate">
                          {path.split('\\').pop()}
                        </p>
                      </div>
                      <button className="p-1 hover:bg-gray-500 rounded transition-colors">
                        <Play className="h-4 w-4" />
                      </button>
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

            {/* Test MIDI Files */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-300 mb-2">File di Test</h4>
              <div className="space-y-2">
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
                <button
                  onClick={() => setSelectedMidi('c_major_scale.mid')}
                  className="w-full p-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                >
                  🎼 Scala Do Maggiore
                </button>
                <button
                  onClick={() => setSelectedMidi('drum_pattern.mid')}
                  className="w-full p-2 text-xs bg-gray-700 hover:bg-gray-600 rounded text-left transition-colors"
                >
                  🥁 Pattern Batteria
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
            {selectedMidi ? (
              <PianoRoll 
                midiFile={selectedMidi}
                midiData={midiData}
                stems={stems}
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                onSeek={seek}
              />
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Music className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Nessun MIDI caricato</h3>
                  <p className="text-sm">Carica un file MIDI per visualizzare il piano roll</p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

export default App
