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
          bgColor: 'bg-green-100',
          textColor: 'text-green-800'
        };
      case 'fresh':
        return {
          text: '🔄 Fresh data',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800'
        };
      default:
        return null;
    }
  };

  const badge = getBadgeContent();
  if (!badge) return null;

  return (
    <span className={`text-sm px-2 py-1 rounded ${badge.bgColor} ${badge.textColor} ${className}`}>
      {badge.text}
    </span>
  );
}