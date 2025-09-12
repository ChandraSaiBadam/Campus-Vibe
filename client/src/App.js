import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import { useDarkMode } from "./hooks/useDarkMode";

// Lazy load pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const GPACalculator = lazy(() => import("./pages/GPACalculator"));
const Marketplace = lazy(() => import("./pages/Marketplace"));
const Reviews = lazy(() => import("./pages/Reviews"));
const Forum = lazy(() => import("./pages/Forum"));
const QuestionDetail = lazy(() => import("./pages/QuestionDetail"));
const DeleteItem = lazy(() => import("./pages/DeleteItem"));
const FFCSTimetable = lazy(() => import("./pages/FFCSTimetable"));

function App() {
  const [darkMode, setDarkMode] = useDarkMode();

  // Loading component for lazy-loaded routes
  const LoadingSpinner = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg-900">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500"></div>
    </div>
  );

  return (
    <Router>
      <div className={`min-h-screen flex flex-col w-full${darkMode ? ' dark' : ''} bg-gray-50 dark:bg-dark-bg-900 transition-colors duration-200`}>
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="flex-1 w-full bg-gray-50 dark:bg-dark-bg-900 transition-colors duration-200">
          <Suspense fallback={<LoadingSpinner />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/gpa" element={<GPACalculator />} />
              <Route path="/marketplace" element={<Marketplace />} />
              <Route path="/delete-item" element={<DeleteItem />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/forum/question/:id" element={<QuestionDetail />} />
              <Route path="/timetable" element={<FFCSTimetable />} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10B981",
                secondary: "#fff",
              },
            },
            error: {
              duration: 5000,
              iconTheme: {
                primary: "#EF4444",
                secondary: "#fff",
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
