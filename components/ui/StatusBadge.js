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
          text: `⚡ Last refreshed: ${timestamp ? new Date(timestamp).toLocaleString() : 'Unknown'}`,
          badgeClass: 'badge-success'
        };
      case 'fresh':
        return {
          text: '🔄 Fresh data',
          badgeClass: 'badge-info'
        };
      default:
        return null;
    }
  };

  const badge = getBadgeContent();
  if (!badge) return null;

  return (
    <span className={`badge ${badge.badgeClass} ${className}`}>
      {badge.text}
    </span>
  );
}