const mongoose = require('mongoose');

const timetableSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: [true, 'Course ID is required']
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: [true, 'Faculty ID is required']
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Slot',
    required: [true, 'Slot ID is required']
  },
  semester: {
    type: String,
    required: [true, 'Semester is required'],
    enum: ['Fall', 'Winter', 'Summer'],
    default: 'Fall'
  },
  academicYear: {
    type: String,
    required: [true, 'Academic year is required'],
    match: [/^\d{4}-\d{4}$/, 'Academic year must be in format YYYY-YYYY (e.g., 2023-2024)']
  },
  section: {
    type: String,
    trim: true,
    maxlength: [10, 'Section cannot exceed 10 characters'],
    default: 'A'
  },
  maxStudents: {
    type: Number,
    min: [1, 'Max students must be at least 1'],
    max: [200, 'Max students cannot exceed 200'],
    default: 60
  },
  enrolledStudents: {
    type: Number,
    min: [0, 'Enrolled students cannot be negative'],
    default: 0
  },
  venue: {
    type: String,
    trim: true,
    maxlength: [100, 'Venue cannot exceed 100 characters']
  },
  classType: {
    type: String,
    enum: ['Regular', 'Lab', 'Tutorial', 'Seminar', 'Project'],
    default: 'Regular'
  },
  requirements: {
    type: String,
    trim: true,
    maxlength: [500, 'Requirements cannot exceed 500 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  registrationOpen: {
    type: Boolean,
    default: true
  },
  registrationDeadline: {
    type: Date
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
timetableSchema.index({ courseId: 1, facultyId: 1, slotId: 1 });
timetableSchema.index({ semester: 1, academicYear: 1 });
timetableSchema.index({ facultyId: 1, semester: 1, academicYear: 1 });
timetableSchema.index({ courseId: 1, semester: 1, academicYear: 1 });
timetableSchema.index({ isActive: 1, registrationOpen: 1 });

// Ensure unique combination of course, faculty, slot, semester, and academic year
timetableSchema.index(
  { courseId: 1, facultyId: 1, slotId: 1, semester: 1, academicYear: 1, section: 1 },
  { unique: true }
);

// Virtual for availability
timetableSchema.virtual('availability').get(function() {
  return {
    available: this.maxStudents - this.enrolledStudents,
    percentage: ((this.maxStudents - this.enrolledStudents) / this.maxStudents) * 100
  };
});

// Virtual for registration status
timetableSchema.virtual('canRegister').get(function() {
  const now = new Date();
  return (
    this.isActive &&
    this.registrationOpen &&
    this.enrolledStudents < this.maxStudents &&
    (!this.registrationDeadline || now <= this.registrationDeadline)
  );
});

// Pre-save validation
timetableSchema.pre('save', function(next) {
  if (this.enrolledStudents > this.maxStudents) {
    return next(new Error('Enrolled students cannot exceed maximum capacity'));
  }
  
  // Set registration deadline if not provided (default to 2 weeks from creation)
  if (this.isNew && !this.registrationDeadline) {
    this.registrationDeadline = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  }
  
  next();
});

// Static method to find available courses for timetable generation
timetableSchema.statics.findAvailableCourses = function(semester, academicYear, filters = {}) {
  const query = {
    semester,
    academicYear,
    isActive: true,
    registrationOpen: true,
    ...filters
  };
  
  return this.find(query)
    .populate('courseId', 'courseCode courseName credits department')
    .populate('facultyId', 'name department designation')
    .populate('slotId', 'slotCode slotType days startTime endTime')
    .sort({ 'courseId.courseCode': 1 });
};

module.exports = mongoose.model('Timetable', timetableSchema);