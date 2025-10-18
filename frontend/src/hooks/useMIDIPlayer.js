import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export const useMIDIPlayer = (midiData, isPlaying, currentTime) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [activeNotes, setActiveNotes] = useState([])
  const synthRef = useRef(null)
  const scheduledNotesRef = useRef([])

  // Initialize synthesizer
  useEffect(() => {
    const initSynth = async () => {
      try {
        if (Tone.context.state !== 'running') {
          await Tone.start()
        }

        // Create a simple synthesizer with better sound
        synthRef.current = new Tone.Synth({
          oscillator: {
            type: 'sine'
          },
          envelope: {
            attack: 0.01,
            decay: 0.2,
            sustain: 0.5,
            release: 0.8
          }
        }).toDestination()

        // Set volume (quieter)
        synthRef.current.volume.value = -20

        setIsInitialized(true)
        console.log('MIDI synthesizer initialized')
      } catch (error) {
        console.error('Error initializing MIDI synthesizer:', error)
      }
    }

    initSynth()

    return () => {
      if (synthRef.current) {
        synthRef.current.dispose()
      }
    }
  }, [])

  // Play MIDI notes
  const playMIDINotes = useCallback((notes, startTime = 0) => {
    if (!synthRef.current || !isInitialized) {
      console.log('MIDI Player not ready:', { synth: !!synthRef.current, initialized: isInitialized })
      return
    }

    console.log('Playing MIDI notes:', notes.length, 'notes, start time:', startTime)

    // Clear previously scheduled notes
    scheduledNotesRef.current.forEach(note => {
      Tone.Transport.clear(note)
    })
    scheduledNotesRef.current = []

    // Filter notes that should be played from the start time
    const notesToPlay = notes.filter(note => note.time >= startTime)
    console.log('Filtered notes to play:', notesToPlay.length, 'from start time:', startTime)

    // Schedule notes
    notesToPlay.forEach((note, index) => {
      const noteTime = note.time // Use absolute time, not relative to startTime
      const noteDuration = note.duration

      // Schedule note on
      const noteOnId = Tone.Transport.schedule((time) => {
        const frequency = Tone.Frequency(note.midi, 'midi').toFrequency()
        console.log(`Playing note ${index}: MIDI ${note.midi}, freq ${frequency.toFixed(2)}Hz, time ${noteTime}`)
        
        synthRef.current.triggerAttackRelease(frequency, noteDuration, time)
      }, noteTime)

      scheduledNotesRef.current.push(noteOnId)
    })
  }, [isInitialized])

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
      
      // Debug: Log active notes
      if (active.length > 0) {
        console.log('Active notes at time', currentTime.toFixed(2) + 's:', active)
      }
    }
  }, [currentTime, midiData, isInitialized, calculateActiveNotes])

  // Handle playback start/stop
  useEffect(() => {
    console.log('MIDI Player playback effect:', { 
      midiData: !!midiData, 
      isInitialized, 
      isPlaying
    })

    if (!midiData || !isInitialized) {
      console.log('MIDI Player not ready for playback')
      return
    }

    if (isPlaying) {
      // Start playing from current time
      const allNotes = midiData.tracks.flatMap(track => track.notes)
      console.log('Starting playback with', allNotes.length, 'notes')
      playMIDINotes(allNotes, currentTime)
    } else {
      // Stop all scheduled notes
      console.log('Stopping playback')
      scheduledNotesRef.current.forEach(note => {
        Tone.Transport.clear(note)
      })
      scheduledNotesRef.current = []
      setActiveNotes([]) // Clear active notes
    }
  }, [isPlaying, midiData, isInitialized, playMIDINotes])

  // Handle seek (only when manually triggered, not during playback)
  const handleSeek = useCallback((newTime) => {
    console.log('MIDI Player: Seeking to:', newTime)
    
    if (midiData && isInitialized) {
      // Update Tone.Transport position
      Tone.Transport.seconds = newTime
      
      if (isPlaying) {
        // Clear current notes and restart from new position
        scheduledNotesRef.current.forEach(note => {
          Tone.Transport.clear(note)
        })
        scheduledNotesRef.current = []
        
        // Restart playback from new position
        const allNotes = midiData.tracks.flatMap(track => track.notes)
        playMIDINotes(allNotes, newTime)
      }
    }
  }, [isPlaying, midiData, isInitialized, playMIDINotes])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scheduledNotesRef.current.forEach(note => {
        Tone.Transport.clear(note)
      })
    }
  }, [])

  return {
    isInitialized,
    activeNotes,
    playMIDINotes,
    handleSeek
  }
}
