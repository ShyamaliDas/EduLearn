import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [deleting, setDeleting] = useState(null);
 


  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    setUser(userData);
    fetchMyCourses(userData.role);

    // Poll for status updates every 3 seconds
    const interval = setInterval(() => fetchMyCourses(userData.role), 2000);
    return () => clearInterval(interval);
  }, [navigate]);

  const fetchMyCourses = async (role) => {
    try {
      const token = localStorage.getItem('token');
      let response;

      if (role === 'instructor') {
        response = await axios.get('http://localhost:5000/api/courses/instructor/my-courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCourses(response.data);
      } else {
        // Learner - get enrollments
        response = await axios.get('http://localhost:5000/api/enrollments/my-enrollments', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Filter out rejected enrollments
        const validEnrollments = response.data.filter(
          enrollment => enrollment.status !== 'rejected'
        );

        const enrolledCourses = response.data.map(enrollment => ({
          ...enrollment.course,
          enrollmentId: enrollment.id,
          paymentValidated: enrollment.paymentValidated,
          progress: enrollment.progress || 0,
          completed: enrollment.completed
        }));

        setCourses(enrolledCourses);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId, courseTitle) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${courseTitle}"?\n\nThis action cannot be undone. All course materials and student enrollments will be removed.`
    );

    if (!confirmed) return;

    setDeleting(courseId);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setCourses(courses.filter(course => course.id !== courseId));
      alert('Course deleted successfully!');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert(error.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeleting(null);
    }
  };

  const getStatusBadge = (status, paymentValidated) => {
    // For learner enrollments - check payment validation
    if (paymentValidated === false) {
      return (
        <span className="status-badge status-pending">
          <i className="bi bi-clock-history"></i> Payment Pending
        </span>
      );
    }

    // For instructor courses - check course status
    if (!status || status === 'active') return null;

    const badges = {
      pending: (
        <span className="status-badge status-pending">
          <i className="bi bi-clock-history"></i> Pending Validation
        </span>
      ),
      rejected: (
        <span className="status-badge status-rejected">
          <i className="bi bi-x-circle"></i> Rejected
        </span>
      )
    };

    return badges[status] || null;
  };

  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Create Course Button - Only for Instructors */}
      {user.role === 'instructor' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <Link
            to="/instructor/create-course"
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              whiteSpace: 'nowrap',
              padding: '0.75rem 1.5rem',
              fontSize: '0.95rem'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>
              <i className="bi bi-plus-circle-fill"></i>
            </span>
            Create New Course
          </Link>
        </div>
      )}

      {/* Page Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">My Courses</h1>
        <p className="page-subtitle">
          {user.role === 'instructor'
            ? 'Manage and track your created courses'
            : 'Continue your learning journey'}
        </p>
      </div>

      {/* Empty State */}
      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {user.role === 'instructor' ? (
              <i className="bi bi-book-fill"></i>
            ) : (
              <i className="bi bi-mortarboard-fill"></i>
            )}
          </div>
          <h2>{user.role === 'instructor' ? 'No Courses Yet' : 'No Enrolled Courses'}</h2>
          <p>
            {user.role === 'instructor'
              ? "You haven't created any courses yet. Start sharing your knowledge!"
              : "You haven't enrolled in any courses yet. Browse our catalog to get started!"}
          </p>
          <Link
            to={user.role === 'instructor' ? '/instructor/create-course' : '/courses'}
            className="btn btn-primary btn-lg"
          >
            {user.role === 'instructor' ? 'Create Your First Course' : 'Browse Courses'}
          </Link>
        </div>
      ) : (
        <div className="courses-grid">
          {courses.map(course => {
            const isPending = user.role === 'instructor'
              ? course.status === 'pending'
              : course.paymentValidated === false;

            return (
              <div
                key={course.id}
                className={`course-card ${isPending ? 'course-card-pending' : ''}`}
              >
                {/* Course Image */}
                <div className="course-image">
                  <img
                    src={course.image
                      ? `http://localhost:5000/uploads/courses/${course.image}`
                      : 'https://via.placeholder.com/400x200?text=No+Image'
                    }
                    alt={course.title}
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/400x250/8B9D83/FFFFFF?text=Course';
                    }}
                  />

                  {/* Completed Badge - Only for learners */}
                  {course.completed && (
                    <div className="course-completed-badge">
                      <i className="bi bi-check-circle"></i> Completed
                    </div>
                  )}
                </div>

                <div className="course-card-body">
                  {/* Status badge */}
                  {user.role === 'instructor' && course.status && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      {getStatusBadge(course.status)}
                    </div>
                  )}

                  {user.role === 'learner' && course.paymentValidated === false && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      {getStatusBadge(null, false)}
                    </div>
                  )}

                  <h3>{course.title}</h3>
                  <p className="course-description">
                    {course.description?.substring(0, 100)}...
                  </p>

                  <div className="course-tags">
                    <span className="badge badge-level">{course.level}</span>
                    <span className="badge badge-duration">
                      <i className="bi bi-alarm-fill"></i> {course.duration}
                    </span>
                  </div>

                  {/* Pending notice for instructors */}
                  {user.role === 'instructor' && course.status === 'pending' && (
                    <div className="pending-notice">
                      <span className="pending-notice-icon">
                        <i className="bi bi-hourglass-split"></i>
                      </span>
                      <div className="pending-notice-text">
                        Waiting for bank validation. You will receive 1,500 TK once approved.
                      </div>
                    </div>
                  )}

                  {/* Rejected notice for instructors */}
                  {user.role === 'instructor' && course.status === 'rejected' && (
                    <div className="error-notice">
                      <span className="error-notice-icon">
                        <i className="bi bi-exclamation-triangle"></i>
                      </span>
                      <div className="error-notice-text">
                        Course creation failed. Please try again.
                      </div>
                    </div>
                  )}

                  {/* Pending notice for learners */}
                  {user.role === 'learner' && course.paymentValidated === false && (
                    <div className="pending-notice">
                      <span className="pending-notice-icon">
                        <i className="bi bi-hourglass-split"></i>
                      </span>
                      <div className="pending-notice-text">
                        Enrollment pending bank validation. Please wait for approval...
                      </div>
                    </div>
                  )}

                  {/* Progress bar for learners with validated enrollment */}
                  {user.role === 'learner' && course.paymentValidated === true && (
                    <div className="course-progress">
                      <div className="course-progress-header">
                        <span>Progress</span>
                        <span>{course.progress || 0}%</span>
                      </div>
                      <div className="course-progress-bar">
                        <div
                          className="course-progress-fill"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  

                  {/* Action buttons */}
                  <div className="course-actions">
                    {/* For instructors - only show buttons if active */}
                    {user.role === 'instructor' && course.status === 'active' && (
                      <>
                        <button
                          onClick={() => navigate(`/instructor/course/${course.id}`)}
                          className="btn btn-primary"
                        >
                          Manage
                        </button>
                        <button
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          className="btn btn-danger btn-icon"
                          disabled={deleting === course.id}
                        >
                          {deleting === course.id ? (
                            <i className="bi bi-hourglass-split"></i>
                          ) : (
                            <i className="bi bi-trash-fill"></i>
                          )}
                        </button>
                      </>
                    )}

                    {/* For learners - only show if payment validated */}
                    {user.role === 'learner' && course.paymentValidated === true && (
                      <button
                        onClick={() => navigate(`/learner/course/${course.id}`)}
                        className="btn btn-primary btn-block"
                      >
                        Continue
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default MyCourses;
