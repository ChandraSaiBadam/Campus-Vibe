// VIT FFCS Timetable Generator - Main Component
// Provides functionality for course registration, slot selection, and timetable generation
import React, { useState } from 'react';
import {
  Plus,           // Add course button icon
  Trash2,         // Delete course button icon
  Calendar,       // Main header icon
  AlertTriangle,  // Conflict warning icon
  Download        // Download timetable icon
} from 'lucide-react';
import toast from 'react-hot-toast'; // Toast notifications for user feedback

// Print-friendly styles for timetable printing
// Optimized for landscape printing with proper color coding
const printStyles = `
  @media print {
    @page {
      size: landscape;
      margin: 0.5in;
    }
    
    /* Hide everything except print area */
    body * {
      visibility: hidden;
    }
    .print-area, .print-area * {
      visibility: visible;
    }
    .print-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    
    /* Print title styling */
    .print-title {
      font-size: 18px;
      font-weight: bold;
      text-align: center;
      margin-bottom: 15px;
    }
    
    /* Table styling for print */
    table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 10px !important;
    }
    
    th, td {
      border: 1px solid #000 !important;
      padding: 4px !important;
      text-align: center !important;
    }
    
    th {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
    }
    
    /* Slot color coding for print */
    .theory-slot {
      background-color: #FFFF99 !important;
      color: #000 !important;
    }
    
    .lab-slot {
      background-color: #90EE90 !important;
      color: #000 !important;
    }
    
    .empty-slot {
      background-color: #fff !important;
    }
    
    .lunch-slot {
      background-color: #f0f0f0 !important;
      font-weight: bold !important;
    }
  }
`;

