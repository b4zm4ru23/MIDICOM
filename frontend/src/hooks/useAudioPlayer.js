import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'

export const useAudioPlayer = (stems) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const playersRef = useRef({})
  const animationFrameRef = useRef(null)

  // Initialize Tone.js players for each stem
  useEffect(() => {
    if (!stems || Object.keys(stems).length === 0) return

    const initializePlayers = async () => {
      try {
        // Initialize Tone.js
        if (Tone.context.state !== 'running') {
          await Tone.start()
        }

        // Create players for each stem
        Object.entries(stems).forEach(([name, path]) => {
          if (playersRef.current[name]) {
            playersRef.current[name].dispose()
          }
          
          playersRef.current[name] = new Tone.Player({
            url: path,
            onload: () => {
              console.log(`Loaded stem: ${name}`)
              if (name === 'drums') {
                setDuration(playersRef.current[name].buffer.duration)
              }
            },
            onerror: (error) => {
              console.error(`Error loading stem ${name}:`, error)
            }
          }).toDestination()
        })

        // Set up transport
        Tone.Transport.bpm.value = 120
        Tone.Transport.timeSignature = [4, 4]

      } catch (error) {
        console.error('Error initializing audio players:', error)
      }
    }

    initializePlayers()

    // Cleanup
    return () => {
      Object.values(playersRef.current).forEach(player => {
        if (player) player.dispose()
      })
      playersRef.current = {}
    }
  }, [stems])

  // Update current time during playback
  const updateCurrentTime = useCallback(() => {
    if (isPlaying) {
      setCurrentTime(Tone.Transport.seconds)
      animationFrameRef.current = requestAnimationFrame(updateCurrentTime)
    }
  }, [isPlaying])

  useEffect(() => {
    if (isPlaying) {
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

  const playStems = useCallback(async () => {
    try {
      if (Tone.context.state !== 'running') {
        await Tone.start()
      }

      // If we have real stems, play them
      if (Object.keys(playersRef.current).length > 0) {
        Object.values(playersRef.current).forEach(player => {
          if (player && player.loaded) {
            player.start()
          }
        })
      }

      // Start transport (this will trigger the playhead movement)
      Tone.Transport.start()
      setIsPlaying(true)
    } catch (error) {
      console.error('Error playing stems:', error)
    }
  }, [])

  const stopStems = useCallback(() => {
    try {
      // Stop all players
      Object.values(playersRef.current).forEach(player => {
        if (player) {
          player.stop()
        }
      })

      // Stop transport
      Tone.Transport.stop()
      Tone.Transport.seconds = 0
      setIsPlaying(false)
      setCurrentTime(0)
    } catch (error) {
      console.error('Error stopping stems:', error)
    }
  }, [])

  const pauseStems = useCallback(() => {
    try {
      Tone.Transport.pause()
      setIsPlaying(false)
    } catch (error) {
      console.error('Error pausing stems:', error)
    }
  }, [])

  const seekToTime = useCallback((time) => {
    try {
      Tone.Transport.seconds = time
      setCurrentTime(time)
    } catch (error) {
      console.error('Error setting current time:', error)
    }
  }, [])

  const setVolume = useCallback((stemName, volume) => {
    if (playersRef.current[stemName]) {
      playersRef.current[stemName].volume.value = Tone.gainToDb(volume)
    }
  }, [])

  const setMute = useCallback((stemName, muted) => {
    if (playersRef.current[stemName]) {
      playersRef.current[stemName].mute = muted
    }
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    playStems,
    stopStems,
    pauseStems,
    seekToTime,
    setVolume,
    setMute
  }
}
