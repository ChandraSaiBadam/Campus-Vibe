const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Slot = require('../models/Slot');
const Timetable = require('../models/Timetable');

// Helper function to get client IP
const getClientIP = (req) => {
  return req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
         (req.connection.socket ? req.connection.socket.remoteAddress : null) || 'unknown';
};

// Get all available courses with pagination and filtering
router.get('/courses', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { semester, academicYear, department, courseType } = req.query;

    let query = { isActive: true };
    if (department) query.department = department;
    if (courseType) query.courseType = courseType;

    const courses = await Course.find(query)
      .sort({ courseCode: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Course.countDocuments(query);

    res.json({
      courses,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ error: 'Failed to fetch courses' });
  }
});

// Get all faculty members with pagination and filtering
router.get('/faculty', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const { department, designation } = req.query;

    let query = { isActive: true };
    if (department) query.department = department;
    if (designation) query.designation = designation;

    const faculty = await Faculty.find(query)
      .select('name department designation email phone office')
      .sort({ name: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await Faculty.countDocuments(query);

    res.json({
      faculty,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching faculty:', error);
    res.status(500).json({ error: 'Failed to fetch faculty' });
  }
});

// Get all slots with filtering
router.get('/slots', async (req, res) => {
  try {
    const { slotType } = req.query;
    
    let query = { isActive: true };
    if (slotType) query.slotType = slotType;

    const slots = await Slot.find(query)
      .sort({ slotCode: 1 })
      .lean();

    res.json({ slots });
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
});

// Get available timetable combinations with comprehensive filtering
router.get('/available', async (req, res) => {
  try {
    const { 
      semester = 'Fall', 
      academicYear = '2024-2025',
      department,
      facultyName,
      slotCode,
      courseCode,
      page = 1,
      limit = 20
    } = req.query;

    let pipeline = [
      {
        $match: {
          semester,
          academicYear,
          isActive: true,
          registrationOpen: true
        }
      },
      {
        $lookup: {
          from: 'courses',
          localField: 'courseId',
          foreignField: '_id',
          as: 'course'
        }
      },
      {
        $lookup: {
          from: 'faculties',
          localField: 'facultyId',
          foreignField: '_id',
          as: 'faculty'
        }
      },
      {
        $lookup: {
          from: 'slots',
          localField: 'slotId',
          foreignField: '_id',
          as: 'slot'
        }
      },
      {
        $unwind: '$course'
      },
      {
        $unwind: '$faculty'
      },
      {
        $unwind: '$slot'
      }
    ];

    // Add filters
    if (department) {
      pipeline.push({
        $match: { 'course.department': department }
      });
    }

    if (facultyName) {
      pipeline.push({
        $match: { 
          'faculty.name': { $regex: facultyName, $options: 'i' }
        }
      });
    }

    if (slotCode) {
      pipeline.push({
        $match: { 'slot.slotCode': slotCode }
      });
    }

    if (courseCode) {
      pipeline.push({
        $match: { 
          'course.courseCode': { $regex: courseCode, $options: 'i' }
        }
      });
    }

    // Add pagination
    pipeline.push(
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          course: {
            _id: '$course._id',
            courseCode: '$course.courseCode',
            courseName: '$course.courseName',
            credits: '$course.credits',
            department: '$course.department',
            courseType: '$course.courseType'
          },
          faculty: {
            _id: '$faculty._id',
            name: '$faculty.name',
            department: '$faculty.department',
            designation: '$faculty.designation'
          },
          slot: {
            _id: '$slot._id',
            slotCode: '$slot.slotCode',
            slotType: '$slot.slotType',
            days: '$slot.days',
            startTime: '$slot.startTime',
            endTime: '$slot.endTime',
            venue: '$slot.venue'
          },
          maxStudents: 1,
          enrolledStudents: 1,
          section: 1,
          venue: 1,
          classType: 1,
          availability: {
            $subtract: ['$maxStudents', '$enrolledStudents']
          },
          canRegister: {
            $and: [
              '$isActive',
              '$registrationOpen',
              { $lt: ['$enrolledStudents', '$maxStudents'] }
            ]
          }
        }
      }
    );

    const timetables = await Timetable.aggregate(pipeline);

    // Get total count for pagination
    const countPipeline = pipeline.slice(0, -3); // Remove skip, limit, and project stages
    countPipeline.push({ $count: 'total' });
    const countResult = await Timetable.aggregate(countPipeline);
    const total = countResult.length > 0 ? countResult[0].total : 0;

    res.json({
      timetables,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total
      }
    });
  } catch (error) {
    console.error('Error fetching available timetables:', error);
    res.status(500).json({ error: 'Failed to fetch available timetables' });
  }
});

