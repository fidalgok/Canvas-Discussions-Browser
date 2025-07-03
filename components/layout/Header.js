/**
 * Header Component - App branding and course display
 * 
 * Displays the Canvas Discussion Browser branding and current course name.
 * Integrates with CanvasProvider for course information.
 */

import { useCanvasCourse } from '../canvas/useCanvasCourse';

export default function Header() {
  const { courseName } = useCanvasCourse();

  return (
    <div className="flex flex-col">
      {/* Main application title with icon and homepage link */}
      <h1 className="text-2xl font-bold">
        <a href="/" className="flex items-center hover:opacity-80 transition-opacity">
          <i className="fas fa-comments mr-2"></i>Canvas Discussion Browser
        </a>
      </h1>
      {/* Course name display - stacked below main title */}
      {courseName && (
        <p className="text-sm opacity-80 mt-1">
          {courseName}
        </p>
      )}
    </div>
  );
}