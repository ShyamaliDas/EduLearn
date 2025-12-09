import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function AllCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [enrollments, setEnrollments] = useState([]);
  const user = JSON.parse(localStorage.getItem('user'));
  const [enrollmentStatus, setEnrollmentStatus] = useState(false);


  useEffect(() => {
    fetchCourses();
    if (user?.role === 'learner') {
      fetchMyEnrollments();
    }
  }, []);

  const fetchCourses = async () => {
    try {
      console.log('Fetching courses...');
      const response = await axios.get('http://localhost:5000/api/courses');
      console.log('Courses received:', response.data);
      setCourses(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const isEnrolled = (courseId) => {
    return enrollments.some(e => e.courseId === courseId);
  };

  const fetchMyEnrollments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/enrollments/my-enrollments',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  const handleCourseClick = (course) => {
    if (user?.role === 'learner') {
      // Find the specific enrollment for this course
      const enrollment = enrollments.find(e => e.courseId === course.id);

      // Only redirect to learner view if enrolled AND validated
      if (enrollment && enrollment.paymentValidated === true) {
        navigate(`/learner/course/${course.id}`);
      } else {
        // If not enrolled OR pending/rejected, go to course details
        navigate(`/course/${course.id}`);
      }
    } else {
      navigate(`/course/${course.id}`);
    }
  };


  const filteredCourses = filter === 'all'
    ? courses
    : courses.filter(course => course.level === filter);

  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }

  return (
    <div className="container">
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        paddingTop: '2rem'
      }}>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          Browse All Courses
        </h1>
        <p style={{ color: 'var(--color-gray-600)', fontSize: '1.1rem' }}>
          Discover and enroll in courses to enhance your skills
        </p>
      </div>

      {/* Filter Section */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'btn btn-primary' : 'btn btn-outline'}
        >
          All Courses
        </button>
        <button
          onClick={() => setFilter('beginner')}
          className={filter === 'beginner' ? 'btn btn-primary' : 'btn btn-outline'}
        >
          Beginner
        </button>
        <button
          onClick={() => setFilter('intermediate')}
          className={filter === 'intermediate' ? 'btn btn-primary' : 'btn btn-outline'}
        >
          Intermediate
        </button>
        <button
          onClick={() => setFilter('advanced')}
          className={filter === 'advanced' ? 'btn btn-primary' : 'btn btn-outline'}
        >
          Advanced
        </button>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-book" style={{ color: '#6B7C5E' }}></i></div>
          <h2>No Courses Found</h2>
          <p>Check back later for new courses!</p>
        </div>
      ) : (
        <div className="courses-grid">
          {filteredCourses.map(course => (
            <div
              key={course.id}
              className="course-card"
              onClick={() => handleCourseClick(course)}
            >
              <div className="course-image">
                <img
                  src={course.image ? `http://localhost:5000/uploads/courses/${course.image}` : 'https://via.placeholder.com/400x200?text=No+Image'
                    || 'https://via.placeholder.com/400x200?text=Course+Image'}
                  alt={course.title}
                />


                {/* Only show "Enrolled" badge if payment is VALIDATED */}
                {user?.role === 'learner' && enrollmentStatus[course.id]?.isEnrolled &&
                  enrollmentStatus[course.id]?.paymentValidated === true && (
                    <div className="enrolled-badge">
                      <i className="bi bi-check-circle-fill"></i> Enrolled
                    </div>
                  )}

              </div>

              <div className="course-card-body">
                <h3>{course.title}</h3>

                <p className="course-description">
                  {course.description.substring(0, 120)}...
                </p>

                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  marginBottom: '1rem'
                }}>
                  <span className="badge badge-level">
                    {course.level}
                  </span>
                  <span className="badge badge-duration">
                    ⏱ {course.duration}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--color-gray-200)'
                }}>
                  <span className="badge-price" style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: 'var(--color-primary)'
                  }}>
                    ৳{course.price}
                  </span>

                  <button className="btn btn-sm btn-primary">
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AllCourses;

