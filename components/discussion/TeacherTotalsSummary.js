/**
 * TeacherTotalsSummary Component - Overall teacher feedback statistics
 * 
 * Displays total reply counts for each teacher across all graded discussion topics.
 * Provides a high-level overview of teacher engagement and workload distribution.
 */

export default function TeacherTotalsSummary({ topics = [] }) {
  // Calculate total teacher reply stats across all topics
  const calculateTeacherTotals = () => {
    const teacherTotals = {};
    
    topics.forEach(topic => {
      if (topic.teacherReplyStats) {
        Object.entries(topic.teacherReplyStats).forEach(([teacher, count]) => {
          teacherTotals[teacher] = (teacherTotals[teacher] || 0) + count;
        });
      }
    });
    
    return teacherTotals;
  };

  const teacherTotals = calculateTeacherTotals();
  const totalReplies = Object.values(teacherTotals).reduce((sum, count) => sum + count, 0);
  const teacherCount = Object.keys(teacherTotals).length;

  if (teacherCount === 0) {
    return (
      <div className="px-6 pt-5 pb-1 mb-6 shadow" style={{
        borderColor: 'var(--color-primary)',
        backgroundColor: 'oklch(0.950 0.006 239.7)',
        borderRadius: 'var(--radius-box)'
      }}>
        <h2 className="text-xl font-semibold mb-4" style={{color: 'var(--color-primary)'}}>
          Instructor Feedback Overview
        </h2>
        <div style={{color: 'var(--color-error-content)'}}>
          No teacher replies found across graded topics
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-5 pb-1 mb-6 shadow" style={{
      borderColor: 'var(--color-primary)',
      backgroundColor: 'oklch(0.950 0.006 239.7)',
      borderRadius: 'var(--radius-box)'
    }}>
      <div className="mb-4">
        <div className="text-lg font-medium mb-2" style={{color: 'var(--color-base-content)'}}>
         
          <span className="mr-2">
            <strong className="mr-2">Instructor Totals: </strong>
            {Object.entries(teacherTotals).map(([teacher, count], index) => (
              <span key={teacher} className="inline-flex items-center gap-1 mr-4">
                <span>{teacher}</span>
                <span 
                  className="inline-flex items-center ml-0.5 px-2 py-0.5 text-xs font-medium rounded-md shadow"
                  style={{
                    backgroundColor: 'oklch(0.600 0.030 239.7)',
                    color: '#fff'
                  }}
                >
                  {count}
                </span>
              </span>
            ))}
          </span>
        </div>
        
        <div className="text-sm" style={{color: 'var(--color-base-content-muted)'}}>
          {totalReplies} total replies from {teacherCount} teacher{teacherCount === 1 ? '' : 's'} across {topics.length} graded topic{topics.length === 1 ? '' : 's'}
        </div>
      </div>
    </div>
  );
}