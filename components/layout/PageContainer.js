/**
 * PageContainer Component - Consistent page content wrapper
 * 
 * Provides standardized spacing and structure for page content.
 * Can include page description and additional styling.
 */

export default function PageContainer({ 
  children, 
  description = '', 
  className = '' 
}) {
  return (
    <>
      {description && (
        <p className="text-gray-600 mb-6 font-bold">{description}</p>
      )}
      <div className={className}>
        {children}
      </div>
    </>
  );
}