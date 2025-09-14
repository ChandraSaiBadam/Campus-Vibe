const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Course = require('../models/Course');
const Faculty = require('../models/Faculty');
const Slot = require('../models/Slot');
const Timetable = require('../models/Timetable');

// Sample data
const sampleCourses = [
  {
    courseCode: 'CSE2001',
    courseName: 'Computer Programming',
    credits: 3,
    department: 'Computer Science and Engineering',
    courseType: 'Theory',
    description: 'Introduction to programming concepts using C++',
    academicYear: '2024-2025',
    semester: 'Fall'
  },
  {
    courseCode: 'CSE2002',
    courseName: 'Data Structures and Algorithms',
    credits: 4,
    department: 'Computer Science and Engineering',
    courseType: 'Theory',
    description: 'Study of data structures and algorithms in computer science',
    academicYear: '2024-2025',
    semester: 'Fall'
  }
];

const connectToDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vitconnect";
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      retryWrites: true,
      w: "majority",
    });
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    // Clear existing data
    await Promise.all([
      Timetable.deleteMany({}),
      Course.deleteMany({}),
      Faculty.deleteMany({}),
      Slot.deleteMany({})
    ]);
    console.log('🧹 Cleared existing data');

    // Insert courses
    const insertedCourses = await Course.insertMany(sampleCourses);
    console.log(`📚 Inserted ${insertedCourses.length} courses`);

    // Insert faculty
    const insertedFaculty = await Faculty.insertMany(sampleFaculty);
    console.log(`👨‍🏫 Inserted ${insertedFaculty.length} faculty members`);

    // Insert slots
    const insertedSlots = await Slot.insertMany(sampleSlots);
    console.log(`🕐 Inserted ${insertedSlots.length} time slots`);

    // Create timetable combinations
    const timetableData = [];
    
    // CSE2001 - Computer Programming
    timetableData.push({
      course: insertedCourses[0]._id, // CSE2001
      faculty: insertedFaculty[0]._id, // Dr. Rajesh Kumar
      slot: insertedSlots[0]._id, // A1
      section: 'L1',
      enrolledStudents: 45,
      academicYear: '2024-2025',
      semester: 'Fall'
    });

    timetableData.push({
      course: insertedCourses[0]._id, // CSE2001
      faculty: insertedFaculty[0]._id, // Dr. Rajesh Kumar
      slot: insertedSlots[2]._id, // C1
      section: 'L2',
      enrolledStudents: 38,
      academicYear: '2024-2025',
      semester: 'Fall'
    });

    // CSE2002 - Data Structures and Algorithms
    timetableData.push({
      course: insertedCourses[1]._id, // CSE2002
      faculty: insertedFaculty[0]._id, // Dr. Rajesh Kumar
      slot: insertedSlots[1]._id, // B1
      section: 'L1',
      enrolledStudents: 42,
      academicYear: '2024-2025',
      semester: 'Fall'
    });

    // Insert timetable data
    const insertedTimetables = await Timetable.insertMany(timetableData);
    console.log(`📅 Inserted ${insertedTimetables.length} timetable entries`);

    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   • Courses: ${insertedCourses.length}`);
    console.log(`   • Faculty: ${insertedFaculty.length}`);
    console.log(`   • Time Slots: ${insertedSlots.length}`);
    console.log(`   • Timetable Entries: ${insertedTimetables.length}`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
};

const main = async () => {
  const connected = await connectToDatabase();
  
  if (!connected) {
    console.error('❌ Cannot seed database without connection');
    process.exit(1);
  }

  try {
    await seedDatabase();
    console.log('\n🎉 Seeding completed successfully!');
    console.log('💡 You can now test the FFCS Timetable functionality');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seeding script
if (require.main === module) {
  main();
}

module.exports = { seedDatabase };