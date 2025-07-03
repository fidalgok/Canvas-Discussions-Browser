/**
 * useCanvasCourse - Custom hook for Canvas course data
 * 
 * Provides course information, loading states, and error handling.
 * Integrates with CanvasProvider for centralized course management.
 */

import { useCanvas } from './CanvasProvider';

export function useCanvasCourse() {
  const { 
    courseName, 
    courseLoading, 
    courseError, 
    makeCanvasRequest,
    courseId 
  } = useCanvas();

  const fetchCourseData = async () => {
    if (!courseId) {
      throw new Error('Course ID is required');
    }
    
    return makeCanvasRequest(`/courses/${courseId}`);
  };

  return {
    courseName,
    courseLoading,
    courseError,
    courseId,
    fetchCourseData
  };
}