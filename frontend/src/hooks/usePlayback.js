import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export const usePlayback = (midiData) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const animationFrameRef = useRef(null)
  const startTimeRef = useRef(0)
  const pausedTimeRef = useRef(0)

  // Set duration and reset playhead when MIDI data changes
  useEffect(() => {
    if (midiData) {
      setDuration(midiData.duration || 10)
      // Reset playhead to beginning when new MIDI is loaded
      setCurrentTime(0)
      pausedTimeRef.current = 0
      // Also reset Tone.Transport position
      try {
        Tone.Transport.seconds = 0
      } catch (error) {
        console.error('Error resetting Tone.Transport:', error)
      }
      // Reset playhead for new MIDI
    } else {
      // Reset everything when MIDI is cleared
      setDuration(0)
      setCurrentTime(0)
      pausedTimeRef.current = 0
      setIsPlaying(false)
      // Clear playback state
    }
  }, [midiData])

  // Update current time during playback with higher frequency for smoother playhead
  const updateCurrentTime = useCallback(() => {
    if (isPlaying) {
      // Calculate time based on actual elapsed time since start
      const now = Tone.now()
      const elapsed = now - startTimeRef.current
      const newTime = Math.min(pausedTimeRef.current + elapsed, duration)
      
      // Always update currentTime for smoother playhead movement
      setCurrentTime(newTime)
      
      // Update current time for playhead
      
      if (newTime < duration) {
        // Use requestAnimationFrame for 60fps smooth updates
        animationFrameRef.current = requestAnimationFrame(updateCurrentTime)
      } else {
        // Reached end
        setIsPlaying(false)
        setCurrentTime(0)
        pausedTimeRef.current = 0
      }
    }
  }, [isPlaying, duration])

  // Start/stop animation loop
  useEffect(() => {
    if (isPlaying) {
      startTimeRef.current = Tone.now()
      updateCurrentTime()
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, updateCurrentTime])

  const play = useCallback(async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }
      
      // Set Tone.Transport to current time before starting
      Tone.Transport.seconds = currentTime
      
      // Update start time reference for smooth playhead movement
      startTimeRef.current = Tone.now()
      pausedTimeRef.current = currentTime
      
      setIsPlaying(true)
      // Start playback from current time
    } catch (error) {
      console.error('Error starting playback:', error)
    }
  }, [currentTime])

  const pause = useCallback(() => {
    setIsPlaying(false)
    pausedTimeRef.current = currentTime
    // Pause playback
  }, [currentTime])

  const stop = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
    pausedTimeRef.current = 0
  }, [])

  const seek = useCallback((time) => {
    // Seek to specified time
    setCurrentTime(time)
    pausedTimeRef.current = time
    // Also update Tone.Transport position
    try {
      Tone.Transport.seconds = time
    } catch (error) {
      console.error('Error seeking Tone.Transport:', error)
    }
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    play,
    pause,
    stop,
    seek
  }
}
