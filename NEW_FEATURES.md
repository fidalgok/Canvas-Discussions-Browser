# New Features Documentation

## Overview

This document describes the major new features added to the Canvas Discussion Browser for AI Test Kitchen course analysis and microcredential tracking.

## 🎯 Analysis Dashboard (`/analysis`)

### Purpose
Comprehensive analytics for AI Test Kitchen course participation and microcredential completion tracking.

### Key Features

#### **Microcredential Tracking**
- Tracks completion of 3 reflection assignments (Module 1, 2, 3 reflections)
- Excludes introduction posts from graded assignments
- Calculates completion percentages for each participant
- Determines microcredential eligibility based on completion thresholds

#### **Engagement Filtering**
Identifies "engaged participants" using dual criteria:
- **Attended at least one Zoom session** (marked "present" in registration data), OR
- **Posted 2+ reflection assignments** (for those who didn't attend live sessions)

This ensures both synchronous and asynchronous learners are included in analysis.

#### **Participation Analytics**
- **Session Attendance**: Breakdown of attendance for each of 3 sessions
- **Zoom Sessions Attended**: Distribution showing how many participants attended 0, 1, 2, or 3 sessions
- **Assistant Types**: Analysis of what types of AI assistants participants are developing
- **Canvas Activity**: Post counts and discussion engagement metrics

#### **Teacher Role Filtering**
- Automatically excludes instructors using Canvas Enrollments API
- Filters out: `TeacherEnrollment`, `TaEnrollment`, `DesignerEnrollment`
- Ensures student-only analytics

### Data Sources
- **Canvas Discussions API**: Reflection posts and user data
- **Registration CSV**: Attendance records (authoritative source)
- **Canvas Enrollments API**: Teacher role identification

### Usage
1. Navigate to `/analysis`
2. Click "Load Analysis Data" 
3. View engagement metrics and microcredential completion
4. Use detailed table to review individual participant progress

---

## 🔍 Verification Dashboard (`/verify`)

### Purpose
Cross-reference registration attendance records with actual Zoom participation data to identify discrepancies and data quality issues.

### Key Features

#### **Discrepancy Detection**
Identifies three types of attendance issues:
- **False Absences**: Marked absent in registration but attended Zoom (HIGH severity)
- **False Presents**: Marked present in registration but no Zoom data found (MEDIUM severity)  
- **Short Duration**: Attended Zoom but for very brief time <30 minutes (LOW severity)

#### **Data Quality Audit**
- Reveals name format inconsistencies between data sources
- Identifies participants appearing in multiple systems with different names
- Shows missing participants (in one system but not another)

#### **Comprehensive Participant View**
- **Total Participants**: All people across Canvas, registration, and Zoom data (typically ~112)
- **Zoom-only participants**: People who attended Zoom but didn't post in Canvas
- **Registration-only participants**: People who registered but no other activity

### Data Sources
- **Canvas Discussions API**: Discussion participants
- **Registration CSV**: Official attendance records
- **Zoom Session CSVs**: Actual Zoom participation data for verification

### Verification Workflow
1. Upload or quick-load CSV files (registration + 3 Zoom session files)
2. System performs fuzzy name matching across all data sources
3. Compare registration attendance vs actual Zoom participation
4. Review discrepancies by severity level
5. Identify data cleanup needs

### Filtering Options
- **False Absences**: Focus on high-priority attendance discrepancies
- **All Participants**: View everyone with any type of discrepancy

---

## 🔧 Technical Improvements

### **Advanced Name Matching**
Robust fuzzy matching system handles:
- **Middle initial variations**: "Raymond F Gasser" ↔ "Raymond Gasser"
- **Nickname mappings**: "Jonathan" ↔ "Jon", "Timothy" ↔ "Tim", "Steven" ↔ "Steve"
- **Parenthetical content**: "Sam Wallace (she/her)" ↔ "Sam Wallace"
- **Punctuation normalization**: Removes special characters and normalizes whitespace
- **Case insensitive matching**: Handles mixed case variations

### **Canvas API Integration**
- **Email Construction**: Builds emails from Canvas usernames (`username@bc.edu`)
- **Role-based Filtering**: Uses Canvas Enrollments API for teacher identification
- **Pagination Handling**: Properly processes large course enrollments
- **Error Handling**: Graceful fallbacks for missing user data

### **Data Processing Pipeline**
1. **Canvas Data Extraction**: Unique users from discussion posts
2. **Registration Matching**: Email and name-based correlation
3. **Zoom Data Integration**: Cross-reference with actual attendance
4. **Teacher Filtering**: Remove instructors from student analytics
5. **Engagement Calculation**: Apply dual-criteria filtering
6. **Discrepancy Analysis**: Identify data quality issues

### **Caching System**
- **Browser localStorage**: Persistent caching across sessions
- **Manual refresh only**: Cache persists until user clicks refresh
- **Performance optimization**: Near-instant navigation after initial load
- **Cache indicators**: Visual feedback showing last refresh timestamp

---

## 📊 Dashboard Navigation

### **Home Page** (`/`)
- Original Canvas discussion browser functionality
- User list with post counts and navigation
- Markdown export for all discussions
- Links to new analysis and verification dashboards

### **Settings Page** (`/settings`)
- Canvas API credentials configuration
- Course ID setup
- Cache management controls

### **New Navigation Menu**
All pages now include consistent navigation:
- 🏠 **Home**: Discussion browser
- ✅ **Verify**: Attendance verification
- 📊 **Analysis**: Microcredential analytics  
- ⚙️ **Settings**: Configuration

---

## 🎓 Use Cases

### **For Instructors**
- **Microcredential Completion**: Track who has completed required reflections
- **Attendance Verification**: Ensure accurate attendance records
- **Engagement Analysis**: Understand participation patterns
- **Data Quality**: Identify and fix attendance discrepancies

### **For Administrators**
- **Course Analytics**: Comprehensive participation metrics
- **Compliance Reporting**: Accurate completion and attendance data
- **System Validation**: Verify data integrity across multiple systems

### **For Course Support**
- **Troubleshooting**: Identify attendance recording issues
- **Data Cleanup**: Find and fix name format inconsistencies
- **Participant Support**: Help resolve attendance discrepancies

---

## 📋 Data Requirements

### **Required Files**
1. **Registration CSV**: Master participant list with attendance columns:
   - `Name`, `Email` (for participant identification)
   - `Attendence 1`, `Attendence 2`, `Attendence 3` (attendance records)
   - Additional fields: comfort levels, assistant types, etc.

2. **Zoom Session CSVs** (3 files for verification):
   - Session 1: `Name (original name)`, `Total duration (minutes)`
   - Session 2: `Participants` column with attendance data  
   - Session 3: `Name (original name)`, `Total duration (minutes)`

### **Canvas API Access**
- Canvas API URL and token
- Course ID for target course
- Permissions to read discussions and enrollments

---

## 🔮 Future Enhancements

### **Potential Improvements**
- **Automated name mapping**: Machine learning for better name matching
- **Real-time sync**: Live updates from Canvas API
- **Export capabilities**: PDF reports and CSV data exports
- **Configurable thresholds**: Adjustable microcredential requirements
- **Multi-course support**: Analytics across multiple courses

### **Data Quality Tools**
- **Name standardization**: Automated cleanup suggestions
- **Duplicate detection**: Advanced participant deduplication
- **Missing data alerts**: Proactive identification of incomplete records

---

## 📚 Documentation References

- **Canvas API Rules**: See `CANVAS_API_RULES.md` for technical implementation details
- **Original Features**: See main README for discussion browser functionality
- **Deployment**: See Vercel configuration for hosting setup

---

*This documentation covers features added during the AI Test Kitchen course analysis implementation. For questions or issues, refer to the GitHub repository issues.*