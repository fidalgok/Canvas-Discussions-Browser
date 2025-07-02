# Grading Dashboard Features

## Overview

The Canvas Discussion Browser now features a grading-focused dashboard as the primary interface, designed specifically for instructors to efficiently track discussion assignment completion and maintain equitable feedback distribution across courses.

## 🎯 **New Homepage - Discussion Topics Dashboard** (`/`)

### Purpose
The topics dashboard serves as the primary grading workflow interface, organizing discussions by assignment topics rather than individual users. This approach helps instructors:
- Quickly identify students who need grades
- Track teacher feedback equity across assignments
- Focus on graded discussion assignments (excludes introductory topics)

### Key Features

#### **Topic-Based Organization**
- **Graded Topics Only**: Automatically filters to show only graded discussion assignments using `assignment_id`
- **Assignment Context**: Each topic shows its assignment status and grading requirements
- **Hierarchical View**: Topics are the primary organizational unit, with students listed within each topic

#### **Grading Status Tracking**
- **Students Needing Grades**: Uses Canvas Submissions API to identify ungraded student posts
- **Real-time Status**: Checks `submission.grade` field to determine grading completion
- **Visual Priority**: Red badges highlight students requiring immediate attention
- **Accurate Assessment**: Shows actual grading status, not just reply status

#### **Teacher Feedback Equity**
- **Feedback Attribution**: Tracks which teachers have provided replies to each topic
- **Reply Count Distribution**: Shows reply counts per teacher (e.g., "Tim Lindgren (5), Claire Angus (3)")
- **Workload Balance**: Helps ensure equitable distribution of feedback responsibilities
- **Team Coordination**: Facilitates collaboration among multiple instructors

#### **Efficient Navigation**
- **Direct Student Access**: Click student names to jump to their individual discussion view
- **SpeedGrader Integration**: Seamless transition to Canvas grading interface
- **Context Preservation**: Maintain topic context while drilling down to individual students

### Data Integration

#### **Canvas API Integration**
- **Submissions Endpoint**: `/courses/{id}/assignments/{assignment_id}/submissions/{user_id}`
- **Enrollments API**: Identifies teacher vs student roles for accurate filtering
- **Discussion Posts**: Comprehensive fetch of all discussion content with threading
- **Assignment Detection**: Uses `assignment_id` to filter graded discussions

#### **Grading Logic**
```javascript
const isUngraded = !submission || 
  submission.grade === null || 
  submission.grade === undefined || 
  submission.grade === '';
```

#### **Teacher Identification**
- **Enrollment Roles**: `TeacherEnrollment`, `TaEnrollment`, `DesignerEnrollment`
- **Role-based Filtering**: Separates instructor replies from student posts
- **Multi-instructor Support**: Handles courses with multiple teaching staff

## 📋 **User View Archive** (`/users`)

### Purpose
The original user-centric view remains available for detailed individual student analysis, now accessible via the "Users" navigation link.

### When to Use
- **Individual Student Review**: Deep dive into specific student's discussion participation
- **Chronological Analysis**: View student's posts across all topics in timeline order
- **Detailed Grading**: Access SpeedGrader and review individual submission history
- **Reply Threading**: Examine conversation threads involving specific students

### Features Preserved
- All original functionality maintained
- User aggregation and post counting
- Individual post viewing with threaded replies
- Markdown export capabilities
- Search and filtering options

## 🔄 **Navigation Structure**

### Updated Menu
- **Home** (`/`) - Discussion Topics Dashboard (NEW default)
- **Users** (`/users`) - Individual user analysis (former homepage)
- **Settings** (`/settings`) - API configuration
- **GitHub** - Project repository link

### Workflow Integration
1. **Start at Home**: Review topics needing attention
2. **Identify Students**: See who needs grades per topic
3. **Grade Efficiently**: Click through to individual students or SpeedGrader
4. **Track Progress**: Monitor completion across all assignments
5. **Coordinate Team**: Balance feedback workload among instructors

## 🎓 **Instructor Benefits**

### **Grading Efficiency**
- **Priority Focus**: Immediately see which assignments need attention
- **Batch Processing**: Work through one topic at a time
- **Status Visibility**: Clear indicators of grading completion
- **Reduced Duplication**: Avoid double-grading or missed students

### **Team Coordination**
- **Feedback Transparency**: See who has provided replies to each topic
- **Workload Distribution**: Ensure equitable division of feedback responsibilities
- **Coverage Gaps**: Identify topics that haven't received instructor attention
- **Collaboration**: Support team teaching scenarios

### **Student Support**
- **Comprehensive Tracking**: No student falls through the cracks
- **Timely Feedback**: Prioritize students who have been waiting longest
- **Consistent Standards**: Maintain grading consistency across topics
- **Progress Monitoring**: Track completion rates across assignments

## 🔧 **Technical Implementation**

### **Performance Considerations**
- **Batch API Calls**: Efficient fetching of submission data
- **Caching Strategy**: Maintains existing localStorage caching system
- **Lazy Loading**: Grade checking happens only for visible topics
- **Error Handling**: Graceful fallbacks for API failures

### **Security Features**
- **Role Verification**: Uses Canvas enrollment data for teacher identification
- **API Security**: Maintains existing proxy pattern for secure Canvas API access
- **Data Sanitization**: Continues DOMPurify integration for safe content rendering

## 📊 **Future Enhancements**

### **Potential Improvements**
- **Grade Distribution Analytics**: Visual summaries of grading patterns
- **Automated Reminders**: Notifications for overdue grading
- **Bulk Operations**: Multi-student grading workflows
- **Export Capabilities**: Grading progress reports
- **Mobile Optimization**: Touch-friendly interface for tablet grading

### **Integration Opportunities**
- **Canvas Gradebook Sync**: Real-time grade updates
- **Learning Analytics**: Student engagement pattern analysis
- **Accessibility Features**: Screen reader optimization
- **Multi-course Support**: Cross-course grading dashboard

---

## 📚 **Related Documentation**

- **Core Features**: See `CORE_DISCUSSION_BROWSER.md` for individual user view functionality
- **API Integration**: See `CANVAS_API_INTEGRATION.md` for technical implementation details
- **Analytics**: See `ANALYTICS_AND_VERIFICATION.md` for advanced analytics features

---

*This dashboard represents a shift from user-centric to assignment-centric grading workflows, optimizing the instructor experience for efficient and equitable discussion grading.*