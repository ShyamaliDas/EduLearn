import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AllCourses from './pages/AllCourses';
import CourseDetails from './pages/CourseDetails';
import MyCourses from './pages/MyCourses';
import CourseLearning from './pages/CourseLearning';
import BankSetup from './pages/BankSetup';
import CreateCourse from './pages/CreateCourse';
import InstructorCourseView from './pages/InstructorCourseView';
import LearnerCourseView from './pages/LearnerCourseView';
import Transactions from './pages/Transactions';
import Profile from './pages/Profile';
import './App.css';
import 'bootstrap-icons/font/bootstrap-icons.css';


function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/courses" element={<AllCourses />} />
          <Route path="/course/:id" element={<CourseDetails />} />
          <Route path="/my-courses" element={<MyCourses />} />
          
          <Route path="/learn/:enrollmentId" element={<CourseLearning />} />
          <Route path="/bank-setup" element={<BankSetup />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/instructor/create-course" element={<CreateCourse />} />
          <Route path="/instructor/course/:id" element={<InstructorCourseView />} />
          <Route path="/instructor/transactions" element={<Transactions />} />
          <Route path="*" element={<Navigate to="/" />} />
          // Learner routes
          <Route path="/learner/course/:id" element={<LearnerCourseView />} />
          <Route path="/profile" element={<Profile />} />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
