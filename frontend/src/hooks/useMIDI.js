import { useState, useEffect, useCallback } from 'react'
import { uploadAudioFile, getSeparatedStems, getMIDITranscription } from '../services/apiService'
import { devLog, devWarn } from '../utils/logger'

// Backend API configuration
const API_BASE_URL = 'http://localhost:8000'

export const useMIDI = (audioFile, selectedMidiFile) => {
  const [midiData, setMidiData] = useState(null)
  const [stems, setStems] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [processingStep, setProcessingStep] = useState('')

  // Process audio file through backend pipeline
  const processAudioFile = useCallback(async (file) => {
    if (!file) return

    setLoading(true)
    setError(null)
    setProcessingStep('Uploading and processing audio file...')

    try {
      // Call integrated /transcribe endpoint that does everything in one request
      setProcessingStep('Processing audio (separation + transcription)...')
      const result = await uploadAudioFile(file, 'htdemucs', 'librosa')
      devLog('✅ Processing complete:', result)

      // Extract stems and MIDI data from unified response
      if (result.stems) {
        setStems(result.stems)
        devLog('📁 Stems loaded:', Object.keys(result.stems))
      }

      if (result.midi_data) {
        setMidiData(result.midi_data)
        devLog('🎵 MIDI data loaded:', {
          duration: result.midi_data.duration,
          tracks: result.midi_data.tracks?.length || 0,
          notes: result.metadata?.total_notes || 0
        })
      } else {
        devWarn('⚠️ No MIDI data in response, using mock data')
        setMidiData(getMockMidiData(file.name))
      }

      setProcessingStep('✅ Processing complete!')
      
      // Show success message briefly
      setTimeout(() => setProcessingStep(''), 2000)
    } catch (err) {
      setError(err.message || 'Processing failed')
      console.error('❌ Error processing audio file:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load MIDI file directly (for test files)
  const loadMIDIFile = useCallback(async (fileName) => {
    devLog('🎵 loadMIDIFile called with:', fileName)
    if (!fileName) {
      setMidiData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Always try backend first, then fallback to mock data
      try {
        devLog('🌐 Fetching MIDI from backend:', `${API_BASE_URL}/midi/${fileName}`)
        const response = await fetch(`${API_BASE_URL}/midi/${fileName}`)
        if (response.ok) {
          const result = await response.json()
          devLog('✅ MIDI data loaded from backend:', result)
          
          // Handle different response formats
          if (result.midi_data) {
            devLog('📊 Setting MIDI data from result.midi_data:', result.midi_data)
            setMidiData(result.midi_data)
          } else if (result.tracks) {
            devLog('📊 Setting MIDI data from result:', result)
            setMidiData(result)
          } else {
            throw new Error('Invalid MIDI data format from backend')
          }
          return
        } else {
          throw new Error(`Backend returned ${response.status}: ${response.statusText}`)
        }
      } catch (backendError) {
        devLog('Backend MIDI endpoint error:', backendError.message)
        devLog('Falling back to mock data')
        
        // Fallback to mock data
        const mockData = getMockMidiData(fileName)
        devLog('📊 Setting mock MIDI data:', mockData)
        setMidiData(mockData)
        devLog('✅ Using mock MIDI data for:', fileName)
      }
    } catch (err) {
      setError(err.message)
      console.error('Error loading MIDI file:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Process audio file when audioFile changes
  useEffect(() => {
    if (audioFile && typeof audioFile === 'object') {
      processAudioFile(audioFile)
    }
  }, [audioFile, processAudioFile])

  // Load MIDI file when selectedMidiFile changes
  useEffect(() => {
    if (selectedMidiFile && typeof selectedMidiFile === 'string') {
      devLog('🔄 Loading MIDI file:', selectedMidiFile)
      loadMIDIFile(selectedMidiFile)
    }
  }, [selectedMidiFile, loadMIDIFile])

  // Mock data generator for test files
  const getMockMidiData = (fileName) => {
    const baseName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
    
    if (baseName.includes('chord') || baseName.includes('accordi')) {
      return {
        duration: 12.0,
        tracks: [
          {
            name: 'Chords',
            notes: [
              { midi: 60, time: 0, duration: 2, velocity: 80 }, // C4
              { midi: 64, time: 0, duration: 2, velocity: 75 }, // E4
              { midi: 67, time: 0, duration: 2, velocity: 82 }, // G4
              { midi: 65, time: 2, duration: 2, velocity: 80 }, // F4
              { midi: 69, time: 2, duration: 2, velocity: 75 }, // A4
              { midi: 72, time: 2, duration: 2, velocity: 82 }, // C5
              { midi: 67, time: 4, duration: 2, velocity: 80 }, // G4
              { midi: 71, time: 4, duration: 2, velocity: 75 }, // B4
              { midi: 74, time: 4, duration: 2, velocity: 82 }, // D5
              { midi: 69, time: 6, duration: 2, velocity: 80 }, // A4
              { midi: 72, time: 6, duration: 2, velocity: 75 }, // C5
              { midi: 76, time: 6, duration: 2, velocity: 82 }, // E5
            ]
          }
        ]
      }
    } else if (baseName.includes('scale') || baseName.includes('scala')) {
      return {
        duration: 8.0,
        tracks: [
          {
            name: 'C Major Scale',
            notes: [
              { midi: 60, time: 0, duration: 0.5, velocity: 80 }, // C4
              { midi: 62, time: 0.5, duration: 0.5, velocity: 75 }, // D4
              { midi: 64, time: 1, duration: 0.5, velocity: 80 }, // E4
              { midi: 65, time: 1.5, duration: 0.5, velocity: 75 }, // F4
              { midi: 67, time: 2, duration: 0.5, velocity: 80 }, // G4
              { midi: 69, time: 2.5, duration: 0.5, velocity: 75 }, // A4
              { midi: 71, time: 3, duration: 0.5, velocity: 80 }, // B4
              { midi: 72, time: 3.5, duration: 1, velocity: 90 }, // C5
              { midi: 71, time: 4.5, duration: 0.5, velocity: 80 }, // B4
              { midi: 69, time: 5, duration: 0.5, velocity: 75 }, // A4
              { midi: 67, time: 5.5, duration: 0.5, velocity: 80 }, // G4
              { midi: 65, time: 6, duration: 0.5, velocity: 75 }, // F4
              { midi: 64, time: 6.5, duration: 0.5, velocity: 80 }, // E4
              { midi: 62, time: 7, duration: 0.5, velocity: 75 }, // D4
              { midi: 60, time: 7.5, duration: 0.5, velocity: 85 }, // C4
            ]
          }
        ]
      }
    } else if (baseName.includes('drum') || baseName.includes('batteria')) {
      return {
        duration: 4.0,
        tracks: [
          {
            name: 'Drums',
            notes: [
              { midi: 36, time: 0, duration: 0.1, velocity: 100 }, // Kick
              { midi: 36, time: 1, duration: 0.1, velocity: 100 }, // Kick
              { midi: 36, time: 2, duration: 0.1, velocity: 100 }, // Kick
              { midi: 36, time: 3, duration: 0.1, velocity: 100 }, // Kick
              { midi: 38, time: 0.5, duration: 0.1, velocity: 80 }, // Snare
              { midi: 38, time: 1.5, duration: 0.1, velocity: 80 }, // Snare
              { midi: 38, time: 2.5, duration: 0.1, velocity: 80 }, // Snare
              { midi: 38, time: 3.5, duration: 0.1, velocity: 80 }, // Snare
              { midi: 42, time: 0.25, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 0.75, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 1.25, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 1.75, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 2.25, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 2.75, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 3.25, duration: 0.05, velocity: 60 }, // Hi-hat
              { midi: 42, time: 3.75, duration: 0.05, velocity: 60 }, // Hi-hat
            ]
          }
        ]
      }
    } else {
      return {
        duration: 8.0,
        tracks: [
          {
            name: 'Piano',
            notes: [
              { midi: 60, time: 0, duration: 1, velocity: 80 }, // C4
              { midi: 64, time: 1, duration: 1, velocity: 75 }, // E4
              { midi: 67, time: 2, duration: 1, velocity: 82 }, // G4
              { midi: 72, time: 3, duration: 1, velocity: 90 }, // C5
              { midi: 69, time: 4.5, duration: 1, velocity: 75 }, // A4
              { midi: 65, time: 5.5, duration: 1, velocity: 80 }, // F4
              { midi: 62, time: 6.5, duration: 1, velocity: 77 }, // D4
              { midi: 60, time: 7.5, duration: 0.5, velocity: 85 }, // C4
            ]
          }
        ]
      }
    }
  }

  return { 
    midiData, 
    stems, 
    loading, 
    error, 
    processingStep,
    processAudioFile,
    loadMIDIFile
  }
}
