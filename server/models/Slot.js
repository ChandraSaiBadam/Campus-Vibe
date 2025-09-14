const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  slotType: {
    type: String,
    required: [true, 'Slot type is required'],
    enum: ['Theory', 'Lab', 'Project']
  },
  slotCode: {
    type: String,
    required: [true, 'Slot code is required'],
    unique: true,
    trim: true,
    uppercase: true,
    maxlength: [10, 'Slot code cannot exceed 10 characters']
  },
  days: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  }],
  startTime: {
    type: String,
    required: [true, 'Start time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'End time is required'],
    match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please enter a valid time in HH:MM format']
  },
  venue: {
    type: String,
    trim: true,
    maxlength: [100, 'Venue cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Virtual for duration in minutes
slotSchema.virtual('duration').get(function() {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  return endMinutes - startMinutes;
});

// Validation to ensure end time is after start time
slotSchema.pre('save', function(next) {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

// Indexes for better query performance
slotSchema.index({ slotCode: 1 });
slotSchema.index({ slotType: 1 });
slotSchema.index({ days: 1 });
slotSchema.index({ startTime: 1, endTime: 1 });
slotSchema.index({ isActive: 1 });

module.exports = mongoose.model('Slot', slotSchema);