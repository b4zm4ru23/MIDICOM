import React, { useState, useCallback } from 'react'
import { Play, Volume2 } from 'lucide-react'
import * as Tone from 'tone'

/**
 * AudioInitializer Component
 * 
 * Handles the initialization of Tone.js AudioContext
 * which requires user interaction due to browser security policies
 */
const AudioInitializer = ({ onInitialized, children }) => {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)

  const initializeAudio = useCallback(async () => {
    if (isInitialized || isInitializing) return

    setIsInitializing(true)
    
    try {
      // Start Tone.js AudioContext
      await Tone.start()
      console.log('✅ AudioContext initialized successfully')
      
      // Wait a bit for Tone.js to fully initialize
      await new Promise(resolve => setTimeout(resolve, 100))
      
      setIsInitialized(true)
      onInitialized?.(true)
    } catch (error) {
      console.error('❌ Failed to initialize AudioContext:', error)
      onInitialized?.(false)
    } finally {
      setIsInitializing(false)
    }
  }, [isInitialized, isInitializing, onInitialized])

  // If already initialized, render children
  if (isInitialized) {
    return children
  }

  // Show initialization button
  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center z-50">
      <div className="text-center p-8 bg-gray-800 rounded-lg border border-gray-700 max-w-md">
        <div className="mb-6">
          <Volume2 className="h-16 w-16 mx-auto text-blue-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Initialize Audio
          </h2>
          <p className="text-gray-300 text-sm">
            Click the button below to initialize the audio system.
            This is required by your browser for security reasons.
          </p>
        </div>
        
        <button
          onClick={initializeAudio}
          disabled={isInitializing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-4 px-6 rounded-lg font-medium transition-colors flex items-center justify-center space-x-3"
        >
          {isInitializing ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
              <span>Initializing...</span>
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              <span>Initialize Audio</span>
            </>
          )}
        </button>
        
        <p className="text-xs text-gray-500 mt-4">
          This will enable MIDI playback and audio processing features.
        </p>
      </div>
    </div>
  )
}

export default AudioInitializer
