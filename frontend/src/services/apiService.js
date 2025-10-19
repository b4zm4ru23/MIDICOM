// API service for backend communication
import { devWarn } from '../utils/logger'

const API_BASE_URL = 'http://localhost:8000'

/**
 * Upload audio file to backend for processing
 * @param {File} file - Audio file to upload
 * @param {string} separationModel - Model for audio separation (default: 'htdemucs')
 * @param {string} transcriptionMethod - Method for MIDI transcription (default: 'librosa')
 * @returns {Promise<Object>} Upload result
 */
export const uploadAudioFile = async (file, separationModel = 'htdemucs', transcriptionMethod = 'librosa') => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('separation_model', separationModel)
  formData.append('transcription_method', transcriptionMethod)

  const response = await fetch(`${API_BASE_URL}/transcribe`, {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get separated audio stems
 * @param {string} filename - Name of the processed file
 * @returns {Promise<Object>} Stems data
 */
export const getSeparatedStems = async (filename) => {
  const response = await fetch(`${API_BASE_URL}/stems/${filename}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get stems: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get MIDI transcription
 * @param {string} filename - Name of the processed file
 * @returns {Promise<Object>} MIDI data
 */
export const getMIDITranscription = async (filename) => {
  const response = await fetch(`${API_BASE_URL}/midi/${filename}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get MIDI: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Get backend status
 * @returns {Promise<Object>} Status information
 */
export const getBackendStatus = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/status`, {
      method: 'GET',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Backend status request failed:', error)
    throw error
  }
}

/**
 * Get backend health check
 * @returns {Promise<Object>} Health information
 */
export const getBackendHealth = async () => {
  const response = await fetch(`${API_BASE_URL}/health`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to get health: ${response.statusText}`)
  }

  return await response.json()
}

/**
 * Download processed file (stems or MIDI)
 * @param {string} filename - Name of the file to download
 * @param {string} type - Type of file ('stems' or 'midi')
 * @returns {Promise<Blob>} File blob
 */
export const downloadFile = async (filename, type) => {
  const response = await fetch(`${API_BASE_URL}/download/${type}/${filename}`, {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`)
  }

  return await response.blob()
}

/**
 * Upload MIDI file to backend
 * @param {File} file - MIDI file to upload
 * @returns {Promise<Object>} Upload result
 */
export const uploadMIDIFile = async (file) => {
  try {
    const formData = new FormData()
    formData.append('midi_file', file)
    
    const response = await fetch(`${API_BASE_URL}/upload-midi`, {
      method: 'POST',
      mode: 'cors',
      body: formData,
    })
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('Error uploading MIDI file:', error)
    throw error
  }
}

/**
 * Check if backend is available
 * @returns {Promise<boolean>} True if backend is available
 */
export const isBackendAvailable = async () => {
  try {
    await getBackendStatus()
    return true
  } catch (error) {
    devWarn('Backend not available:', error.message)
    return false
  }
}
