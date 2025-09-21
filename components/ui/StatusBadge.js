/**
 * StatusBadge Component - Cache and data status indicators
 * 
 * Displays cache status, timestamps, and data source information.
 * Provides consistent styling for status indicators across the app.
 */

export default function StatusBadge({ type, timestamp = null, className = '' }) {
  const getBadgeContent = () => {
    switch (type) {
      case 'cached':
        return {
          text: `Last refreshed: ${timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}`,
          bgColor: 'transparent',
          textColor: 'var(--color-success-content)'
        };
      case 'fresh':
        return {
          text: '🔄 Fresh data',
          bgColor: 'var(--color-info)',
          textColor: 'var(--color-info-content)'
        };
      default:
        return null;
    }
  };

  const badge = getBadgeContent();
  if (!badge) return null;

  return (
    <span 
      className={`text-sm px-2 py-1 ${className}`}
      style={{
        backgroundColor: badge.bgColor,
        color: badge.textColor,
        borderRadius: 'var(--radius-field)'
      }}
    >
      {badge.text}
    </span>
  );
}