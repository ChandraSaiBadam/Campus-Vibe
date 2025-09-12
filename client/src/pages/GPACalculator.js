import React, { useState } from "react";
import { Plus, Trash2, Calculator, Download, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";

const GPACalculator = () => {
  const [subjects, setSubjects] = useState([
    { credits: "", grade: "" },
    { credits: "", grade: "" },
    { credits: "", grade: "" }
  ]);
  const [result, setResult] = useState(null);
  const [cgpaData, setCgpaData] = useState({
    previousCgpa: "",
    totalCredits: "",
    currentGpa: "",
    currentCredits: "",
  });
  const [showGpaCalculator, setShowGpaCalculator] = useState(true);

  const addSubject = () => {
    setSubjects([...subjects, { credits: "", grade: "" }]);
  };

  const removeSubject = (index) => {
    if (subjects.length > 1) {
      const newSubjects = subjects.filter((_, i) => i !== index);
      setSubjects(newSubjects);
    }
  };

  // Grade mapping for dropdown
  const gradeOptions = [
    { label: "S", value: 10 },
    { label: "A", value: 9 },
    { label: "B", value: 8 },
    { label: "C", value: 7 },
    { label: "D", value: 6 },
    { label: "E", value: 5 },
    { label: "F/N", value: 0 },
  ];

  const updateSubject = (index, field, value) => {
    const newSubjects = [...subjects];
    newSubjects[index][field] = value;
    setSubjects(newSubjects);
  };

  const calculateGPA = () => {
    // Validate inputs
    const validSubjects = subjects.filter(
      (subject) => subject.credits && subject.grade
    );

    if (validSubjects.length === 0) {
      toast.error("Please add at least one subject with valid data");
      return;
    }

    // Calculate GPA
    let totalCredits = 0;
    let totalGradePoints = 0;

    validSubjects.forEach((subject) => {
      const credits = parseFloat(subject.credits) || 0;
      const grade = parseFloat(subject.grade) || 0;

      if (credits > 0 && grade >= 0) {
        totalCredits += credits;
        totalGradePoints += credits * grade;
      }
    });

    if (totalCredits > 0) {
      const gpa = (totalGradePoints / totalCredits).toFixed(2);
      setResult({ gpa, totalCredits, subjects: validSubjects.length });
      toast.success("GPA calculated successfully!");
    } else {
      toast.error("Please enter valid credits and grades");
    }
  };

  const calculateCGPA = () => {
    const { previousCgpa, totalCredits, currentGpa, currentCredits } = cgpaData;

    // Validate inputs
    if (!previousCgpa || !totalCredits || !currentGpa || !currentCredits) {
      toast.error("Please fill in all fields");
      return;
    }

    const prevCgpa = parseFloat(previousCgpa);
    const prevCredits = parseFloat(totalCredits);
    const currGpa = parseFloat(currentGpa);
    const currCredits = parseFloat(currentCredits);

    if (
      isNaN(prevCgpa) ||
      isNaN(prevCredits) ||
      isNaN(currGpa) ||
      isNaN(currCredits)
    ) {
      toast.error("Please enter valid numbers");
      return;
    }

    if (prevCredits < 0 || currCredits < 0) {
      toast.error("Credits cannot be negative");
      return;
    }

    // Calculate CGPA
    const totalPoints = prevCgpa * prevCredits + currGpa * currCredits;
    const totalCreditsCGPA = prevCredits + currCredits;
    const cgpa = (totalPoints / totalCreditsCGPA).toFixed(2);

    setResult({ cgpa, totalCredits: totalCreditsCGPA });
    toast.success("CGPA calculated successfully!");
  };

  const resetCalculator = () => {
    setSubjects([{ credits: "", grade: "" }]);
    setResult(null);
    setCgpaData({
      previousCgpa: "",
      totalCredits: "",
      currentGpa: "",
      currentCredits: "",
    });
    toast.success("Calculator reset");
  };

  const downloadResult = () => {
    if (!result) return;

    let content = "";
    if (result.gpa) {
      content = `
Campus Connect - GPA Calculation Result

GPA: ${result.gpa}
Total Credits: ${result.totalCredits}
Subjects: ${result.subjects}

Calculated on: ${new Date().toLocaleString()}
      `;
    } else if (result.cgpa) {
      content = `
Campus Connect - CGPA Calculation Result

CGPA: ${result.cgpa}
Total Credits: ${result.totalCredits}

Calculated on: ${new Date().toLocaleString()}
      `;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = result.gpa ? "gpa-calculation.txt" : "cgpa-calculation.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
  <div className="min-h-screen bg-gray-50 dark:bg-dark-bg-900 py-8 transition-colors duration-200 particles-bg smooth-scroll">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 relative animate-fade-in-up">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl"></div>
          <div className="relative bg-white/80 dark:bg-dark-bg-800/80 backdrop-blur-md rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-dark-bg-700/50">
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                <Calculator className="w-8 h-8 text-white animate-float" />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                GPA & CGPA Calculator
              </h1>
            </div>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed animate-slide-up-fade">
              Calculate your GPA and CGPA with our easy-to-use calculator
            </p>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse"></div>
                <span>Accurate calculations</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></div>
                <span>10-point & 4-point scale</span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-purple-400 rounded-full mr-2 animate-pulse"></div>
                <span>Instant results</span>
              </div>
            </div>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div className="flex justify-center mb-8 animate-fade-in-up stagger-1">
          <div className="inline-flex rounded-2xl shadow-xl bg-white/80 dark:bg-dark-bg-800/80 backdrop-blur-md border border-white/20 dark:border-dark-bg-700/50 p-1" role="group">
            <button
              type="button"
              onClick={() => setShowGpaCalculator(true)}
              className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 hover-ripple relative ${
                showGpaCalculator
                  ? "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-lg transform scale-105"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg-700 hover:scale-105"
              }`}
            >
              {showGpaCalculator && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl blur-lg opacity-50"></div>
              )}
              <span className="relative">GPA Calculator</span>
            </button>
            <button
              type="button"
              onClick={() => setShowGpaCalculator(false)}
              className={`px-6 py-3 text-sm font-semibold rounded-xl transition-all duration-300 hover-ripple relative ${
                !showGpaCalculator
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-bg-700 hover:scale-105"
              }`}
            >
              {!showGpaCalculator && (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50"></div>
              )}
              <span className="relative">CGPA Calculator</span>
            </button>
          </div>
        </div>

        {showGpaCalculator ? (
          <>
            <div className="flex flex-col items-center w-full">
              {/* GPA Calculator Form */}
              <div className="w-full max-w-2xl animate-fade-in-up stagger-2">
                <div className="card-enhanced hover-3d">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white gradient-text-animated">
                      GPA Calculator
                    </h2>
                  </div>

                  {/* Subjects */}
                  <div className="space-y-4">
                    {subjects.map((subject, index) => (
                      <div
                        key={index}
                        className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-dark-bg-700 rounded-lg transition-all duration-300 animate-fade-in-up hover-3d glass`}
                        style={{ animationDelay: `${index * 0.1}s` }}
                      >
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                            Credits
                          </label>
                          <input
                            type="number"
                            value={subject.credits}
                            onChange={(e) => updateSubject(index, "credits", e.target.value)}
                            placeholder="3"
                            min="0"
                            step="0.5"
                            className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                          />
                        </div>
                        <div className="flex items-end space-x-2">
                          <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                              Grade
                            </label>
                            <select
                              value={subject.grade}
                              onChange={(e) => updateSubject(index, "grade", e.target.value)}
                              className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                            >
                              <option value="">Select</option>
                              {gradeOptions.map((opt) => (
                                <option key={opt.label} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          {subjects.length > 1 && (
                            <button
                              onClick={() => removeSubject(index)}
                              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center mt-6 w-full animate-fade-in-up stagger-3">
                    <div className="flex-1">
                      <button
                        onClick={addSubject}
                        className="btn-modern-success btn-glow btn-interactive-scale btn-hover-lift flex items-center justify-center px-6 py-3 mb-2 md:mb-0 font-semibold rounded-2xl"
                      >
                        <Plus className="w-5 h-5 mr-3 animate-bounce-in" />
                        Add Subject
                      </button>
                    </div>
                    <div className="flex flex-1 justify-end space-x-3">
                      <button
                        onClick={resetCalculator}
                        className="btn-modern-outline btn-hover-lift btn-interactive-scale flex items-center px-6 py-3 font-semibold"
                      >
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Reset
                      </button>
                      <button
                        onClick={calculateGPA}
                        className="btn-modern-primary btn-glow btn-magnetic btn-hover-glow flex items-center px-6 py-3 font-semibold"
                      >
                        <Calculator className="w-5 h-5 mr-3 animate-pulse-glow" />
                        Calculate GPA
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* GPA Results */}
              <div className="w-full max-w-2xl mt-6 animate-fade-in-up stagger-4">
                <div className="card-enhanced hover-3d">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white gradient-text-animated">
                    GPA Results
                  </h3>

                  {result && result.gpa ? (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-gradient-to-br from-primary-500 to-primary-700 dark:from-dark-primary-400 dark:to-dark-primary-500 rounded-lg text-white dark:text-dark-text-primary transition-all duration-300 animate-elastic hover-glow">
                        <div className="text-3xl font-bold animate-pulse-glow">{result.gpa}</div>
                        <div className="text-sm opacity-90">Your GPA</div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-dark-text-secondary">Total Credits:</span>
                          <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                            {result.totalCredits}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-dark-text-secondary">Subjects:</span>
                          <span className="font-medium text-gray-900 dark:text-dark-text-primary">{result.subjects}</span>
                        </div>
                      </div>

                      <button
                        onClick={downloadResult}
                        className="w-full btn-gradient flex items-center justify-center hover-ripple interactive-scale hover-glow rounded-xl"
                      >
                        <Download className="w-4 h-4 mr-2 animate-bounce-in" />
                        Download Result
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 dark:text-dark-text-secondary">
                      <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-dark-bg-600" />
                      <p>
                        Enter credits and grades for each subject, then click
                        "Calculate GPA"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* How to use box justified below */}
            <div className="card-enhanced mt-6 w-full lg:col-span-3 animate-fade-in-up stagger-5 hover-3d">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 gradient-text-animated">
                How to use:
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-white">
                <li className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>• Enter credits and grade for each subject</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.2s' }}>• Add more subjects as needed</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.3s' }}>• Click "Calculate GPA" to get your result</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.4s' }}>• Download your result for future reference</li>
              </ul>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center w-full">
              {/* CGPA Calculator Form */}
              <div className="w-full max-w-2xl animate-fade-in-up stagger-2">
                <div className="card-enhanced hover-3d">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white gradient-text-animated">
                      CGPA Calculator
                    </h2>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="animate-fade-in-up stagger-1">
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          Previous CGPA *
                        </label>
                        <input
                          type="number"
                          value={cgpaData.previousCgpa}
                          onChange={(e) =>
                            setCgpaData({
                              ...cgpaData,
                              previousCgpa: e.target.value,
                            })
                          }
                          placeholder="e.g., 8.5"
                          min="0"
                          max="10"
                          step="0.01"
                          className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400 hover-ripple focus:ring-2 focus:ring-primary-500 transition-all duration-300"
                        />
                      </div>
                      <div className="animate-fade-in-up stagger-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          Total Credits Completed *
                        </label>
                        <input
                          type="number"
                          value={cgpaData.totalCredits}
                          onChange={(e) =>
                            setCgpaData({
                              ...cgpaData,
                              totalCredits: e.target.value,
                            })
                          }
                          placeholder="e.g., 60"
                          min="0"
                          step="1"
                          className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400 hover-ripple focus:ring-2 focus:ring-primary-500 transition-all duration-300"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          Current Semester GPA *
                        </label>
                        <input
                          type="number"
                          value={cgpaData.currentGpa}
                          onChange={(e) =>
                            setCgpaData({
                              ...cgpaData,
                              currentGpa: e.target.value,
                            })
                          }
                          placeholder="e.g., 9.0"
                          min="0"
                          max="10"
                          step="0.01"
                          className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-white mb-1">
                          Current Semester Credits *
                        </label>
                        <input
                          type="number"
                          value={cgpaData.currentCredits}
                          onChange={(e) =>
                            setCgpaData({
                              ...cgpaData,
                              currentCredits: e.target.value,
                            })
                          }
                          placeholder="e.g., 20"
                          min="0"
                          step="1"
                          className="input-field dark:bg-dark-bg-700 dark:text-white dark:placeholder-gray-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-center mt-6 w-full animate-fade-in-up stagger-3">
                  <div className="flex justify-center w-full space-x-3">
                    <button
                      onClick={resetCalculator}
                      className="btn-modern-outline btn-hover-lift btn-interactive-scale flex items-center px-6 py-3 font-semibold"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Reset
                    </button>
                    <button
                      onClick={calculateCGPA}
                      className="btn-modern-warning btn-glow btn-magnetic btn-hover-glow flex items-center px-6 py-3 font-semibold"
                    >
                      <Calculator className="w-5 h-5 mr-3 animate-pulse-glow" />
                      Calculate CGPA
                    </button>
                  </div>
                </div>
              </div>

              {/* CGPA Results */}
              <div className="w-full max-w-2xl mt-6 animate-fade-in-up stagger-4">
                <div className="card-enhanced hover-3d">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 dark:text-white gradient-text-animated">
                    CGPA Results
                  </h3>

                  {result && result.cgpa ? (
                    <div className="space-y-4">
                      <div className="text-center p-4 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg text-white animate-elastic hover-glow">
                        <div className="text-3xl font-bold animate-pulse-glow">{result.cgpa}</div>
                        <div className="text-sm opacity-90">Your CGPA</div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Total Credits:</span>
                          <span className="font-medium">
                            {result.totalCredits}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={downloadResult}
                        className="w-full btn-gradient flex items-center justify-center hover-ripple interactive-scale hover-glow rounded-xl"
                      >
                        <Download className="w-4 h-4 mr-2 animate-bounce-in" />
                        Download Result
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Calculator className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p>
                        Enter all required values, then click "Calculate CGPA"
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* How to use box justified below */}
            <div className="card-enhanced mt-6 w-full lg:col-span-3 animate-fade-in-up stagger-5 hover-3d">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3 gradient-text-animated">
                How to use:
              </h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-white">
                <li className="animate-slide-in-left" style={{ animationDelay: '0.1s' }}>• Enter your previous CGPA</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.2s' }}>• Enter total credits completed so far</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.3s' }}>• Enter your current semester GPA</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.4s' }}>• Enter credits taken this semester</li>
                <li className="animate-slide-in-left" style={{ animationDelay: '0.5s' }}>• Click "Calculate CGPA" to get your result</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GPACalculator;
