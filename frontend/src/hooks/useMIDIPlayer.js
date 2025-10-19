import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { devLog } from '../utils/logger'

export const useMIDIPlayer = (midiData, isPlaying, currentTime) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [audioContextReady, setAudioContextReady] = useState(false)
  
  // Debug log for isInitialized changes
  useEffect(() => {
    devLog('🔄 isInitialized changed to:', isInitialized)
  }, [isInitialized])

  // Debug log for audioContextReady changes
  useEffect(() => {
    devLog('🔊 audioContextReady changed to:', audioContextReady)
  }, [audioContextReady])

  const [activeNotes, setActiveNotes] = useState([])
  const [trackVolumes, setTrackVolumes] = useState({})
  const [trackMutes, setTrackMutes] = useState({})
  const synthRef = useRef({})
  const scheduledNotesRef = useRef([])

  // Monitor AudioContext state
  useEffect(() => {
    const checkAudioContext = () => {
      const isReady = Tone.context.state === 'running'
      console.log('🔊 AudioContext state check:', Tone.context.state, 'ready:', isReady)
      setAudioContextReady(isReady)
    }

    // Check immediately
    checkAudioContext()

    // Set up interval to check periodically
    const interval = setInterval(checkAudioContext, 1000)

    return () => clearInterval(interval)
  }, [])

  // Initialize synthesizers for each track
  useEffect(() => {
    const initSynths = async () => {
      try {
        console.log('🔊 AudioContext state:', Tone.context.state)
        devLog('🎵 MIDI data available:', !!midiData)
        devLog('🎵 Tracks available:', midiData?.tracks?.length || 0)
        
        if (Tone.context.state !== 'running') {
          devLog('❌ AudioContext not ready, skipping synth initialization')
          setIsInitialized(false)
          return
        }

        if (!midiData || !midiData.tracks) {
          devLog('❌ No MIDI data or tracks available')
          setIsInitialized(false)
          return
        }

        devLog('✅ AudioContext is running, proceeding with initialization...')

        // Create synthesizers for each track
        devLog('🎵 Creating synthesizers for tracks:', midiData.tracks.map(t => t.name))
        devLog('🎵 MIDI data structure:', midiData)
        
        midiData.tracks.forEach((track, index) => {
          if (!synthRef.current[track.name]) {
            // Create different synth types for variety
            let synthType = 'sine'
            if (track.name.toLowerCase().includes('drum') || track.name.toLowerCase().includes('batteria')) {
              synthType = 'square' // More percussive for drums
            } else if (track.name.toLowerCase().includes('bass')) {
              synthType = 'triangle' // Warmer for bass
            }

            // Use PolySynth for polyphonic playback (multiple notes at once)
            synthRef.current[track.name] = new Tone.PolySynth(Tone.Synth, {
              maxPolyphony: 256, // Increased to 256 for very complex MIDI files (5000+ notes)
              voice: Tone.Synth,
              oscillator: {
                type: synthType
              },
              envelope: {
                attack: track.name.toLowerCase().includes('drum') ? 0.001 : 0.005,
                decay: track.name.toLowerCase().includes('drum') ? 0.05 : 0.1,
                sustain: track.name.toLowerCase().includes('drum') ? 0.05 : 0.3,
                release: track.name.toLowerCase().includes('drum') ? 0.05 : 0.2 // Reduced release to free voices faster!
              }
            }).toDestination()

            // Set different volumes for different tracks
            const baseVolume = -6 // Increased from -20 to -6 for better audibility
            const volumeOffset = index * -2 // Each track 2dB quieter (reduced from -5)
            synthRef.current[track.name].volume.value = baseVolume + volumeOffset

            devLog(`✅ Created synth for track: ${track.name}`, {
              type: synthType,
              volume: baseVolume + volumeOffset,
              notes: track.notes?.length || 0,
              maxPolyphony: 256 // ← 256 voices for complex files!
            })

            // Initialize track states
            setTrackVolumes(prev => ({ ...prev, [track.name]: 1.0 }))
            setTrackMutes(prev => ({ ...prev, [track.name]: false }))
          }
        })

        devLog('✅ MIDI synthesizers initialized for tracks:', Object.keys(synthRef.current))
        devLog('✅ Total synthesizers created:', Object.keys(synthRef.current).length)
        
        // Set initialized state after a small delay to ensure all synths are ready
        setTimeout(() => {
          setIsInitialized(true)
          devLog('✅ isInitialized set to true')
        }, 100)
        
      } catch (error) {
        console.error('Error initializing MIDI synthesizers:', error)
        setIsInitialized(false)
      }
    }

    // Only initialize if we have MIDI data and AudioContext is ready
    if (midiData && midiData.tracks && audioContextReady) {
      initSynths()
    } else {
      devLog('⏳ Waiting for conditions:', { 
        hasMidiData: !!midiData, 
        hasTracks: !!midiData?.tracks, 
        audioContextReady 
      })
    }

    return () => {
      Object.values(synthRef.current).forEach(synth => {
        if (synth) synth.dispose()
      })
      synthRef.current = {}
    }
  }, [midiData, audioContextReady]) // Added audioContextReady as dependency

  // Play MIDI notes for all tracks
  const playMIDINotes = useCallback(async (tracks, startTime = 0) => {
    const hasSynths = Object.keys(synthRef.current).length > 0
    devLog('🎵 playMIDINotes called with:', { 
      hasSynths, 
      isInitialized, 
      tracksCount: tracks?.length,
      audioContextState: Tone.context.state,
      startTime
    })
    
    if (!hasSynths || !isInitialized || !tracks) {
      devLog('❌ MIDI Player not ready for playback:', { hasSynths, isInitialized, hasTracks: !!tracks })
      return
    }

    devLog('✅ All conditions met, proceeding with note scheduling...')
    
    // Get BPM from MIDI file (backend already converted ticks to seconds)
    const bpm = midiData?.bpm || 120
    
    console.log('🎵 MIDI timing:', { 
      bpm,
      source: midiData?.bpm ? 'from MIDI file' : 'default',
      firstNoteRawTime: tracks[0]?.notes[0]?.time,
      note: 'Backend already converted ticks to seconds'
    })

    // Ensure AudioContext is started
    if (Tone.context.state !== 'running') {
      try {
        await Tone.start()
        console.log('✅ AudioContext started for MIDI playback')
      } catch (error) {
        console.error('❌ Failed to start AudioContext for MIDI playback:', error)
        return
      }
    }

    // Clear ALL previously scheduled events on the Transport
    Tone.Transport.cancel(0) // Cancel all scheduled events from time 0 onwards
    
    // Also clear our tracked scheduled notes
    scheduledNotesRef.current.forEach(note => {
      try {
        Tone.Transport.clear(note)
      } catch (e) {
        // Event might already be cleared
      }
    })
    scheduledNotesRef.current = []
    
    devLog('🧹 Cleared all previously scheduled Transport events')

    // Schedule notes for each track
    devLog('🎵 Starting to process tracks:', tracks.map(t => t.name))
    tracks.forEach(track => {
      devLog(`🎵 Processing track: ${track.name}`, {
        hasSynth: !!synthRef.current[track.name],
        isMuted: trackMutes[track.name],
        notesCount: track.notes?.length || 0,
        synthKeys: Object.keys(synthRef.current)
      })
      
      if (!synthRef.current[track.name] || trackMutes[track.name]) {
        devLog(`⏭️ Skipping track: ${track.name} (no synth or muted)`)
        return // Skip muted tracks or tracks without synthesizers
      }

      const notesToPlay = track.notes.filter(note => {
        // note.time is already in seconds from backend
        return note.time >= startTime
      })
      
      devLog(`🎵 Notes to play for ${track.name}:`, notesToPlay.length, 'out of', track.notes?.length || 0, 'total notes')
      
      if (notesToPlay.length > 0) {
        // note.time is already in seconds from backend
        const firstNoteTime = notesToPlay[0].time
        const firstNoteRelative = firstNoteTime - startTime
        devLog(`🎵 First note for ${track.name}:`, {
          absoluteSeconds: firstNoteTime.toFixed(3),
          relativeSeconds: firstNoteRelative.toFixed(3),
          startTime: startTime
        })
      }
      
      notesToPlay.forEach((note, idx) => {
        // note.time and note.duration are already in seconds from backend
        const noteTimeAbsolute = note.time
        const noteDuration = note.duration
        
        // Calculate relative time from startTime
        const noteTimeRelative = noteTimeAbsolute - startTime

        // Schedule note with relative time from now
        const noteOnId = Tone.Transport.schedule((time) => {
          const frequency = Tone.Frequency(note.midi, 'midi').toFrequency()
          const synth = synthRef.current[track.name]
          
          if (idx < 3) {  // Log only first 3 notes per track to avoid spam
            console.log(`🎵 Playing note:`, {
              track: track.name,
              midi: note.midi,
              frequency: frequency.toFixed(2),
              noteTimeAbsolute: noteTimeAbsolute.toFixed(3),
              noteTimeRelative: noteTimeRelative.toFixed(3),
              durationSeconds: noteDuration.toFixed(3),
              velocity: note.velocity,
              audioContextTime: time.toFixed(3)
            })
          }
          
          if (synth && !trackMutes[track.name]) {
            // Apply velocity scaling
            const velocityScale = note.velocity / 127
            // Use time parameter from callback for precise timing
            synth.triggerAttackRelease(frequency, noteDuration, time, velocityScale)
            
            if (idx < 3) {
              console.log(`✅ Note triggered: ${note.midi} at audioContext ${time.toFixed(3)}s`)
            }
          } else {
            if (idx < 3) {
              console.log(`❌ Note not triggered: synth=${!!synth}, muted=${trackMutes[track.name]}`)
            }
          }
        }, `+${noteTimeRelative}`)  // Schedule relative to current Transport position

        scheduledNotesRef.current.push(noteOnId)
      })
    })

    // Configure Transport BPM from MIDI file
    Tone.Transport.bpm.value = bpm
    console.log('🎵 Transport BPM set to:', bpm, midiData?.bpm ? '(from MIDI file)' : '(default)')
    
    // Start Transport if not already running
    console.log('🎵 Transport state before start:', Tone.Transport.state)
    console.log('🎵 startTime parameter:', startTime)
    
    if (Tone.Transport.state !== 'started') {
      // Reset Transport position to startTime
      Tone.Transport.seconds = startTime
      console.log('🚀 Starting Tone.Transport immediately (no offset)')
      // Start immediately without offset parameter
      Tone.Transport.start()
      console.log('✅ Tone.Transport started, new state:', Tone.Transport.state)
      console.log('✅ Transport position after start:', Tone.Transport.seconds)
    } else {
      console.log('⏯️ Tone.Transport already running, repositioning to:', startTime)
      Tone.Transport.seconds = startTime
      console.log('✅ Transport repositioned to:', Tone.Transport.seconds)
    }
    
    console.log('🎵 Total scheduled notes:', scheduledNotesRef.current.length)
    console.log('🎵 Transport position after scheduling:', Tone.Transport.seconds.toFixed(3))
    console.log('🎵 Transport BPM:', Tone.Transport.bpm.value)
    console.log('🎵 First 5 notes should play at (relative):')
    
    // Log timing for first few notes across all tracks
    let noteCount = 0
    tracks.forEach(track => {
      if (track.notes && noteCount < 5) {
        track.notes.slice(0, Math.min(5 - noteCount, track.notes.length)).forEach(note => {
          const absoluteTime = note.time // Already in seconds from backend
          const relativeTime = absoluteTime - startTime
          console.log(`  - ${note.midi} at +${relativeTime.toFixed(3)}s (absolute: ${absoluteTime.toFixed(3)}s)`)
          noteCount++
        })
      }
    })
    
    // Debug: Log Transport progress after delays
    setTimeout(() => {
      console.log('⏱️ Transport check after 500ms:', {
        state: Tone.Transport.state,
        position: Tone.Transport.seconds.toFixed(3),
        bpm: Tone.Transport.bpm.value
      })
    }, 500)
    
    setTimeout(() => {
      console.log('⏱️ Transport check after 1s:', {
        state: Tone.Transport.state,
        position: Tone.Transport.seconds.toFixed(3),
        bpm: Tone.Transport.bpm.value
      })
    }, 1000)
    
    setTimeout(() => {
      console.log('⏱️ Transport check after 2s:', {
        state: Tone.Transport.state,
        position: Tone.Transport.seconds.toFixed(3),
        bpm: Tone.Transport.bpm.value
      })
    }, 2000)
  }, [isInitialized, trackMutes, midiData])

  // Calculate active notes based on current time
  const calculateActiveNotes = useCallback((time) => {
    if (!midiData) return []
    
    const allNotes = midiData.tracks.flatMap(track => track.notes)
    const active = allNotes.filter(note => {
      const noteStart = note.time
      const noteEnd = note.time + note.duration
      return time >= noteStart && time <= noteEnd
    }).map(note => note.midi)
    
    return active
  }, [midiData])

  // Update active notes based on current time
  useEffect(() => {
    if (midiData && isInitialized) {
      const active = calculateActiveNotes(currentTime)
      setActiveNotes(active)
      
      // Update active notes for visual feedback
    }
  }, [currentTime, midiData, isInitialized, calculateActiveNotes])

  // Handle playback start/stop
  useEffect(() => {
    const hasSynths = Object.keys(synthRef.current).length > 0
    devLog('🎵 Playback useEffect triggered:', { 
      hasMidiData: !!midiData, 
      isInitialized, 
      hasSynths,
      isPlaying 
    })
    
    if (!midiData || !isInitialized || !hasSynths) {
      devLog('MIDI Player not ready:', { hasMidiData: !!midiData, isInitialized, hasSynths })
      return
    }

    if (isPlaying) {
      // Start playing from current time
      devLog('Starting MIDI playback for tracks:', midiData.tracks.map(t => t.name))
      playMIDINotes(midiData.tracks, currentTime)
    } else {
      // Stop all scheduled notes and Transport
      devLog('Stopping MIDI playback')
      
      // Cancel all Transport events
      Tone.Transport.cancel(0)
      
      // Clear tracked scheduled notes
      scheduledNotesRef.current.forEach(note => {
        try {
          Tone.Transport.clear(note)
        } catch (e) {
          // Event might already be cleared
        }
      })
      scheduledNotesRef.current = []
      setActiveNotes([]) // Clear active notes
      
      devLog('🛑 All Transport events cancelled and stopped')
    }
  }, [isPlaying, midiData, isInitialized, playMIDINotes]) // Removed currentTime to prevent infinite loop

  // Handle seek (only when manually triggered, not during playback)
  const handleSeek = useCallback((newTime) => {
    devLog('Seeking MIDI playback to:', newTime)
    
    const hasSynths = Object.keys(synthRef.current).length > 0
    if (midiData && isInitialized && hasSynths) {
      // Update Tone.Transport position
      Tone.Transport.seconds = newTime
      
      if (isPlaying) {
        // Clear current notes and restart from new position
        scheduledNotesRef.current.forEach(note => {
          Tone.Transport.clear(note)
        })
        scheduledNotesRef.current = []
        
        // Restart playback from new position
        playMIDINotes(midiData.tracks, newTime)
      }
    }
  }, [isPlaying, midiData, isInitialized, playMIDINotes])

  // Track control functions
  const setTrackVolume = useCallback((trackName, volume) => {
    if (synthRef.current[trackName]) {
      const dbVolume = Tone.gainToDb(volume)
      synthRef.current[trackName].volume.value = dbVolume
      setTrackVolumes(prev => ({ ...prev, [trackName]: volume }))
    }
  }, [])

  const setTrackMute = useCallback((trackName, muted) => {
    setTrackMutes(prev => ({ ...prev, [trackName]: muted }))
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledNotesRef.current.forEach(note => {
        Tone.Transport.clear(note)
      })
    }
  }, [])

  // Test function to verify synthesizers work
  const testSynth = useCallback(async () => {
    devLog('🧪 Testing synthesizer...')
    
    if (Tone.context.state !== 'running') {
      try {
        await Tone.start()
        console.log('✅ AudioContext started for test')
      } catch (error) {
        console.error('❌ Failed to start AudioContext for test:', error)
        return
      }
    }

    const synthNames = Object.keys(synthRef.current)
    devLog('🧪 Available synths:', synthNames)
    
    if (synthNames.length > 0) {
      const firstSynth = synthRef.current[synthNames[0]]
      devLog('🧪 Testing with synth:', synthNames[0])
      
      // Play a test note
      firstSynth.triggerAttackRelease('C4', '4n')
      devLog('🧪 Test note played: C4')
    } else {
      devLog('❌ No synthesizers available for testing')
    }
  }, [])

  return {
    isInitialized,
    activeNotes,
    trackVolumes,
    trackMutes,
    playMIDINotes,
    handleSeek,
    setTrackVolume,
    setTrackMute,
    testSynth
  }
}
