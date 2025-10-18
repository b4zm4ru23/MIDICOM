// Test utility for backend connection
import { getBackendStatus, getBackendHealth, isBackendAvailable } from '../services/apiService'

/**
 * Test backend connection and log results
 */
export const testBackendConnection = async () => {
  console.log('🔍 Testing backend connection...')
  
  try {
    // Test basic availability
    const isAvailable = await isBackendAvailable()
    console.log('✅ Backend available:', isAvailable)
    
    if (isAvailable) {
      // Test status endpoint
      const status = await getBackendStatus()
      console.log('📊 Backend status:', status)
      
      // Test health endpoint
      const health = await getBackendHealth()
      console.log('🏥 Backend health:', health)
      
      return {
        success: true,
        status,
        health
      }
    } else {
      console.warn('❌ Backend not available')
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
  console.log('📤 Testing file upload...')
  
  try {
    const { uploadAudioFile } = await import('../services/apiService')
    const result = await uploadAudioFile(file)
    console.log('✅ Upload successful:', result)
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
  console.log('🧪 Running backend tests...')
  
  const connectionTest = await testBackendConnection()
  
  if (connectionTest.success) {
    console.log('✅ All backend tests passed!')
    return true
  } else {
    console.log('❌ Backend tests failed:', connectionTest.error)
    return false
  }
}

