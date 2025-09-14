const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  employeeId: {
    type: String,
    required: [true, 'Employee ID is required'],
    unique: true,
    trim: true,
    maxlength: [20, 'Employee ID cannot exceed 20 characters']
  },
  name: {
    type: String,
    required: [true, 'Faculty name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true
  },
  designation: {
    type: String,
    enum: ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer', 'Senior Lecturer'],
    default: 'Assistant Professor'
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  office: {
    type: String,
    trim: true,
    maxlength: [100, 'Office location cannot exceed 100 characters']
  },
  specialization: [{
    type: String,
    trim: true
  }],
  experience: {
    type: Number,
    min: [0, 'Experience cannot be negative'],
    max: [50, 'Experience cannot exceed 50 years']
  },
  qualifications: [{
    degree: {
      type: String,
      trim: true
    },
    institution: {
      type: String,
      trim: true
    },
    year: {
      type: Number,
      min: 1950,
      max: new Date().getFullYear()
    }
  }],
  researchInterests: [{
    type: String,
    trim: true
  }],
  profilePicture: {
    type: String,
    trim: true
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
facultySchema.index({ employeeId: 1 });
facultySchema.index({ email: 1 });
facultySchema.index({ department: 1 });
facultySchema.index({ name: 'text' }); // Text search index
facultySchema.index({ isActive: 1 });

// Virtual for full contact info
facultySchema.virtual('contactInfo').get(function() {
  return {
    email: this.email,
    phone: this.phone,
    office: this.office
  };
});

module.exports = mongoose.model('Faculty', facultySchema);