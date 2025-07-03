/**
 * useCanvasAuth - Custom hook for Canvas API authentication
 * 
 * Provides credential management and validation functionality.
 * Integrates with CanvasProvider for centralized state management.
 */

import { useCanvas } from './CanvasProvider';

export function useCanvasAuth() {
  const { 
    apiUrl, 
    apiKey, 
    courseId, 
    updateCredentials, 
    credentialsMissing 
  } = useCanvas();

  return {
    apiUrl,
    apiKey,
    courseId,
    updateCredentials,
    credentialsMissing,
    isAuthenticated: !credentialsMissing()
  };
}