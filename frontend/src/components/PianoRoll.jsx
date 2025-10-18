import React, { useRef, useEffect, useState, useCallback } from 'react'
import * as Tone from 'tone'
import { useMIDI } from '../hooks/useMIDI'
import { useAudioPlayer } from '../hooks/useAudioPlayer'
import { useMIDIPlayer } from '../hooks/useMIDIPlayer'

// Utility function to format time
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const PianoRoll = ({ 
  midiFile, 
  midiData,
  stems, 
  isPlaying, 
  currentTime,
  duration,
  onSeek
}) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 }) // Default dimensions
  const [notes, setNotes] = useState([])
  const [zoom, setZoom] = useState(1.95) // Default zoom to 195% for better visibility
  const [scrollX, setScrollX] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [autoCenterMessage, setAutoCenterMessage] = useState('')
  const [isChangingMIDI, setIsChangingMIDI] = useState(false)
  const [showHorizontalScrollbar, setShowHorizontalScrollbar] = useState(false)
  const [isDraggingHorizontalScrollbar, setIsDraggingHorizontalScrollbar] = useState(false)

  // Audio player for stems
  const { 
    playStems, 
    stopStems, 
    seekToTime: setAudioTime,
    isPlaying: audioPlaying 
  } = useAudioPlayer(stems)

  // MIDI player for synthesized sounds
  const { isInitialized: midiInitialized, activeNotes, handleSeek } = useMIDIPlayer(midiData, isPlaying, currentTime)

  // Debug: Log MIDI player status (only in development)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('PianoRoll: MIDI Player initialized:', midiInitialized, 'Notes:', notes.length)
    }
  }, [midiInitialized, notes.length])

  // Update notes when MIDI data changes
  useEffect(() => {
    if (midiData) {
      setIsChangingMIDI(true) // Prevent tremolio during MIDI change
      
      const extractedNotes = extractNotesFromMIDI(midiData)
      setNotes(extractedNotes)
      // Reset scroll position when new MIDI is loaded
      setScrollX(0)
      
      // Center vertically on the notes if we have any
      if (extractedNotes.length > 0) {
        const minPitch = Math.min(...extractedNotes.map(n => n.pitch))
        const maxPitch = Math.max(...extractedNotes.map(n => n.pitch))
        const centerPitch = (minPitch + maxPitch) / 2
        
        // Auto-center calculation for new MIDI data
        
        // Calculate scroll to center the notes more precisely
        const keyHeight = 20
        const containerHeight = dimensions.height
        
        // Calculate the Y position of the center pitch (absolute position)
        const centerPitchY = (127 - centerPitch) * keyHeight
        
        // Calculate scroll to center this pitch in the viewport
        const viewportCenter = containerHeight / 2
        const targetScrollY = centerPitchY - viewportCenter
        
        // Add smaller padding for better centering
        const padding = containerHeight * 0.1 // 10% padding for better visibility
        const adjustedScrollY = targetScrollY - padding
        
        // Ensure scroll is within bounds
        const maxScrollY = Math.max(0, (128 * keyHeight) - containerHeight)
        const finalScrollY = Math.max(0, Math.min(maxScrollY, adjustedScrollY))
        
        // Calculate optimal scroll position to center notes
        
        setScrollY(finalScrollY)
        
        // Show auto-center message
        const noteRange = `${minPitch}-${maxPitch}`
        const noteNames = extractedNotes.map(n => n.noteName).slice(0, 3).join(', ')
        setAutoCenterMessage(`Auto-centrato su note: ${noteNames} (${noteRange})`)
        
        // Hide message after 3 seconds
        setTimeout(() => setAutoCenterMessage(''), 3000)
        
      } else {
        setScrollY(0)
        // Reset scroll position for new MIDI
      }
      
      // Re-enable drawing after MIDI change is complete
      setTimeout(() => setIsChangingMIDI(false), 200)
    }
  }, [midiData, dimensions.height])

  // Handle playback
  useEffect(() => {
    if (isPlaying) {
      playStems()
    } else {
      stopStems()
    }
  }, [isPlaying, playStems, stopStems])

  // Unified dimension update function
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        setDimensions({ width: rect.width, height: rect.height })
      }
    }
  }, [])

  // Update canvas dimensions with debounce to avoid tremolio
  useEffect(() => {
    let timeoutId
    const debouncedUpdate = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(updateDimensions, 100) // Debounce 100ms
    }

    updateDimensions()
    window.addEventListener('resize', debouncedUpdate)
    return () => {
      window.removeEventListener('resize', debouncedUpdate)
      clearTimeout(timeoutId)
    }
  }, [updateDimensions])

  // Extract notes from MIDI data
  const extractNotesFromMIDI = (midi) => {
    const notes = []
    
    if (midi.tracks) {
      midi.tracks.forEach((track, trackIndex) => {
        if (track.notes) {
          track.notes.forEach(note => {
            notes.push({
              id: `${trackIndex}-${note.midi}-${note.time}`,
              pitch: note.midi,
              start: note.time,
              end: note.time + note.duration,
              velocity: note.velocity,
              track: trackIndex,
              noteName: midiToNoteName(note.midi)
            })
          })
        }
      })
    }
    
    return notes.sort((a, b) => a.start - b.start)
  }

  // Convert MIDI note number to note name
  const midiToNoteName = (midi) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    const octave = Math.floor(midi / 12) - 1
    const note = noteNames[midi % 12]
    return `${note}${octave}`
  }

  // Convert time to pixels (based on BPM and grid)
  const timeToPixels = (time) => {
    const BPM = 120
    const beatsPerBar = 4
    const barsToShow = 16
    const keyWidth = 400
    const barDuration = (60 / BPM) * beatsPerBar
    const pixelsPerBeat = ((dimensions.width - keyWidth) * zoom) / (barsToShow * beatsPerBar)
    
    // Convert time to beats
    const beats = time / (60 / BPM)
    return beats * pixelsPerBeat + scrollX + keyWidth
  }

  // Convert pixels to time (based on BPM and grid)
  const pixelsToTime = (pixels) => {
    const BPM = 120
    const beatsPerBar = 4
    const barsToShow = 16
    const keyWidth = 400
    const pixelsPerBeat = ((dimensions.width - keyWidth) * zoom) / (barsToShow * beatsPerBar)
    
    // Convert pixels to beats
    const beats = (pixels - scrollX - keyWidth) / pixelsPerBeat
    return beats * (60 / BPM)
  }

  // Calculate if horizontal scrollbar should be shown
  const calculateScrollbarVisibility = useCallback(() => {
    if (!midiData || !dimensions.width) return false
    
    const BPM = 120
    const beatsPerBar = 4
    const barsToShow = 16
    const keyWidth = 400
    const availableWidth = dimensions.width - keyWidth
    
    // Calculate total content width with zoom
    const basePixelsPerBeat = availableWidth / (barsToShow * beatsPerBar)
    const zoomedPixelsPerBeat = basePixelsPerBeat * zoom
    const totalContentWidth = barsToShow * beatsPerBar * zoomedPixelsPerBeat
    
    // Show scrollbar if zoom is greater than 1.0 OR if content is wider than available space
    const shouldShow = zoom > 1.0 || totalContentWidth > availableWidth
    
    // Calculate if horizontal scrollbar should be visible
    
    return shouldShow
  }, [midiData, dimensions.width, zoom])

  // Update horizontal scrollbar visibility
  useEffect(() => {
    const shouldShow = calculateScrollbarVisibility()
    setShowHorizontalScrollbar(shouldShow)
    // Update horizontal scrollbar visibility
  }, [calculateScrollbarVisibility])

  // Convert pitch to Y position - show full range with smaller keys for more octaves
  const pitchToY = (pitch) => {
    const maxPitch = 127 // Full MIDI range
    const minPitch = 0   // Full MIDI range
    const keyHeight = 20 // Smaller keys to fit more octaves
    const containerHeight = dimensions.height
    
    // Calculate absolute Y position (without scroll)
    const absoluteY = (127 - pitch) * keyHeight
    
    // Apply scroll offset
    const scrolledY = absoluteY - scrollY
    
    // Convert pitch to Y position with scroll offset
    
    return scrolledY
  }

  // Convert Y position to pitch
  const yToPitch = (y) => {
    const maxPitch = 127 // Full MIDI range
    const minPitch = 0   // Full MIDI range
    const keyHeight = 20 // Same as pitchToY
    
    // Convert scrolled Y back to absolute Y
    const absoluteY = y + scrollY
    
    // Convert absolute Y to pitch
    const pitch = 127 - (absoluteY / keyHeight)
    
    return Math.round(Math.max(minPitch, Math.min(maxPitch, pitch)))
  }

  // Draw piano roll
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !dimensions.width || !dimensions.height) {
      return
    }

    // Draw piano roll canvas

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    
    // Enable high DPI rendering for smoother graphics
    const devicePixelRatio = window.devicePixelRatio || 1
    canvas.width = dimensions.width * devicePixelRatio
    canvas.height = dimensions.height * devicePixelRatio
    canvas.style.width = dimensions.width + 'px'
    canvas.style.height = dimensions.height + 'px'
    ctx.scale(devicePixelRatio, devicePixelRatio)
    
    // Enable anti-aliasing for smoother rendering
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // Clear canvas
    ctx.fillStyle = '#111111'
    ctx.fillRect(0, 0, dimensions.width, dimensions.height)

    // Draw grid
    drawGrid(ctx)
    
    // Draw notes
    drawNotes(ctx)
    
    // Draw playhead
    drawPlayhead(ctx)
    
    // Draw piano keys
    drawPianoKeys(ctx)
  }, [dimensions, notes, zoom, scrollX, scrollY, currentTime, activeNotes])

  // Draw professional grid like FL Studio
  const drawGrid = (ctx) => {
    const containerWidth = dimensions.width
    const containerHeight = dimensions.height

    // Grid settings
    const BPM = 120 // Beats per minute
    const beatsPerBar = 4 // 4/4 time signature
    const barsToShow = 16 // Show 16 bars
    const barDuration = (60 / BPM) * beatsPerBar // Duration of one bar in seconds
    const totalDuration = barsToShow * barDuration

    // Calculate pixels per beat
    const pixelsPerBeat = (containerWidth * zoom) / (barsToShow * beatsPerBar)
    const pixelsPerBar = pixelsPerBeat * beatsPerBar

    // Draw professional grid with time markers

    // Draw horizontal lines (one for each piano key) - start after piano keys
    const keyWidth = 400 // Same as in drawPianoKeys
    ctx.strokeStyle = '#2a2a2a'
    ctx.lineWidth = 1
    
    for (let pitch = 0; pitch <= 127; pitch++) { // Full MIDI range
      const y = pitchToY(pitch)
      if (y >= 0 && y <= containerHeight) {
        // Different line styles for white/black keys
        const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)
        const keyHeight = 20 // Same as in other functions
        
        // Calculate the exact position of each key boundary
        const keyTop = y - keyHeight/2
        const keyBottom = y + keyHeight/2
        
        if (isBlackKey) {
          // Black keys - darker background (only in grid area)
          // Make black key area smaller and centered like the actual black keys
          const blackKeyHeight = keyHeight * 0.7
          const blackKeyTop = y - blackKeyHeight/2
          ctx.fillStyle = '#1a1a1a'
          ctx.fillRect(keyWidth, blackKeyTop, containerWidth - keyWidth, blackKeyHeight)
        } else {
          // White keys - no center line, only boundary lines
          // The boundary lines will be drawn below
        }
        
        // Draw horizontal line at the top of each key (key boundary)
        ctx.strokeStyle = '#2a2a2a'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(keyWidth, keyTop)
        ctx.lineTo(containerWidth, keyTop)
        ctx.stroke()
        
        // Also draw line at the bottom of each key for complete grid
        ctx.beginPath()
        ctx.moveTo(keyWidth, keyBottom)
        ctx.lineTo(containerWidth, keyBottom)
        ctx.stroke()
      }
    }

    // Draw vertical lines (time grid)
    ctx.strokeStyle = '#444444'
    ctx.lineWidth = 1

    // Draw bars (thick lines) - start after piano keys
    for (let bar = 0; bar <= barsToShow; bar++) {
      const x = (bar * pixelsPerBar) + scrollX + keyWidth
      if (x >= keyWidth - 10 && x <= containerWidth + 10) {
        ctx.strokeStyle = '#666666'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, containerHeight)
        ctx.stroke()

        // Draw bar numbers
        ctx.fillStyle = '#888888'
        ctx.font = 'bold 16px Arial'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'top'
        ctx.fillText(`${bar + 1}`, x + 4, 2)
      }
    }

    // Draw quarter notes (beats) - medium lines
    for (let bar = 0; bar < barsToShow; bar++) {
      for (let beat = 1; beat < beatsPerBar; beat++) {
        const x = (bar * pixelsPerBar + beat * pixelsPerBeat) + scrollX + keyWidth
        if (x >= keyWidth - 10 && x <= containerWidth + 10) {
          ctx.strokeStyle = '#444444'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, 0)
          ctx.lineTo(x, containerHeight)
          ctx.stroke()
        }
      }
    }

    // Draw sixteenth notes - thin lines
    for (let bar = 0; bar < barsToShow; bar++) {
      for (let beat = 0; beat < beatsPerBar; beat++) {
        for (let sixteenth = 1; sixteenth < 4; sixteenth++) {
          const x = (bar * pixelsPerBar + beat * pixelsPerBeat + sixteenth * pixelsPerBeat / 4) + scrollX + keyWidth
          if (x >= keyWidth - 10 && x <= containerWidth + 10) {
            ctx.strokeStyle = '#333333'
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, containerHeight)
            ctx.stroke()
          }
        }
      }
    }

        // Draw time labels at the top
        ctx.fillStyle = '#aaaaaa'
        ctx.font = '14px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
    
    for (let bar = 0; bar < barsToShow; bar++) {
      for (let beat = 0; beat < beatsPerBar; beat++) {
        const x = (bar * pixelsPerBar + beat * pixelsPerBeat) + scrollX + keyWidth
        if (x >= keyWidth && x <= containerWidth) {
          const timeInSeconds = (bar * barDuration) + (beat * barDuration / beatsPerBar)
          const minutes = Math.floor(timeInSeconds / 60)
          const seconds = Math.floor(timeInSeconds % 60)
          const timeLabel = `${minutes}:${seconds.toString().padStart(2, '0')}`
          
          ctx.fillText(timeLabel, x, 20)
        }
      }
    }

    // Grid drawing completed
  }

  // Draw notes - larger and more visible
  const drawNotes = (ctx) => {
    const containerWidth = dimensions.width
    const containerHeight = dimensions.height
    const keyWidth = 400
    
    // Draw MIDI notes on canvas
    
    notes.forEach(note => {
      // Show all notes in the full MIDI range
      // No filtering needed - we show the full range
      
      const x = timeToPixels(note.start)
      const y = pitchToY(note.pitch)
      const width = Math.max(timeToPixels(note.end) - timeToPixels(note.start), 4) // Minimum width of 4 pixels
      
      // Calculate note height to fill exactly one key space
      const keyHeight = 20 // Same as in pitchToY and drawPianoKeys
      const height = keyHeight // Full key height
      
      // Calculate Y position to fill the space between two consecutive key lines
      const noteY = y - keyHeight/2 // Start from the top of the key space (keyTop)

      // Calculate note position and visibility

      // Check if note is visible in the current viewport
      if (x + width > keyWidth && x < containerWidth && y > 0 && y < containerHeight) {
        // Note color based on velocity with better contrast
        const intensity = note.velocity / 127
        const hue = (note.pitch * 2.8) % 360
        const saturation = 90
        const lightness = 50 + intensity * 20
        
        // Main note body - fill the entire key space
        ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
        ctx.fillRect(x, noteY, width, height)
        // Draw note rectangle with color based on pitch and velocity

        // Note border with better visibility
        ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness + 20}%)`
        ctx.lineWidth = 1
        ctx.strokeRect(x, noteY, width, height)

        // Inner highlight for 3D effect
        ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness + 15}%, 0.3)`
        ctx.fillRect(x + 1, noteY + 1, width - 2, height/3)

        // Note name (always show for better visibility)
        if (width > 10) {
          ctx.fillStyle = '#ffffff'
          ctx.font = 'bold 12px Arial'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(note.noteName, x + width/2, y)
        }
        
        // Velocity indicator (small bar on the right)
        if (width > 20) {
          const velocityBarWidth = 3
          const velocityBarHeight = height * intensity
          ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness + 30}%)`
          ctx.fillRect(x + width - velocityBarWidth, noteY + (height - velocityBarHeight)/2, velocityBarWidth, velocityBarHeight)
        }
      }
    })
  }

  // Draw playhead with smoother rendering
  const drawPlayhead = (ctx) => {
    const x = timeToPixels(currentTime)
    const containerWidth = dimensions.width
    const containerHeight = dimensions.height
    const keyWidth = 400
    
    // Only draw the playhead if it's in the visible area (after piano keys)
    if (x >= keyWidth && x <= containerWidth) {
      // Enable anti-aliasing for smoother lines
      ctx.imageSmoothingEnabled = true
      
      // Draw playhead line with anti-aliasing
      ctx.strokeStyle = '#ff4444'
      ctx.lineWidth = 3
      ctx.lineCap = 'round' // Rounded line caps for smoother appearance
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0) // +0.5 for pixel-perfect rendering
      ctx.lineTo(x + 0.5, containerHeight)
      ctx.stroke()
      
      // Draw playhead handle (draggable area) with smoother rendering
      const handleSize = 12
      ctx.fillStyle = '#ff4444'
      ctx.fillRect(x - handleSize/2 + 0.5, 0.5, handleSize, handleSize)
      
      // Draw handle border with anti-aliasing
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.strokeRect(x - handleSize/2 + 0.5, 0.5, handleSize, handleSize)
      
      // Add time indicator on the handle (only update every 100ms for performance)
      const timeForDisplay = Math.floor(currentTime * 10) / 10 // Round to 0.1s
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 8px monospace'
      ctx.textAlign = 'center'
      
      const seconds = Math.floor(timeForDisplay)
      const milliseconds = Math.floor((timeForDisplay - seconds) * 1000)
      const timeLabel = `${seconds}s ${milliseconds}ms`
      
      ctx.fillText(timeLabel, x, handleSize - 2)
      
      // Draw larger time display below the handle
      ctx.fillStyle = '#ff4444'
      ctx.font = 'bold 14px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillText(timeLabel, x, handleSize + 5)
    }
    
    // Draw playhead at current time position
  }

  // Draw professional piano keys like FL Studio
  const drawPianoKeys = (ctx) => {
    const keyWidth = 400 // Back to reasonable width
    const containerHeight = dimensions.height
    const keyHeight = 20 // Smaller keys to fit more octaves

    // Draw white keys first (background)
    for (let pitch = 0; pitch <= 127; pitch++) { // Full MIDI range
      const y = pitchToY(pitch)
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)
      const isActive = activeNotes.includes(pitch)
      
      if (!isBlackKey) {
        // Calculate exact key boundaries
        const keyTop = y - keyHeight/2
        const keyBottom = y + keyHeight/2
        
        // White key
        if (isActive) {
          ctx.fillStyle = '#4a9eff' // Blue highlight for active white keys
        } else {
          ctx.fillStyle = '#f0f0f0' // Light gray for white keys
        }
        ctx.fillRect(0, keyTop, keyWidth, keyHeight)
        
        // White key border
        ctx.strokeStyle = isActive ? '#ffffff' : '#cccccc'
        ctx.lineWidth = 1
        ctx.strokeRect(0, keyTop, keyWidth, keyHeight)
        
        // Note name for white keys
        if (keyHeight > 12) {
          const noteNames = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
          const noteIndex = [0, 2, 4, 5, 7, 9, 11].indexOf(pitch % 12)
          if (noteIndex !== -1) {
            ctx.fillStyle = isActive ? '#ffffff' : '#333333'
            ctx.font = 'bold 12px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(noteNames[noteIndex], keyWidth / 2, y)
          }
        }
      }
    }

    // Draw black keys on top
    for (let pitch = 0; pitch <= 127; pitch++) { // Full MIDI range
      const y = pitchToY(pitch)
      const isBlackKey = [1, 3, 6, 8, 10].includes(pitch % 12)
      const isActive = activeNotes.includes(pitch)
      
      if (isBlackKey) {
        // Black key (smaller and raised)
        const blackKeyWidth = keyWidth * 0.6
        const blackKeyHeight = keyHeight * 0.7
        
        // Calculate exact black key boundaries - position them correctly relative to white keys
        const blackKeyTop = y - blackKeyHeight/2
        const blackKeyBottom = y + blackKeyHeight/2
        
        if (isActive) {
          ctx.fillStyle = '#ff6b6b' // Red highlight for active black keys
        } else {
          ctx.fillStyle = '#2a2a2a' // Dark gray for black keys
        }
        ctx.fillRect(0, blackKeyTop, blackKeyWidth, blackKeyHeight)
        
        // Black key border
        ctx.strokeStyle = isActive ? '#ffffff' : '#444444'
        ctx.lineWidth = 1
        ctx.strokeRect(0, blackKeyTop, blackKeyWidth, blackKeyHeight)
        
        // Note name for black keys (sharps)
        if (blackKeyHeight > 10) {
          const sharpNames = ['C#', 'D#', 'F#', 'G#', 'A#']
          const sharpIndex = [1, 3, 6, 8, 10].indexOf(pitch % 12)
          if (sharpIndex !== -1) {
            ctx.fillStyle = isActive ? '#ffffff' : '#cccccc'
            ctx.font = 'bold 10px Arial'
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(sharpNames[sharpIndex], blackKeyWidth / 2, y)
          }
        }
      }
    }

    // Draw octave separators
    ctx.strokeStyle = '#666666'
    ctx.lineWidth = 2
    for (let octave = 0; octave <= 10; octave++) { // Full range C-1 to C9
      const pitch = octave * 12
      const y = pitchToY(pitch)
      if (y >= 0 && y <= containerHeight) {
        // Calculate exact key boundaries for octave separator
        const keyTop = y - keyHeight/2
        
        ctx.beginPath()
        ctx.moveTo(keyWidth, keyTop)
        ctx.lineTo(keyWidth + 5, keyTop)
        ctx.stroke()
        
        // Octave number
        ctx.fillStyle = '#888888'
        ctx.font = 'bold 12px Arial'
        ctx.textAlign = 'left'
        ctx.textBaseline = 'middle'
        ctx.fillText(`C${octave - 1}`, keyWidth + 8, y)
      }
    }
  }

  // Handle mouse events
  const handleMouseDown = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const keyWidth = 400
    
    // Check if clicking on horizontal scrollbar
    if (showHorizontalScrollbar && y >= dimensions.height - 10 && x >= keyWidth) {
      setIsDraggingHorizontalScrollbar(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      // Start horizontal scrollbar drag
      return
    }
    
    // Check if clicking on playhead handle (allow clicking even if playhead is outside visible area)
    const playheadX = timeToPixels(currentTime) + scrollX
    const handleSize = 12
    const isOnPlayhead = Math.abs(x - playheadX) <= handleSize/2 && y <= handleSize
    
    if (isOnPlayhead) {
      // Start dragging playhead
      setIsDraggingPlayhead(true)
      // Start playhead drag
    } else {
      // Start dragging canvas
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e) => {
    if (isDraggingHorizontalScrollbar) {
      // Handle horizontal scrollbar dragging
      const deltaX = e.clientX - dragStart.x
      const keyWidth = 400
      const availableWidth = dimensions.width - keyWidth
      const BPM = 120
      const beatsPerBar = 4
      const barsToShow = 16
      const pixelsPerBeat = (availableWidth * zoom) / (barsToShow * beatsPerBar)
      const totalContentWidth = barsToShow * beatsPerBar * pixelsPerBeat
      const maxScrollX = Math.min(0, availableWidth - totalContentWidth)
      
      // Convert mouse movement to scroll movement
      const scrollDelta = (deltaX / availableWidth) * Math.abs(maxScrollX)
      
      setScrollX(prev => {
        const newScrollX = prev - scrollDelta
        return Math.max(maxScrollX, Math.min(0, newScrollX))
      })
      
      setDragStart({ x: e.clientX, y: e.clientY })
    } else if (isDraggingPlayhead) {
      // Handle playhead dragging with throttling for better performance
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      
      const x = e.clientX - rect.left
      const newTime = pixelsToTime(x - scrollX)
      const clampedTime = Math.max(0, Math.min(duration || 10, newTime))
      
      // Throttle updates to improve performance
      if (Date.now() - (handleMouseMove.lastUpdate || 0) > 16) { // ~60fps
        // Update playhead position during drag
        
        // Update current time through onSeek callback
        if (onSeek) {
          onSeek(clampedTime)
        }
        handleMouseMove.lastUpdate = Date.now()
      }
    } else if (isDragging) {
      // Handle canvas dragging with scroll limits
      const deltaX = e.clientX - dragStart.x
      const deltaY = e.clientY - dragStart.y
      
      // Limit horizontal scroll to prevent going before time 0
      setScrollX(prev => {
        const newScrollX = prev - deltaX
        // Don't allow scrolling before time 0 (scrollX should not be positive)
        return Math.min(0, newScrollX)
      })
      
      setScrollY(prev => prev + deltaY)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setIsDraggingPlayhead(false)
    setIsDraggingHorizontalScrollbar(false)
    // Reset throttling
    handleMouseMove.lastUpdate = 0
  }

  // Handle wheel events for zoom and scroll with smooth scrolling
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    
    // Throttle wheel events for smoother scrolling
    const now = Date.now()
    if (handleWheel.lastUpdate && now - handleWheel.lastUpdate < 16) { // ~60fps
      return
    }
    handleWheel.lastUpdate = now
    
    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd + wheel for zoom
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      setZoom(prev => {
        const newZoom = Math.max(0.1, Math.min(10, prev * delta))
        // Update zoom level
        return newZoom
      })
    } else if (e.shiftKey) {
      // Shift + wheel for horizontal scroll
      const scrollDelta = e.deltaY > 0 ? 50 : -50
      setScrollX(prev => {
        const newScrollX = prev - scrollDelta
        // Limit scroll to prevent going before time 0
        return Math.min(0, newScrollX)
      })
    } else {
      // Normal wheel for vertical scroll through piano octaves
      const scrollDelta = e.deltaY * 0.2 // Very smooth scroll speed
      const keyHeight = 20
      const maxScrollY = (128 * keyHeight) - dimensions.height // Total height - visible height
      setScrollY(prev => {
        const newScrollY = prev + scrollDelta
        return Math.max(0, Math.min(maxScrollY, newScrollY))
      })
    }
  }, [dimensions.height])

  // Add wheel event listener with passive: false to allow preventDefault
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const wheelHandler = (e) => {
      handleWheel(e)
    }

    // Add event listener with passive: false
    container.addEventListener('wheel', wheelHandler, { passive: false })

    return () => {
      container.removeEventListener('wheel', wheelHandler)
    }
  }, [handleWheel])


  // Initialize canvas dimensions with multiple attempts
  useEffect(() => {
    // Multiple attempts to ensure dimensions are captured
    const timeouts = [100, 300, 500, 1000].map(delay => 
      setTimeout(updateDimensions, delay)
    )
    
    window.addEventListener('resize', updateDimensions)
    return () => {
      timeouts.forEach(clearTimeout)
      window.removeEventListener('resize', updateDimensions)
    }
  }, [updateDimensions])

  // Update dimensions when MIDI data changes
  useEffect(() => {
    if (midiData) {
      // Update dimensions when new MIDI data is loaded
      setTimeout(updateDimensions, 100)
      setTimeout(updateDimensions, 300)
    }
  }, [midiData, updateDimensions])

  // Update canvas dimensions when zoom changes
  useEffect(() => {
    const updateCanvasSize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const canvas = canvasRef.current
        canvas.width = rect.width * zoom
        canvas.height = rect.height
        // Canvas resized for zoom level
      }
    }

    updateCanvasSize()
  }, [zoom])

  // Add wheel event listener with passive: false
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  // Redraw when dependencies change (with debounce to avoid tremolio)
  useEffect(() => {
    // Skip drawing during MIDI changes to prevent tremolio
    if (isChangingMIDI) {
      // Skip drawing during MIDI change to prevent flicker
      return
    }
    
    // Trigger canvas redraw
    // Add a longer delay to avoid tremolio during rapid state changes
    const timeoutId = setTimeout(() => {
      draw()
    }, 100) // Increased from 50ms to 100ms
    
    return () => clearTimeout(timeoutId)
  }, [draw, isChangingMIDI])

  // Force dimension update when dimensions are too small
  useEffect(() => {
    if (dimensions.width < 500 || dimensions.height < 200) {
      // Force dimension update for small containers
      setTimeout(updateDimensions, 200)
      setTimeout(updateDimensions, 500)
    }
  }, [dimensions, updateDimensions])

  // Redraw when currentTime changes (for playhead movement) - optimized for smoothness
  useEffect(() => {
    if (isPlaying) {
      // Direct redraw for smooth playhead movement during playback
      // Redraw playhead for time changes
      draw()
    } else if (isDraggingPlayhead) {
      // Only redraw playhead during dragging, not the entire canvas
      draw()
    }
  }, [currentTime, isPlaying, isDraggingPlayhead, draw])

  if (!midiData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Caricamento MIDI...</p>
          <p className="text-xs text-gray-500 mt-2">File: {midiFile}</p>
        </div>
      </div>
    )
  }

  if (notes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Nessuna nota trovata nel MIDI</p>
          <p className="text-xs text-gray-500 mt-2">File: {midiFile}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Piano Roll Controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-400">
            Zoom: {(zoom * 100).toFixed(0)}%
          </span>
          <span className="text-sm text-gray-400">
            Note: {notes.length}
          </span>
          <span className={`text-sm ${midiInitialized ? 'text-green-400' : 'text-yellow-400'}`}>
            MIDI: {midiInitialized ? 'Ready' : 'Loading...'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            title="Zoom Out"
          >
            -
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            title="Reset Zoom"
          >
            100%
          </button>
          <button
            onClick={() => setZoom(prev => Math.min(5, prev * 1.25))}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm"
            title="Zoom In"
          >
            +
          </button>
          
          {/* Horizontal scroll buttons - Show when zoom > 1.0 */}
          {zoom > 1.0 && (() => {
            const keyWidth = 400
            const availableWidth = dimensions.width - keyWidth
            const BPM = 120
            const beatsPerBar = 4
            const barsToShow = 16
            const basePixelsPerBeat = availableWidth / (barsToShow * beatsPerBar)
            const zoomedPixelsPerBeat = basePixelsPerBeat * zoom
            const totalContentWidth = barsToShow * beatsPerBar * zoomedPixelsPerBeat
            const maxScrollX = Math.min(0, availableWidth - totalContentWidth)
            
            const scrollStep = 50 // Pixels to scroll per click
            
            const handleScrollLeft = () => {
              setScrollX(prev => {
                const newScrollX = prev + scrollStep
                return Math.min(0, newScrollX) // Don't allow positive scrollX
              })
            }
            
            const handleScrollRight = () => {
              setScrollX(prev => {
                const newScrollX = prev - scrollStep
                return Math.max(maxScrollX, newScrollX) // Don't scroll beyond max
              })
            }
            
            return (
              <div className="flex items-center space-x-1 ml-4">
                {/* Left arrow button */}
                <button
                  onClick={handleScrollLeft}
                  disabled={scrollX >= 0}
                  className="w-6 h-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded flex items-center justify-center transition-colors duration-200"
                  title="Scorri a sinistra"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Right arrow button */}
                <button
                  onClick={handleScrollRight}
                  disabled={scrollX <= maxScrollX}
                  className="w-6 h-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded flex items-center justify-center transition-colors duration-200"
                  title="Scorri a destra"
                >
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )
          })()}
          
          <span className="text-xs text-gray-500 ml-2">
            (Ctrl + rotella per zoom)
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <div 
          className="w-full h-2 bg-gray-700 rounded cursor-pointer relative"
          onClick={(e) => {
            if (!duration) {
              // No duration available for timeline click
              return
            }
            const rect = e.currentTarget.getBoundingClientRect()
            const clickX = e.clientX - rect.left
            const clickTime = (clickX / rect.width) * duration
            // Handle timeline click for seeking
            
            // Call onSeek from parent
            if (onSeek) {
              onSeek(clickTime)
            } else {
              // onSeek callback not available
            }
            
            // Also handle MIDI seek if playing
            if (isPlaying && handleSeek) {
              // Handle MIDI seek during playback
              handleSeek(clickTime)
            }
          }}
        >
          <div 
            className="h-full bg-blue-500 rounded"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Piano Roll Canvas */}
      <div 
        ref={containerRef}
        className="flex-1 piano-roll-container relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ touchAction: 'none', minHeight: '400px' }}
      >
        <canvas
          ref={canvasRef}
          className={`w-full h-full ${isDraggingPlayhead ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ touchAction: 'none' }}
        />
        {/* Vertical scrollbar indicator */}
        <div 
          className="absolute right-2 top-0 w-3 h-full bg-gray-600 bg-opacity-50 rounded pointer-events-none border border-gray-500"
          style={{
            zIndex: 1000, // Ensure it's on top
          }}
        >
          <div
            className="absolute w-full bg-blue-500 rounded transition-all duration-100 border border-blue-300"
            style={{
              top: `${(scrollY / ((128 * 20) - dimensions.height)) * 100}%`,
              height: `${(dimensions.height / (128 * 20)) * 100}%`,
            }}
          />
        </div>

        
        {/* Octave indicator */}
        <div 
          className="absolute right-4 top-2 text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded pointer-events-none"
        >
          {(() => {
            const keyHeight = 20
            const centerY = dimensions.height / 2
            const centerPitch = 127 - ((centerY + scrollY) / keyHeight)
            const octave = Math.floor(centerPitch / 12) - 1
            return `C${octave}`
          })()}
        </div>
        
        {/* Auto-center message */}
        {autoCenterMessage && (
          <div className="absolute left-2 top-2 bg-green-600 bg-opacity-90 text-white text-xs px-3 py-2 rounded shadow-lg pointer-events-none">
            {autoCenterMessage}
          </div>
        )}
        
        {/* Manual center button */}
        {notes.length > 0 && (
          <button
            onClick={() => {
              if (notes.length > 0) {
                const minPitch = Math.min(...notes.map(n => n.pitch))
                const maxPitch = Math.max(...notes.map(n => n.pitch))
                const centerPitch = (minPitch + maxPitch) / 2
                
                const keyHeight = 20
                const containerHeight = dimensions.height
                const centerPitchY = (127 - centerPitch) * keyHeight
                const viewportCenter = containerHeight / 2
                const targetScrollY = centerPitchY - viewportCenter
                const padding = containerHeight * 0.3
                const adjustedScrollY = targetScrollY - padding
                const maxScrollY = Math.max(0, (128 * keyHeight) - containerHeight)
                const finalScrollY = Math.max(0, Math.min(maxScrollY, adjustedScrollY))
                
                setScrollY(finalScrollY)
                setAutoCenterMessage(`Centrato manualmente su note: ${minPitch}-${maxPitch}`)
                setTimeout(() => setAutoCenterMessage(''), 2000)
              }
            }}
            className="absolute left-2 bottom-2 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded shadow-lg transition-colors"
            title="Centra sulle note"
          >
            🎯 Centra
          </button>
        )}
        
        {/* Debug info for horizontal scrollbar */}
        <div className="absolute right-2 bottom-2 bg-red-600 bg-opacity-90 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Scrollbar: {showHorizontalScrollbar ? 'ON' : 'OFF'} | Zoom: {Math.round(zoom * 100)}%
        </div>
      </div>
    </div>
  )
}

export default PianoRoll