const FFCSTimetable = () => {
  // ===== STATE MANAGEMENT =====
  // Course data with default 3 empty courses
  const [courses, setCourses] = useState([
    { id: 1, courseNumber: 1, faculty: '', slot: '', isEditing: true },
    { id: 2, courseNumber: 2, faculty: '', slot: '', isEditing: true },
    { id: 3, courseNumber: 3, faculty: '', slot: '', isEditing: true }
  ]);
  
  // UI state management
  const [loading, setLoading] = useState(false);
  const [timetableData, setTimetableData] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  const [showSlotDropdown, setShowSlotDropdown] = useState({}); // Controls dropdown visibility per course

  // ===== VIT FFCS SLOT DEFINITIONS =====
  // Theory slot combinations (includes tutorial slots)
  const theorySlots = [
    'A1+TA1', 'A1+TA1+TAA1', 'B1+TB1', 'B2+TB2', 'B2+TB2+TBB2',
    'C1+TC1', 'C1+TC1+TCC1', 'C2+TC2', 'C2+TC2+TCC2', 'D1+TD1',
    'D2+TD2', 'D2+TD2+TDD2', 'E1+TE1', 'E2+TE2', 'F1+TF1',
    'F2+TF2', 'A2+TA2', 'G1+TG1', 'G2+TG2', 'A2+TA2+TAA2'
  ];

  // Lab slot combinations (2-hour blocks)
  const labSlots = [
    'L1+L2', 'L3+L4', 'L5+L6', 'L7+L8', 'L9+L10',
    'L11+L12', 'L13+L14', 'L15+L16', 'L17+L18', 'L19+L20',
    'L21+L22', 'L23+L24', 'L25+L26', 'L27+L28', 'L29+L30',
    'L31+L32', 'L33+L34', 'L35+L36', 'L37+L38', 'L39+L40',
    'L41+L42', 'L43+L44', 'L45+L46', 'L47+L48', 'L49+L50',
    'L51+L52', 'L53+L54', 'L55+L56', 'L57+L58', 'L59+L60'
  ];

  // Individual theory slots (for flexibility)
  const individualTheorySlots = [
    'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2',
    'F1', 'F2', 'G1', 'G2', 'TA1', 'TA2', 'TB1', 'TB2', 'TC1', 'TC2',
    'TD1', 'TD2', 'TE1', 'TE2', 'TF1', 'TF2', 'TG1', 'TG2',
    'TAA1', 'TAA2', 'TBB2', 'TCC1', 'TCC2', 'TDD2',
    'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7'
  ];


  // ===== VIT SLOT TIME MAPPINGS =====
  // Based on exact VIT timetable structure - maps slots to days and times
  const slotTimings = {
    // Theory Slots - Morning Session (8:00 AM - 1:20 PM)
    'A1': { days: ['MON', 'WED'], times: ['08:00', '09:00'], type: 'THEORY' },
    'F1': { days: ['MON', 'WED'], times: ['09:00', '10:00'], type: 'THEORY' },
    'D1': { days: ['MON', 'THU'], times: ['10:00', '08:00'], type: 'THEORY' },
    'TB1': { days: ['MON'], times: ['11:00'], type: 'THEORY' },
    'TG1': { days: ['MON'], times: ['12:00'], type: 'THEORY' },
    'V1': { days: ['MON'], times: ['19:01'], type: 'THEORY' }, // Evening slot
    
    'B1': { days: ['TUE', 'THU'], times: ['08:00', '09:00'], type: 'THEORY' },
    'G1': { days: ['TUE', 'THU'], times: ['09:00', '10:00'], type: 'THEORY' },
    'E1': { days: ['TUE', 'FRI'], times: ['10:00', '08:00'], type: 'THEORY' },
    'TC1': { days: ['TUE'], times: ['11:00'], type: 'THEORY' },
    'TAA1': { days: ['TUE'], times: ['12:00'], type: 'THEORY' },
    'V2': { days: ['TUE'], times: ['19:01'], type: 'THEORY' },
    
    'C1': { days: ['WED', 'FRI'], times: ['08:00', '09:00'], type: 'THEORY' },
    'TD1': { days: ['WED'], times: ['11:00'], type: 'THEORY' },
    'TBB1': { days: ['WED'], times: ['12:00'], type: 'THEORY' },
    
    'TE1': { days: ['THU'], times: ['11:00'], type: 'THEORY' },
    'TCC1': { days: ['THU'], times: ['12:00'], type: 'THEORY' },
    
    'TA1': { days: ['FRI'], times: ['10:00'], type: 'THEORY' },
    'TF1': { days: ['FRI'], times: ['11:00'], type: 'THEORY' },
    'TDD1': { days: ['FRI'], times: ['12:00'], type: 'THEORY' },
    
    // Theory Slots - Afternoon Session (2:00 PM - 7:20 PM)
    'A2': { days: ['MON', 'WED'], times: ['14:00', '15:00'], type: 'THEORY' },
    'F2': { days: ['MON', 'WED'], times: ['15:00', '16:00'], type: 'THEORY' },
    'D2': { days: ['MON', 'THU'], times: ['16:00', '14:00'], type: 'THEORY' },
    'TB2': { days: ['MON'], times: ['17:00'], type: 'THEORY' },
    'TG2': { days: ['MON'], times: ['18:00'], type: 'THEORY' },
    'V3': { days: ['MON'], times: ['19:01'], type: 'THEORY' },
    
    'B2': { days: ['TUE', 'THU'], times: ['14:00', '15:00'], type: 'THEORY' },
    'G2': { days: ['TUE', 'THU'], times: ['15:00', '16:00'], type: 'THEORY' },
    'E2': { days: ['TUE', 'FRI'], times: ['16:00', '14:00'], type: 'THEORY' },
    'TC2': { days: ['TUE'], times: ['17:00'], type: 'THEORY' },
    'TAA2': { days: ['TUE'], times: ['18:00'], type: 'THEORY' },
    'V4': { days: ['TUE'], times: ['19:01'], type: 'THEORY' },
    
    'C2': { days: ['WED', 'FRI'], times: ['14:00', '15:00'], type: 'THEORY' },
    'TD2': { days: ['WED'], times: ['17:00'], type: 'THEORY' },
    'TBB2': { days: ['WED'], times: ['18:00'], type: 'THEORY' },
    'V5': { days: ['WED'], times: ['19:01'], type: 'THEORY' },
    
    'TE2': { days: ['THU'], times: ['17:00'], type: 'THEORY' },
    'TCC2': { days: ['THU'], times: ['18:00'], type: 'THEORY' },
    'V6': { days: ['THU'], times: ['19:01'], type: 'THEORY' },
    
    'TA2': { days: ['FRI'], times: ['16:00'], type: 'THEORY' },
    'TF2': { days: ['FRI'], times: ['17:00'], type: 'THEORY' },
    'TDD2': { days: ['FRI'], times: ['18:00'], type: 'THEORY' },
    'V7': { days: ['FRI'], times: ['19:01'], type: 'THEORY' },
    
    // Lab Slots - Morning Session (8:00 AM - 1:20 PM)
    // Each lab slot occupies TWO consecutive time periods
    'L1': { days: ['MON'], times: ['08:00', '08:51'], type: 'LAB' },
    'L2': { days: ['MON'], times: ['08:00', '08:51'], type: 'LAB' },
    'L3': { days: ['MON'], times: ['09:51', '10:41'], type: 'LAB' },
    'L4': { days: ['MON'], times: ['09:51', '10:41'], type: 'LAB' },
    'L5': { days: ['MON'], times: ['11:40', '12:31'], type: 'LAB' },
    'L6': { days: ['MON'], times: ['11:40', '12:31'], type: 'LAB' },
    
    'L7': { days: ['TUE'], times: ['08:00', '08:51'], type: 'LAB' },
    'L8': { days: ['TUE'], times: ['08:00', '08:51'], type: 'LAB' },
    'L9': { days: ['TUE'], times: ['09:51', '10:41'], type: 'LAB' },
    'L10': { days: ['TUE'], times: ['09:51', '10:41'], type: 'LAB' },
    'L11': { days: ['TUE'], times: ['11:40', '12:31'], type: 'LAB' },
    'L12': { days: ['TUE'], times: ['11:40', '12:31'], type: 'LAB' },
    
    'L13': { days: ['WED'], times: ['08:00', '08:51'], type: 'LAB' },
    'L14': { days: ['WED'], times: ['08:00', '08:51'], type: 'LAB' },
    'L15': { days: ['WED'], times: ['09:51', '10:41'], type: 'LAB' },
    'L16': { days: ['WED'], times: ['09:51', '10:41'], type: 'LAB' },
    'L17': { days: ['WED'], times: ['11:40', '12:31'], type: 'LAB' },
    'L18': { days: ['WED'], times: ['11:40', '12:31'], type: 'LAB' },
    
    'L19': { days: ['THU'], times: ['08:00', '08:51'], type: 'LAB' },
    'L20': { days: ['THU'], times: ['08:00', '08:51'], type: 'LAB' },
    'L21': { days: ['THU'], times: ['09:51', '10:41'], type: 'LAB' },
    'L22': { days: ['THU'], times: ['09:51', '10:41'], type: 'LAB' },
    'L23': { days: ['THU'], times: ['11:40', '12:31'], type: 'LAB' },
    'L24': { days: ['THU'], times: ['11:40', '12:31'], type: 'LAB' },
    
    'L25': { days: ['FRI'], times: ['08:00', '08:51'], type: 'LAB' },
    'L26': { days: ['FRI'], times: ['08:00', '08:51'], type: 'LAB' },
    'L27': { days: ['FRI'], times: ['09:51', '10:41'], type: 'LAB' },
    'L28': { days: ['FRI'], times: ['09:51', '10:41'], type: 'LAB' },
    'L29': { days: ['FRI'], times: ['11:40', '12:31'], type: 'LAB' },
    'L30': { days: ['FRI'], times: ['11:40', '12:31'], type: 'LAB' },
    
    // Lab Slots - Afternoon Session (2:00 PM - 7:20 PM)
    'L31': { days: ['MON'], times: ['14:00', '14:51'], type: 'LAB' },
    'L32': { days: ['MON'], times: ['14:00', '14:51'], type: 'LAB' },
    'L33': { days: ['MON'], times: ['15:51', '16:41'], type: 'LAB' },
    'L34': { days: ['MON'], times: ['15:51', '16:41'], type: 'LAB' },
    'L35': { days: ['MON'], times: ['17:40', '18:31'], type: 'LAB' },
    'L36': { days: ['MON'], times: ['17:40', '18:31'], type: 'LAB' },
    
    'L37': { days: ['TUE'], times: ['14:00', '14:51'], type: 'LAB' },
    'L38': { days: ['TUE'], times: ['14:00', '14:51'], type: 'LAB' },
    'L39': { days: ['TUE'], times: ['15:51', '16:41'], type: 'LAB' },
    'L40': { days: ['TUE'], times: ['15:51', '16:41'], type: 'LAB' },
    'L41': { days: ['TUE'], times: ['17:40', '18:31'], type: 'LAB' },
    'L42': { days: ['TUE'], times: ['17:40', '18:31'], type: 'LAB' },
    
    'L43': { days: ['WED'], times: ['14:00', '14:51'], type: 'LAB' },
    'L44': { days: ['WED'], times: ['14:00', '14:51'], type: 'LAB' },
    'L45': { days: ['WED'], times: ['15:51', '16:41'], type: 'LAB' },
    'L46': { days: ['WED'], times: ['15:51', '16:41'], type: 'LAB' },
    'L47': { days: ['WED'], times: ['17:40', '18:31'], type: 'LAB' },
    'L48': { days: ['WED'], times: ['17:40', '18:31'], type: 'LAB' },
    
    'L49': { days: ['THU'], times: ['14:00', '14:51'], type: 'LAB' },
    'L50': { days: ['THU'], times: ['14:00', '14:51'], type: 'LAB' },
    'L51': { days: ['THU'], times: ['15:51', '16:41'], type: 'LAB' },
    'L52': { days: ['THU'], times: ['15:51', '16:41'], type: 'LAB' },
    'L53': { days: ['THU'], times: ['17:40', '18:31'], type: 'LAB' },
    'L54': { days: ['THU'], times: ['17:40', '18:31'], type: 'LAB' },
    
    'L55': { days: ['FRI'], times: ['14:00', '14:51'], type: 'LAB' },
    'L56': { days: ['FRI'], times: ['14:00', '14:51'], type: 'LAB' },
    'L57': { days: ['FRI'], times: ['15:51', '16:41'], type: 'LAB' },
    'L58': { days: ['FRI'], times: ['15:51', '16:41'], type: 'LAB' },
    'L59': { days: ['FRI'], times: ['17:40', '18:31'], type: 'LAB' },
    'L60': { days: ['FRI'], times: ['17:40', '18:31'], type: 'LAB' }
  };

  // Create reverse mapping from time slots to slot codes
  const getSlotCodesForTimeSlot = (day, timeSlot, slotType) => {
    const slotCodes = [];
    
    // Create mapping based on slotTimings definition
    Object.entries(slotTimings).forEach(([slotCode, slotInfo]) => {
      if (slotInfo.type === slotType) {
        slotInfo.days.forEach((slotDay, dayIndex) => {
          if (slotDay === day) {
            if (slotType === 'LAB') {
              // For lab slots, check if any of the times match
              if (slotInfo.times.includes(timeSlot)) {
                slotCodes.push(slotCode);
              }
            } else {
              // For theory slots, map the time to the correct time slot
              const time = slotInfo.times[dayIndex] || slotInfo.times[0];
              const theoryToTimetableMapping = {
                '08:00': '08:00', '09:00': '08:51', '10:00': '09:51', '11:00': '10:41',
                '12:00': '11:40', '14:00': '14:00', '15:00': '14:51', '16:00': '15:51',
                '17:00': '16:41', '18:00': '17:40', '19:01': '18:31'
              };
              const timetableTimeKey = theoryToTimetableMapping[time] || time;
              if (timetableTimeKey === timeSlot) {
                slotCodes.push(slotCode);
              }
            }
          }
        });
      }
    });
    
    return slotCodes;
  };

  const addCourse = () => {
    const newCourse = {
      id: Date.now(),
      courseNumber: courses.length + 1,
      faculty: '',
      slot: '',
      isEditing: true
    };
    setCourses([...courses, newCourse]);
  };

  const saveCourse = (id) => {
    const course = courses.find(c => c.id === id);
    if (!course.faculty || !course.slot) {
      toast.error('Please fill both Faculty and Slot fields');
      return;
    }
    
    // Check for conflicts with this specific course before saving using enhanced logic
    const updatedCourses = courses.map(c =>
      c.id === id ? { ...c, isEditing: false } : c
    );
    
    // Enhanced conflict check for this specific course
    const savedCourse = { ...course, isEditing: false };
    const otherSavedCourses = updatedCourses.filter(c => c.id !== id && c.faculty && c.slot && !c.isEditing);
    
    let hasConflict = false;
    const conflictDetails = [];
    
    if (otherSavedCourses.length > 0) {
      const allExistingSlots = [];
      const newCourseSlots = [];
      
      // Collect existing course slots
      otherSavedCourses.forEach(existingCourse => {
        const slots = existingCourse.slot.split('+');
        slots.forEach(slotCode => {
          const slotInfo = slotTimings[slotCode.trim()];
          if (slotInfo) {
            slotInfo.days.forEach((day, dayIndex) => {
              if (slotInfo.type === 'LAB') {
                slotInfo.times.forEach(timeKey => {
                  allExistingSlots.push({
                    course: existingCourse,
                    slotCode: slotCode.trim(),
                    slotType: slotInfo.type,
                    day,
                    timeKey
                  });
                });
              } else {
                const time = slotInfo.times[dayIndex] || slotInfo.times[0];
                const theoryToTimetableMapping = {
                  '08:00': '08:00', '09:00': '08:51', '10:00': '09:51', '11:00': '10:41',
                  '12:00': '11:40', '14:00': '14:00', '15:00': '14:51', '16:00': '15:51',
                  '17:00': '16:41', '18:00': '17:40', '19:01': '18:31'
                };
                const timetableTimeKey = theoryToTimetableMapping[time] || time;
                
                allExistingSlots.push({
                  course: existingCourse,
                  slotCode: slotCode.trim(),
                  slotType: slotInfo.type,
                  day,
                  timeKey: timetableTimeKey
                });
              }
            });
          }
        });
      });
      
      // Collect new course slots
      const newSlots = savedCourse.slot.split('+');
      newSlots.forEach(slotCode => {
        const slotInfo = slotTimings[slotCode.trim()];
        if (slotInfo) {
          slotInfo.days.forEach((day, dayIndex) => {
            if (slotInfo.type === 'LAB') {
              slotInfo.times.forEach(timeKey => {
                newCourseSlots.push({
                  course: savedCourse,
                  slotCode: slotCode.trim(),
                  slotType: slotInfo.type,
                  day,
                  timeKey
                });
              });
            } else {
              const time = slotInfo.times[dayIndex] || slotInfo.times[0];
              const theoryToTimetableMapping = {
                '08:00': '08:00', '09:00': '08:51', '10:00': '09:51', '11:00': '10:41',
                '12:00': '11:40', '14:00': '14:00', '15:00': '14:51', '16:00': '15:51',
                '17:00': '16:41', '18:00': '17:40', '19:01': '18:31'
              };
              const timetableTimeKey = theoryToTimetableMapping[time] || time;
              
              newCourseSlots.push({
                course: savedCourse,
                slotCode: slotCode.trim(),
                slotType: slotInfo.type,
                day,
                timeKey: timetableTimeKey
              });
            }
          });
        }
      });
      
      // Check for conflicts
      newCourseSlots.forEach(newSlot => {
        allExistingSlots.forEach(existingSlot => {
          if (newSlot.day === existingSlot.day && newSlot.timeKey === existingSlot.timeKey) {
            hasConflict = true;
            conflictDetails.push({
              existingCourse: existingSlot.course,
              newCourse: newSlot.course,
              day: newSlot.day,
              time: newSlot.timeKey,
              existingSlot: existingSlot.slotCode,
              newSlot: newSlot.slotCode,
              existingType: existingSlot.slotType,
              newType: newSlot.slotType
            });
          }
        });
      });
    }
    
    setCourses(updatedCourses);
    
    if (hasConflict) {
      toast.error(`⚠️ Course ${course.courseNumber} saved but has ${conflictDetails.length} conflict(s)! Check conflicts before generating.`);
      // Update conflicts state with the new conflicts
      setTimeout(() => checkConflicts(), 100);
    } else {
      toast.success(`✅ Course ${course.courseNumber} saved with no conflicts`);
    }
  };

  const updateCourse = (id, field, value) => {
    setCourses(courses.map(course =>
      course.id === id ? { ...course, [field]: value } : course
    ));
  };

  const editCourse = (id) => {
    setCourses(courses.map(course => 
      course.id === id ? { ...course, isEditing: true } : course
    ));
  };

  const deleteCourse = (id) => {
    if (courses.length === 1) {
      toast.error('At least one course is required');
      return;
    }
    
    const updatedCourses = courses.filter(course => course.id !== id);
    const renumberedCourses = updatedCourses.map((course, index) => ({
      ...course,
      courseNumber: index + 1
    }));
    
    setCourses(renumberedCourses);
    toast.success('Course removed');
  };


  // ===== SLOT FILTERING & DROPDOWN FUNCTIONS =====
  // Filter available slots based on user input (case-insensitive search)
  const filterSlots = (searchTerm, courseId) => {
    const allSlots = [...theorySlots, ...labSlots, ...individualTheorySlots];
    if (!searchTerm) return allSlots.slice(0, 20);
    return allSlots.filter(slot =>
      slot.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 15);
  };

  // Handle slot input changes and show dropdown
  const handleSlotSearch = (courseId, value) => {
    setCourses(courses.map(course =>
      course.id === courseId ? { ...course, slot: value } : course
    ));
    setShowSlotDropdown(prev => ({ ...prev, [courseId]: true }));
  };

  // Handle slot selection from dropdown
  const selectSlot = (courseId, slot) => {
    setCourses(courses.map(course =>
      course.id === courseId ? { ...course, slot } : course
    ));
    setShowSlotDropdown(prev => ({ ...prev, [courseId]: false }));
  };

  // ===== UTILITY FUNCTIONS =====
  // Download timetable as image using html2canvas
  const downloadTimetableImage = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const timetableElement = document.querySelector('.print-area table');
      if (!timetableElement) {
        toast.error('Timetable not found for download');
        return;
      }
      const canvas = await html2canvas(timetableElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false
      });
      const link = document.createElement('a');
      link.download = `VIT-FFCS-Timetable-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Timetable image downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download timetable image. Please try again.');
    }
  };

  const checkConflicts = () => {
    const completeCourses = courses.filter(c => c.faculty && c.slot && !c.isEditing);
    
    if (completeCourses.length === 0) {
      toast.error('Please add and save at least one complete course');
      return;
    }

    const conflictList = [];
    const usedTimeSlots = new Map(); // key: "day-time", value: { course, slotCode, slotType }

    completeCourses.forEach(course => {
      const slots = course.slot.split('+');
      slots.forEach(slotCode => {
        const slotInfo = slotTimings[slotCode.trim()];
        if (slotInfo) {
          // Process days and times as corresponding pairs
          slotInfo.days.forEach((day, dayIndex) => {
            const time = slotInfo.times[dayIndex] || slotInfo.times[0]; // Fallback to first time if index doesn't exist
            // Use the time directly since lab slots now use simplified time keys
            const timeKey = time;
            const key = `${day}-${timeKey}`;
            
            if (usedTimeSlots.has(key)) {
              const existing = usedTimeSlots.get(key);
              // Only flag as conflict if it's a different course
              if (existing.course.id !== course.id) {
                conflictList.push({
                  courses: [existing.course, course],
                  existingSlot: existing.slotCode,
                  existingType: existing.slotType,
                  conflictingSlot: slotCode.trim(),
                  conflictingType: slotInfo.type,
                  day,
                  time: timeKey,
                  type: 'time_conflict'
                });
              }
            } else {
              usedTimeSlots.set(key, {
                course: course,
                slotCode: slotCode.trim(),
                slotType: slotInfo.type
              });
            }
          });
        }
      });
    });

    setConflicts(conflictList);
    
    if (conflictList.length > 0) {
      toast.error(`Found ${conflictList.length} time conflicts!`);
    } else {
      toast.success('No conflicts found! Ready to generate timetable.');
    }
  };

  const generateTimetable = async () => {
    const completeCourses = courses.filter(c => c.faculty && c.slot && !c.isEditing);
    
    if (completeCourses.length === 0) {
      toast.error('Please add and save at least one complete course');
      return;
    }

    // Check for conflicts first - Enhanced logic to catch ALL conflicts including theory vs lab
    const conflictList = [];
    const allScheduledSlots = []; // Store all scheduled slots for comprehensive checking

    // First pass: collect all scheduled slots with their actual timetable positions
    completeCourses.forEach(course => {
      const slots = course.slot.split('+');
      slots.forEach(slotCode => {
        const slotInfo = slotTimings[slotCode.trim()];
        if (slotInfo) {
          slotInfo.days.forEach((day, dayIndex) => {
            if (slotInfo.type === 'LAB') {
              // For lab slots, they occupy consecutive time slots
              slotInfo.times.forEach(timeKey => {
                allScheduledSlots.push({
                  course,
                  slotCode: slotCode.trim(),
                  slotType: slotInfo.type,
                  day,
                  timeKey,
                  actualTime: timeKey
                });
              });
            } else {
              // For theory slots, map to correct time slot in timetable
              const time = slotInfo.times[dayIndex] || slotInfo.times[0];
              
              // Map theory times to actual timetable time slots
              const theoryToTimetableMapping = {
                '08:00': '08:00',    // 8:00 AM theory -> 08:00 slot
                '09:00': '08:51',    // 9:00 AM theory -> 08:51 slot (which represents 9:00-9:50)
                '10:00': '09:51',    // 10:00 AM theory -> 09:51 slot
                '11:00': '10:41',    // 11:00 AM theory -> 10:41 slot
                '12:00': '11:40',    // 12:00 PM theory -> 11:40 slot
                '14:00': '14:00',    // 2:00 PM theory -> 14:00 slot
                '15:00': '14:51',    // 3:00 PM theory -> 14:51 slot
                '16:00': '15:51',    // 4:00 PM theory -> 15:51 slot
                '17:00': '16:41',    // 5:00 PM theory -> 16:41 slot
                '18:00': '17:40',    // 6:00 PM theory -> 17:40 slot
                '19:01': '18:31'     // 7:01 PM theory -> 18:31 slot
              };
              
              const timetableTimeKey = theoryToTimetableMapping[time] || time;
              
              allScheduledSlots.push({
                course,
                slotCode: slotCode.trim(),
                slotType: slotInfo.type,
                day,
                timeKey: timetableTimeKey,
                actualTime: time
              });
            }
          });
        }
      });
    });

    // Second pass: check for conflicts by comparing all slots
    for (let i = 0; i < allScheduledSlots.length; i++) {
      for (let j = i + 1; j < allScheduledSlots.length; j++) {
        const slot1 = allScheduledSlots[i];
        const slot2 = allScheduledSlots[j];
        
        // Check if different courses occupy the same day and time slot
        if (slot1.course.id !== slot2.course.id &&
            slot1.day === slot2.day &&
            slot1.timeKey === slot2.timeKey) {
          
          conflictList.push({
            courses: [slot1.course, slot2.course],
            existingSlot: slot1.slotCode,
            existingType: slot1.slotType,
            conflictingSlot: slot2.slotCode,
            conflictingType: slot2.slotType,
            day: slot1.day,
            time: slot1.timeKey,
            type: 'time_conflict'
          });
        }
      }
    }

    // If conflicts found, prevent generation completely
    if (conflictList.length > 0) {
      setConflicts(conflictList);
      toast.error(`❌ Cannot generate timetable! Found ${conflictList.length} time conflict(s). Please resolve all conflicts before proceeding.`);
      return;
    } else {
      // Clear any previous conflicts
      setConflicts([]);
      toast.success('✅ No conflicts found! Generating your perfect timetable...');
    }

    setLoading(true);

    // Exact time slots from the provided image - matching the header columns
    const timeSlots = [
      '08:00', '08:51', '09:51', '10:41', '11:40', '12:31',
      'Lunch', 
      '14:00', '14:51', '15:51', '16:41', '17:40', '18:31'
    ];
    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    
    // Initialize timetable grid exactly as shown in image
    const timetableGrid = {};
    weekDays.forEach(day => {
      timetableGrid[day] = {
        THEORY: {},
        LAB: {}
      };
      timeSlots.forEach(timeSlot => {
        timetableGrid[day].THEORY[timeSlot] = null;
        timetableGrid[day].LAB[timeSlot] = null;
      });
    });

    // Fill the timetable with course data - ensure ALL slot components are filled
    completeCourses.forEach(course => {
      const slotCombination = course.slot.split('+');
      
      slotCombination.forEach(slotCode => {
        const slotInfo = slotTimings[slotCode.trim()];
        if (slotInfo) {
          // Process days and times as corresponding pairs
          slotInfo.days.forEach((day, dayIndex) => {
            if (slotInfo.type === 'LAB') {
              // For lab slots, fill both consecutive time slots
              slotInfo.times.forEach(timeKey => {
                if (timetableGrid[day] && timetableGrid[day].LAB[timeKey] !== undefined) {
                  timetableGrid[day].LAB[timeKey] = {
                    faculty: course.faculty,
                    slot: slotCode.trim(),
                    courseNumber: course.courseNumber,
                    slotCombination: course.slot
                  };
                }
              });
            } else {
              // For theory slots, map the time to the correct time slot
              const time = slotInfo.times[dayIndex] || slotInfo.times[0];
              
              // Map theory times to the correct time slots in our grid
              const theoryToSlotMapping = {
                '08:00': '08:00',
                '09:00': '08:51', 
                '10:00': '09:51',
                '11:00': '10:41',
                '12:00': '11:40',
                '14:00': '14:00',
                '15:00': '14:51',
                '16:00': '15:51',
                '17:00': '16:41',
                '18:00': '17:40',
                '19:01': '18:31'
              };
              
              const timeKey = theoryToSlotMapping[time] || time;
              
              if (timetableGrid[day] && timetableGrid[day][slotInfo.type][timeKey] !== undefined) {
                timetableGrid[day][slotInfo.type][timeKey] = {
                  faculty: course.faculty,
                  slot: slotCode.trim(),
                  courseNumber: course.courseNumber,
                  slotCombination: course.slot
                };
              }
            }
          });
        }
      });
    });

    setTimeout(() => {
      setTimetableData({
        courses: completeCourses,
        timetableGrid,
        timeSlots,
        weekDays,
        statistics: {
          totalCourses: completeCourses.length,
        }
      });
      setLoading(false);
      toast.success('VIT FFCS Timetable generated successfully!');
      
      // Scroll to timetable section
      setTimeout(() => {
        const timetableSection = document.querySelector('.timetable-section');
        if (timetableSection) {
          timetableSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }, 1000);
  };

  // ===== TIMETABLE STRUCTURE FUNCTIONS =====
  // Create empty timetable structure for initial display
  const createEmptyTimetable = () => {
    const timeSlots = [
      '08:00', '08:51', '09:51', '10:41', '11:40', '12:31',
      'Lunch', 
      '14:00', '14:51', '15:51', '16:41', '17:40', '18:31'
    ];
    const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
    
    // Initialize empty grid structure
    const timetableGrid = {};
    weekDays.forEach(day => {
      timetableGrid[day] = {
        THEORY: {},
        LAB: {}
      };
      timeSlots.forEach(timeSlot => {
        timetableGrid[day].THEORY[timeSlot] = null;
        timetableGrid[day].LAB[timeSlot] = null;
      });
    });
    
    return {
      courses: [],
      timetableGrid,
      timeSlots,
      weekDays,
      statistics: { totalCourses: 0 }
    };
  };

  // Use either generated timetable data or empty structure
  const emptyTimetableData = createEmptyTimetable();
  const displayTimetableData = timetableData || emptyTimetableData;

  // ===== MAIN COMPONENT RENDER =====
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8">
      {/* Inject print styles for timetable printing */}
      <style>{printStyles}</style>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-blue-500/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 dark:bg-dark-bg-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-dark-bg-700/50">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                VIT FFCS Timetable Generator
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Demo: Enter faculty names and select slots to generate your timetable
            </p>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-teal-400 rounded-full mr-2 animate-pulse"></div>
                <span>Smart scheduling</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-cyan-400 rounded-full mr-2 animate-pulse"></div>
                <span>Conflict detection</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span>VIT optimized</span>
              </div>
            </div>
          </div>
        </div>

        {/* Course Registration Section */}
        <div className="card mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Course Registration
          </h2>

          <div className="space-y-2">
            {courses.map((course) => (
              <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-md" style={{overflow: 'visible'}}>
                {/* Course Header */}
                <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Course {course.courseNumber}
                  </h3>
                  <div className="flex items-center space-x-1">
                    {!course.isEditing && (
                      <button
                        onClick={() => editCourse(course.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                        title="Edit Course"
                      >
                        Edit
                      </button>
                    )}
                    {courses.length > 1 && (
                      <button
                        onClick={() => deleteCourse(course.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                        title="Delete Course"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Table-like Layout */}
                <div className="bg-white dark:bg-gray-900" style={{position: 'relative', overflow: 'visible'}}>
                  {/* Headers */}
                  <div className="grid grid-cols-12 bg-blue-600 text-white text-xs font-semibold">
                    <div className="col-span-5 px-3 py-2 border-r border-blue-500">Faculty</div>
                    <div className="col-span-5 px-3 py-2 border-r border-blue-500">Slot</div>
                    <div className="col-span-2 px-3 py-2 text-center">Action</div>
                  </div>

                  {course.isEditing ? (
                    /* Editing Row */
                    <div className="grid grid-cols-12 border-b border-gray-200 dark:border-gray-700" style={{position: 'relative', overflow: 'visible'}}>
                      <div className="col-span-5 p-2 border-r border-gray-200 dark:border-gray-700">
                        <input
                          type="text"
                          placeholder="Faculty Name"
                          value={course.faculty}
                          onChange={(e) => updateCourse(course.id, 'faculty', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div className="col-span-5 p-2 border-r border-gray-200 dark:border-gray-700" style={{position: 'relative', overflow: 'visible', zIndex: 1000}}>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Enter slot (e.g., A1+TA1)"
                            value={course.slot}
                            onChange={(e) => handleSlotSearch(course.id, e.target.value)}
                            onFocus={() => setShowSlotDropdown(prev => ({ ...prev, [course.id]: true }))}
                            onBlur={() => {
                              // Delay hiding dropdown to allow clicks
                              setTimeout(() => {
                                setShowSlotDropdown(prev => ({ ...prev, [course.id]: false }));
                              }, 300);
                            }}
                            autoComplete="off"
                            className="w-full pl-6 pr-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          
                          {/* Dropdown right below input */}
                          {showSlotDropdown[course.id] && (
                            <div 
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: '0',
                                right: '0',
                                backgroundColor: '#ffffff',
                                border: '1px solid #d1d5db',
                                borderRadius: '6px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                zIndex: 50,
                                maxHeight: '200px',
                                overflowY: 'auto',
                                marginTop: '2px'
                              }}
                            >
                              {filterSlots(course.slot, course.id).length > 0 ? (
                                filterSlots(course.slot, course.id).map((slot, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      padding: '8px 12px',
                                      borderBottom: index < filterSlots(course.slot, course.id).length - 1 ? '1px solid #f3f4f6' : 'none',
                                      fontSize: '12px',
                                      color: '#374151',
                                      cursor: 'pointer',
                                      backgroundColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      selectSlot(course.id, slot);
                                    }}
                                  >
                                    {slot}
                                  </div>
                                ))
                              ) : (
                                <div style={{padding: '12px', fontSize: '12px', color: '#6b7280', textAlign: 'center'}}>
                                  {course.slot.length > 0 ? 'No matching slots found' : 'Start typing to see available slots...'}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                      </div>
                      <div className="col-span-2 p-2 flex justify-center">
                        <button
                          onClick={() => saveCourse(course.id)}
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
                          disabled={!course.faculty || !course.slot}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Row */
                    <div className="grid grid-cols-12 border-b border-gray-200 dark:border-gray-700">
                      <div className="col-span-5 px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                        {course.faculty}
                      </div>
                      <div className="col-span-5 px-3 py-2 border-r border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white">
                        {course.slot}
                      </div>
                      <div className="col-span-2 px-3 py-2 flex justify-center">
                        <button
                          onClick={() => editCourse(course.id)}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          ⚙️
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={addCourse}
              className="btn-secondary flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Course
            </button>
          </div>
        </div>

        {/* Conflicts Display */}
        {conflicts.length > 0 && (
          <div className="card mb-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Time Conflicts Detected
            </h3>
            <div className="space-y-3">
              {conflicts.map((conflict, index) => (
                <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="text-sm text-red-800 dark:text-red-200">
                    <strong>Conflict:</strong> Course {conflict.courses[0].courseNumber} ({conflict.courses[0].faculty}) 
                    has {conflict.existingType} slot "{conflict.existingSlot}" and Course {conflict.courses[1].courseNumber} ({conflict.courses[1].faculty}) 
                    has {conflict.conflictingType} slot "{conflict.conflictingSlot}" - both scheduled at {conflict.time} on {conflict.day}
                    {conflict.existingType !== conflict.conflictingType && (
                      <div className="mt-1 text-xs italic">
                        ⚠️ Cross-category conflict: {conflict.existingType} vs {conflict.conflictingType}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="card mb-4">
          <div className="flex justify-center">
            <button
              onClick={generateTimetable}
              className="btn-primary flex items-center justify-center px-6 py-2 text-base"
              disabled={loading || courses.filter(c => c.faculty && c.slot && !c.isEditing).length === 0}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Checking conflicts and generating...
                </>
              ) : (
                <>
                  <Calendar className="w-5 h-5 mr-3" />
                  Generate Timetable
                </>
              )}
            </button>
          </div>

          <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
            <p>• Add faculty names and select VIT slot combinations</p>
            <p>• Conflicts will be automatically checked before generation</p>
            <p>• <strong>All conflicts must be resolved before timetable generation</strong></p>
          </div>
        </div>

        {/* Timetable Display Section */}
        <div className="timetable-section w-full">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                {timetableData ? 'Generated Timetable' : 'Timetable Preview'}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {timetableData ? `${displayTimetableData.statistics.totalCourses} Courses Scheduled` : 'Add courses above and click Generate to populate'}
              </p>
            </div>
            {timetableData && (
              <button
                onClick={downloadTimetableImage}
                className="btn-secondary flex items-center text-sm px-3 py-2"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </button>
            )}
          </div>

          <div className="w-full overflow-x-auto print-area" style={{height: 'calc(100vh - 200px)', minHeight: '600px'}}>
            <table className="w-full border-collapse border border-gray-400" style={{minWidth: '100%', tableLayout: 'fixed', fontSize: '10px', height: '100%'}}>
              <thead>
                <tr>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                    THEORY
                  </th>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                    Start
                  </th>
                  {displayTimetableData.timeSlots.map(timeSlot => {
                    if (timeSlot === 'Lunch') {
                      return (
                        <th key={`theory-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                          Lunch
                        </th>
                      );
                    }

                    const timeDisplay = {
                      '08:00': '08:00',
                      '08:51': '09:00',
                      '09:51': '10:00',
                      '10:41': '11:00',
                      '11:40': '12:00',
                      '12:31': '-',
                      '14:00': '14:00',
                      '14:51': '15:00',
                      '15:51': '16:00',
                      '16:41': '17:00',
                      '17:40': '18:00',
                      '18:31': '19:01'
                    };

                    const displayTime = timeDisplay[timeSlot] || timeSlot;
                    return (
                      <th key={`theory-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                        {displayTime}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{fontSize: '10px'}}>
                    
                  </th>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{fontSize: '10px'}}>
                    End
                  </th>
                  {displayTimetableData.timeSlots.map(timeSlot => {
                    if (timeSlot === 'Lunch') {
                      return (
                        <th key={`theory-end-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{fontSize: '10px'}}>
                          Lunch
                        </th>
                      );
                    }
                    
                    const endTimeDisplay = {
                      '08:00': '08:50',
                      '08:51': '09:50', 
                      '09:51': '10:50',
                      '10:41': '11:50',
                      '11:40': '12:50',
                      '12:31': '-',
                      '14:00': '14:50',
                      '14:51': '15:50',
                      '15:51': '16:50',
                      '16:41': '17:50',
                      '17:40': '18:50',
                      '18:31': '19:50'
                    };
                    
                    const displayEndTime = endTimeDisplay[timeSlot] || timeSlot;
                    return (
                      <th key={`theory-end-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{fontSize: '10px'}}>
                        {displayEndTime}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                    LAB
                  </th>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                    Start
                  </th>
                  {displayTimetableData.timeSlots.map(timeSlot => {
                    if (timeSlot === 'Lunch') {
                      return (
                        <th key={`lab-start-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold">
                          Lunch
                        </th>
                      );
                    }
                    
                    const labStartTimeDisplay = {
                      '08:00': '08:00',
                      '08:51': '08:51', 
                      '09:51': '09:51',
                      '10:41': '10:41',
                      '11:40': '11:40',
                      '12:31': '12:31',
                      '14:00': '14:00',
                      '14:51': '14:51',
                      '15:51': '15:51',
                      '16:41': '16:41',
                      '17:40': '17:40',
                      '18:31': '18:31'
                    };
                    
                    const displayLabStartTime = labStartTimeDisplay[timeSlot] || timeSlot;
                    return (
                      <th key={`lab-start-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold">
                        {displayLabStartTime}
                      </th>
                    );
                  })}
                </tr>
                <tr>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                    THEORY
                  </th>
                  <th className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                    End
                  </th>
                  {displayTimetableData.timeSlots.map(timeSlot => {
                    if (timeSlot === 'Lunch') {
                      return (
                        <th key={`lab-end-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                          Lunch
                        </th>
                      );
                    }

                    // Lab end times mapping
                    const labEndTimeDisplay = {
                      '08:00': '08:50', '08:51': '09:40', '09:51': '10:40',
                      '10:41': '11:30', '11:40': '12:30', '12:31': '13:20',
                      '14:00': '14:50', '14:51': '15:40', '15:51': '16:40',
                      '16:41': '17:30', '17:40': '18:30', '18:31': '19:20'
                    };

                    const displayLabEndTime = labEndTimeDisplay[timeSlot] || timeSlot;
                    return (
                      <th key={`lab-end-${timeSlot}`} className="border border-gray-400 px-1 py-1 bg-gray-200 text-black font-bold" style={{width: '28px', fontSize: '9px', height: '24px'}}>
                        {displayLabEndTime}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {displayTimetableData.weekDays.map(day => (
                  <React.Fragment key={day}>
                    <tr>
                      <td rowSpan={2} className="border border-gray-400 px-2 py-2 bg-gray-100 text-center font-bold text-black" style={{height: '70px', fontSize: '12px'}}>
                        {day}
                      </td>
                      <td className="border border-gray-400 px-1 py-1 bg-gray-100 text-center font-bold text-black" style={{fontSize: '10px'}}>
                        THEORY
                      </td>
                      {displayTimetableData.timeSlots.map(timeSlot => {
                        if (timeSlot === 'Lunch') {
                          return (
                            <td key={`${day}-theory-${timeSlot}`} rowSpan={2} className="border border-gray-400 px-1 py-1 text-center bg-blue-100">
                              <div className="text-blue-800 text-xs font-semibold">Lunch</div>
                            </td>
                          );
                        }
                        
                        const courseData = displayTimetableData.timetableGrid[day].THEORY[timeSlot];
                        const availableSlotCodes = getSlotCodesForTimeSlot(day, timeSlot, 'THEORY');
                        
                        return (
                          <td key={`${day}-theory-${timeSlot}`} className="border border-gray-400 px-2 py-2 text-center" style={{backgroundColor: courseData ? '#FFFF99' : '#FFFFFF', height: '35px'}}>
                            {courseData ? (
                              <div className="text-black font-bold leading-tight" style={{fontSize: '11px'}}>
                                <div className="font-bold">{courseData.slot}</div>
                              </div>
                            ) : (
                              <div className="text-gray-700 leading-tight" style={{fontSize: '10px'}}>
                                {availableSlotCodes.length > 0 ? availableSlotCodes.join(', ') : '-'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="border border-gray-400 px-1 py-1 bg-gray-100 text-center font-bold text-black" style={{fontSize: '10px'}}>
                        LAB
                      </td>
                      {displayTimetableData.timeSlots.map(timeSlot => {
                        if (timeSlot === 'Lunch') {
                          return null;
                        }
                        
                        const courseData = displayTimetableData.timetableGrid[day].LAB[timeSlot];
                        const availableLabSlotCodes = getSlotCodesForTimeSlot(day, timeSlot, 'LAB');
                        
                        return (
                          <td key={`${day}-lab-${timeSlot}`} className="border border-gray-400 px-2 py-2 text-center" style={{backgroundColor: courseData ? '#90EE90' : '#FFFFFF', height: '35px'}}>
                            {courseData ? (
                              <div className="text-black font-bold leading-tight" style={{fontSize: '11px'}}>
                                <div className="font-bold">{courseData.slot}</div>
                              </div>
                            ) : (
                              <div className="text-gray-700 leading-tight" style={{fontSize: '10px'}}>
                                {availableLabSlotCodes.length > 0 ? availableLabSlotCodes.join(', ') : '-'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Registered Courses - Only show when timetable is generated */}
          {timetableData && (
            <div className="mt-6 card print-area">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Registered Courses
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 course-grid">
                {displayTimetableData.courses.map(course => (
                  <div key={course.id} className="p-3 bg-gray-50 dark:bg-dark-bg-700 rounded-lg border course-item">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                      Course {course.courseNumber}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Faculty: {course.faculty}
                    </div>
                    <div className="text-xs bg-primary-100 dark:bg-primary-900 text-primary-800 dark:text-primary-200 px-2 py-1 rounded font-medium">
                      Slots: {course.slot}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        
      </div>
    </div>
  );
};

export default FFCSTimetable;