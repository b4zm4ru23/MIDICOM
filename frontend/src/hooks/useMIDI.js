import { useState, useEffect } from 'react'

export const useMIDI = (midiFile) => {
  const [midiData, setMidiData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!midiFile) {
      setMidiData(null)
      return
    }

    const loadMIDI = async () => {
      setLoading(true)
      setError(null)

      try {
        // Loading MIDI file
        
        // Create different mock data based on the file name for testing
        const getMockMidiData = (fileName) => {
          const baseName = fileName.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          if (baseName.includes('chord') || baseName.includes('accordi')) {
            // Chord progression test
            return {
              duration: 12.0,
              tracks: [
                {
                  name: 'Chords',
                  notes: [
                    // C Major chord
                    { midi: 60, time: 0, duration: 2, velocity: 80 }, // C4
                    { midi: 64, time: 0, duration: 2, velocity: 75 }, // E4
                    { midi: 67, time: 0, duration: 2, velocity: 82 }, // G4
                    // F Major chord
                    { midi: 65, time: 2, duration: 2, velocity: 80 }, // F4
                    { midi: 69, time: 2, duration: 2, velocity: 75 }, // A4
                    { midi: 72, time: 2, duration: 2, velocity: 82 }, // C5
                    // G Major chord
                    { midi: 67, time: 4, duration: 2, velocity: 80 }, // G4
                    { midi: 71, time: 4, duration: 2, velocity: 75 }, // B4
                    { midi: 74, time: 4, duration: 2, velocity: 82 }, // D5
                    // Am chord
                    { midi: 69, time: 6, duration: 2, velocity: 80 }, // A4
                    { midi: 72, time: 6, duration: 2, velocity: 75 }, // C5
                    { midi: 76, time: 6, duration: 2, velocity: 82 }, // E5
                  ]
                }
              ]
            }
          } else if (baseName.includes('scale') || baseName.includes('scala')) {
            // Scale test
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
            // Drum pattern test
            return {
              duration: 4.0,
              tracks: [
                {
                  name: 'Drums',
                  notes: [
                    // Kick drum (C2)
                    { midi: 36, time: 0, duration: 0.1, velocity: 100 }, // Kick
                    { midi: 36, time: 1, duration: 0.1, velocity: 100 }, // Kick
                    { midi: 36, time: 2, duration: 0.1, velocity: 100 }, // Kick
                    { midi: 36, time: 3, duration: 0.1, velocity: 100 }, // Kick
                    // Snare (D2)
                    { midi: 38, time: 0.5, duration: 0.1, velocity: 80 }, // Snare
                    { midi: 38, time: 1.5, duration: 0.1, velocity: 80 }, // Snare
                    { midi: 38, time: 2.5, duration: 0.1, velocity: 80 }, // Snare
                    { midi: 38, time: 3.5, duration: 0.1, velocity: 80 }, // Snare
                    // Hi-hat (F#2)
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
            // Default melody (original)
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

        const mockMidiData = getMockMidiData(midiFile)

        // Simulate loading delay
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // MIDI data loaded successfully
        setMidiData(mockMidiData)
      } catch (err) {
        setError(err.message)
        console.error('Error loading MIDI:', err)
      } finally {
        setLoading(false)
      }
    }

    loadMIDI()
  }, [midiFile])

  return { midiData, loading, error }
}
