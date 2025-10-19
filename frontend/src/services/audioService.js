import axios from 'axios'

const API_BASE_URL = 'http://localhost:8000'

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5 minutes timeout for audio processing
})

// Process audio file
export const processAudio = async (filePath) => {
  try {
    const response = await api.post('/process-audio', {
      input_path: filePath,
      output_dir: './output'
    })
    
    return response.data
  } catch (error) {
    console.error('Error processing audio:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

// Get available stems
export const getStems = async (outputDir) => {
  try {
    const response = await api.get('/stems', {
      params: { output_dir: outputDir }
    })
    
    return response.data
  } catch (error) {
    console.error('Error getting stems:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

// Transcribe stem to MIDI
export const transcribeStem = async (stemPath, outputPath, options = {}) => {
  try {
    const response = await api.post('/transcribe', {
      input_path: stemPath,
      output_path: outputPath,
      ...options
    })
    
    return response.data
  } catch (error) {
    console.error('Error transcribing stem:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

// Get processing status
export const getProcessingStatus = async (taskId) => {
  try {
    const response = await api.get(`/status/${taskId}`)
    return response.data
  } catch (error) {
    console.error('Error getting status:', error)
    return {
      success: false,
      error: error.response?.data?.error || error.message
    }
  }
}

// Health check
export const healthCheck = async () => {
  try {
    const response = await api.get('/health')
    return response.data
  } catch (error) {
    console.error('Backend not available:', error)
    return {
      success: false,
      error: 'Backend not available'
    }
  }
}






