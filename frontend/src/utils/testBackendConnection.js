// Test utility for backend connection
import { getBackendStatus, getBackendHealth, isBackendAvailable } from '../services/apiService'
import { devLog, devWarn } from './logger'

/**
 * Test backend connection and log results
 */
export const testBackendConnection = async () => {
  devLog('🔍 Testing backend connection...')
  
  try {
    // Test basic availability
    const isAvailable = await isBackendAvailable()
    devLog('✅ Backend available:', isAvailable)
    
    if (isAvailable) {
      // Test status endpoint
      const status = await getBackendStatus()
      devLog('📊 Backend status:', status)
      
      // Test health endpoint
      const health = await getBackendHealth()
      devLog('🏥 Backend health:', health)
      
      return {
        success: true,
        status,
        health
      }
    } else {
      devWarn('❌ Backend not available')
      return {
        success: false,
        error: 'Backend not available'
      }
    }
  } catch (error) {
    console.error('❌ Backend connection test failed:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Test file upload functionality
 */
export const testFileUpload = async (file) => {
  devLog('📤 Testing file upload...')
  
  try {
    const { uploadAudioFile } = await import('../services/apiService')
    const result = await uploadAudioFile(file)
    devLog('✅ Upload successful:', result)
    return result
  } catch (error) {
    console.error('❌ Upload failed:', error)
    throw error
  }
}

/**
 * Run all backend tests
 */
export const runBackendTests = async () => {
  devLog('🧪 Running backend tests...')
  
  const connectionTest = await testBackendConnection()
  
  if (connectionTest.success) {
    devLog('✅ All backend tests passed!')
    return true
  } else {
    devLog('❌ Backend tests failed:', connectionTest.error)
    return false
  }
}

