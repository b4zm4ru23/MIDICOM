import { useState, useEffect, useRef, useCallback } from 'react'
import * as Tone from 'tone'
import { devLog } from '../utils/logger'

// Backend API configuration
const API_BASE_URL = 'http://localhost:8000'

export const useAudioPlayer = (stems) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stemVolumes, setStemVolumes] = useState({})
  const [stemMutes, setStemMutes] = useState({})
  const playersRef = useRef({})
  const animationFrameRef = useRef(null)

  // Initialize Tone.js players for each stem
  useEffect(() => {
    if (!stems || Object.keys(stems).length === 0) return

    const initializePlayers = async () => {
      setLoading(true)
      setError(null)

      try {
        // Only initialize if AudioContext is already running
        if (Tone.context.state !== 'running') {
          devLog('AudioContext not ready, skipping audio player initialization')
          setLoading(false)
          return
        }

        // Create players for each stem
        const stemEntries = Object.entries(stems)
        devLog('Initializing audio players for stems:', stemEntries.map(([name]) => name))

        for (const [name, path] of stemEntries) {
          if (playersRef.current[name]) {
            playersRef.current[name].dispose()
          }
          
          // Handle both local file paths and backend URLs
          let audioUrl = path
          if (typeof path === 'string' && !path.startsWith('http') && !path.startsWith('blob:')) {
            // If it's a local file path, try to get it from backend
            audioUrl = `${API_BASE_URL}/stems/${path}`
          }
          
          playersRef.current[name] = new Tone.Player({
            url: audioUrl,
            onload: () => {
              devLog(`Stem ${name} loaded successfully`)
              // Set duration from the first loaded stem
              if (Object.keys(stemVolumes).length === 0) {
                setDuration(playersRef.current[name].buffer.duration)
              }
              // Initialize stem states
              setStemVolumes(prev => ({ ...prev, [name]: 1.0 }))
              setStemMutes(prev => ({ ...prev, [name]: false }))
            },
            onerror: (error) => {
              console.error(`Error loading stem ${name}:`, error)
              setError(`Failed to load ${name} stem`)
            }
          }).toDestination()

          // Set initial volume (quieter for multiple stems)
          const volumeOffset = Object.keys(playersRef.current).length * -3
          playersRef.current[name].volume.value = -10 + volumeOffset
        }

        // Set up transport
        Tone.Transport.bpm.value = 120
        Tone.Transport.timeSignature = [4, 4]

        devLog('Audio players initialized successfully')
      } catch (error) {
        console.error('Error initializing audio players:', error)
        setError('Failed to initialize audio players')
      } finally {
        setLoading(false)
      }
    }

    initializePlayers()

    // Cleanup
    return () => {
      Object.values(playersRef.current).forEach(player => {
        if (player) player.dispose()
      })
      playersRef.current = {}
      setStemVolumes({})
      setStemMutes({})
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
      // Ensure AudioContext is started
      if (Tone.context.state !== 'running') {
        await Tone.start()
        console.log('✅ AudioContext started for stems playback')
      }

      // Play all loaded stems that are not muted
      if (Object.keys(playersRef.current).length > 0) {
        Object.entries(playersRef.current).forEach(([name, player]) => {
          if (player && player.loaded && !stemMutes[name]) {
            devLog(`Starting playback for stem: ${name}`)
            player.start()
          }
        })
      }

      // Start transport (this will trigger the playhead movement)
      Tone.Transport.start()
      setIsPlaying(true)
      devLog('Audio stems playback started')
    } catch (error) {
      console.error('Error playing stems:', error)
      setError('Failed to start audio playback')
    }
  }, [stemMutes])

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
      setStemVolumes(prev => ({ ...prev, [stemName]: volume }))
    }
  }, [])

  const setMute = useCallback((stemName, muted) => {
    if (playersRef.current[stemName]) {
      playersRef.current[stemName].mute = muted
      setStemMutes(prev => ({ ...prev, [stemName]: muted }))
    }
  }, [])

  return {
    isPlaying,
    currentTime,
    duration,
    loading,
    error,
    stemVolumes,
    stemMutes,
    playStems,
    stopStems,
    pauseStems,
    seekToTime,
    setVolume,
    setMute
  }
}