// Check for timetable conflicts
router.post('/check-conflicts', async (req, res) => {
  try {
    const { selectedCourses } = req.body;
    
    if (!selectedCourses || !Array.isArray(selectedCourses)) {
      return res.status(400).json({ error: 'Selected courses array is required' });
    }

    const timetableIds = selectedCourses.map(id => id);
    
    const timetables = await Timetable.find({
      _id: { $in: timetableIds }
    })
    .populate('slotId', 'days startTime endTime slotCode')
    .populate('courseId', 'courseCode courseName')
    .lean();

    const conflicts = [];
    const timeSlots = {};

    // Check for time conflicts
    timetables.forEach((timetable, index) => {
      const slot = timetable.slotId;
      
      slot.days.forEach(day => {
        const timeKey = `${day}-${slot.startTime}-${slot.endTime}`;
        
        if (timeSlots[timeKey]) {
          conflicts.push({
            type: 'time_conflict',
            courses: [
              {
                id: timeSlots[timeKey]._id,
                courseCode: timeSlots[timeKey].courseId.courseCode,
                courseName: timeSlots[timeKey].courseId.courseName
              },
              {
                id: timetable._id,
                courseCode: timetable.courseId.courseCode,
                courseName: timetable.courseId.courseName
              }
            ],
            conflictDetails: {
              day,
              time: `${slot.startTime} - ${slot.endTime}`,
              slots: [timeSlots[timeKey].slotId.slotCode, slot.slotCode]
            }
          });
        } else {
          timeSlots[timeKey] = timetable;
        }
      });
    });

    // Check for course duplicates
    const courseMap = {};
    timetables.forEach(timetable => {
      const courseCode = timetable.courseId.courseCode;
      if (courseMap[courseCode]) {
        conflicts.push({
          type: 'course_duplicate',
          courses: [
            {
              id: courseMap[courseCode]._id,
              courseCode: courseMap[courseCode].courseId.courseCode,
              courseName: courseMap[courseCode].courseId.courseName
            },
            {
              id: timetable._id,
              courseCode: timetable.courseId.courseCode,
              courseName: timetable.courseId.courseName
            }
          ]
        });
      } else {
        courseMap[courseCode] = timetable;
      }
    });

    const hasConflicts = conflicts.length > 0;

    res.json({
      hasConflicts,
      conflicts,
      summary: {
        totalCourses: timetables.length,
        totalCredits: timetables.reduce((sum, t) => sum + t.courseId.credits, 0),
        conflictCount: conflicts.length
      }
    });
  } catch (error) {
    console.error('Error checking conflicts:', error);
    res.status(500).json({ error: 'Failed to check conflicts' });
  }
});

// Generate timetable view
router.post('/generate', async (req, res) => {
  try {
    const { selectedCourses } = req.body;
    
    if (!selectedCourses || !Array.isArray(selectedCourses)) {
      return res.status(400).json({ error: 'Selected courses array is required' });
    }

    const timetables = await Timetable.find({
      _id: { $in: selectedCourses }
    })
    .populate('courseId', 'courseCode courseName credits department')
    .populate('facultyId', 'name')
    .populate('slotId', 'slotCode days startTime endTime venue')
    .lean();

    // Create a weekly timetable structure
    const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [];
    
    // Get all unique time slots
    const timeSet = new Set();
    timetables.forEach(timetable => {
      timeSet.add(`${timetable.slotId.startTime}-${timetable.slotId.endTime}`);
    });
    
    const sortedTimes = Array.from(timeSet).sort();
    
    // Create timetable grid
    const timetableGrid = {};
    weekDays.forEach(day => {
      timetableGrid[day] = {};
      sortedTimes.forEach(timeSlot => {
        timetableGrid[day][timeSlot] = null;
      });
    });

    // Fill the timetable grid
    timetables.forEach(timetable => {
      const timeSlot = `${timetable.slotId.startTime}-${timetable.slotId.endTime}`;
      const courseData = {
        id: timetable._id,
        courseCode: timetable.courseId.courseCode,
        courseName: timetable.courseId.courseName,
        faculty: timetable.facultyId.name,
        venue: timetable.slotId.venue || timetable.venue || 'TBA',
        credits: timetable.courseId.credits,
        slotCode: timetable.slotId.slotCode,
        section: timetable.section
      };

      timetable.slotId.days.forEach(day => {
        timetableGrid[day][timeSlot] = courseData;
      });
    });

    // Calculate statistics
    const totalCredits = timetables.reduce((sum, t) => sum + t.courseId.credits, 0);
    const departments = [...new Set(timetables.map(t => t.courseId.department))];
    
    res.json({
      timetableGrid,
      timeSlots: sortedTimes,
      weekDays,
      statistics: {
        totalCourses: timetables.length,
        totalCredits,
        departments,
        averageCreditsPerDay: (totalCredits / 5).toFixed(1)
      },
      courses: timetables.map(t => ({
        id: t._id,
        courseCode: t.courseId.courseCode,
        courseName: t.courseId.courseName,
        faculty: t.facultyId.name,
        credits: t.courseId.credits,
        slot: t.slotId.slotCode,
        section: t.section
      }))
    });
  } catch (error) {
    console.error('Error generating timetable:', error);
    res.status(500).json({ error: 'Failed to generate timetable' });
  }
});

// Get departments for filtering
router.get('/departments', async (req, res) => {
  try {
    const departments = await Course.distinct('department', { isActive: true });
    res.json({ departments: departments.sort() });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
});

// Get course types for filtering
router.get('/course-types', async (req, res) => {
  try {
    const courseTypes = await Course.distinct('courseType', { isActive: true });
    res.json({ courseTypes: courseTypes.sort() });
  } catch (error) {
    console.error('Error fetching course types:', error);
    res.status(500).json({ error: 'Failed to fetch course types' });
  }
});

// Get unique slot codes for filtering
router.get('/slot-codes', async (req, res) => {
  try {
    const slotCodes = await Slot.distinct('slotCode', { isActive: true });
    res.json({ slotCodes: slotCodes.sort() });
  } catch (error) {
    console.error('Error fetching slot codes:', error);
    res.status(500).json({ error: 'Failed to fetch slot codes' });
  }
});

// Search courses by name or code
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchRegex = new RegExp(q, 'i');
    
    const courses = await Course.find({
      isActive: true,
      $or: [
        { courseCode: searchRegex },
        { courseName: searchRegex }
      ]
    })
    .select('courseCode courseName credits department')
    .limit(parseInt(limit))
    .sort({ courseCode: 1 })
    .lean();

    res.json({ courses });
  } catch (error) {
    console.error('Error searching courses:', error);
    res.status(500).json({ error: 'Failed to search courses' });
  }
});

module.exports = router;