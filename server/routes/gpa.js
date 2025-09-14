const express = require('express');
const router = express.Router();

// GPA calculation function
const calculateGPA = (subjects, gradingSystem = '10') => {
  let totalCredits = 0;
  let totalGradePoints = 0;

  subjects.forEach(subject => {
    const credits = parseFloat(subject.credits) || 0;
    const grade = parseFloat(subject.grade) || 0;
    
    if (credits > 0 && grade > 0) {
      totalCredits += credits;
      totalGradePoints += (credits * grade);
    }
  });

  return totalCredits > 0 ? (totalGradePoints / totalCredits).toFixed(2) : '0.00';
};

// POST /api/gpa/calculate
router.post('/calculate', (req, res) => {
  try {
    const { subjects, gradingSystem } = req.body;

    if (!subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        message: 'Subjects must be an array' 
      });
    }

    if (subjects.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        message: 'At least one subject is required' 
      });
    }

    // Validate each subject (allow grade 0 for failing grades)
    const validSubjects = subjects.filter(subject => {
      return subject.name &&
             subject.credits &&
             subject.grade !== undefined &&
             parseFloat(subject.credits) > 0 &&
             parseFloat(subject.grade) >= 0;
    });

    if (validSubjects.length === 0) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        message: 'No valid subjects found' 
      });
    }

    const gpa = calculateGPA(validSubjects, gradingSystem);
    const totalCredits = validSubjects.reduce((sum, subject) => sum + parseFloat(subject.credits || 0), 0);

    res.json({
      success: true,
      gpa: parseFloat(gpa),
      totalCredits: totalCredits,
      subjects: validSubjects,
      gradingSystem: gradingSystem || '10'
    });

  } catch (error) {
    console.error('GPA calculation error:', error);
    res.status(500).json({ 
      error: 'Calculation failed', 
      message: 'An error occurred while calculating GPA' 
    });
  }
});

// GET /api/gpa/grading-systems
router.get('/grading-systems', (req, res) => {
  res.json({
    systems: [
      {
        name: '10-Point System',
        value: '10',
        description: 'Grades from 0-10, commonly used in many universities'
      },
      {
        name: '4-Point System',
        value: '4',
        description: 'Grades from 0-4, commonly used in US universities'
      }
    ]
  });
});

module.exports = router; 