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
        response = await axios.get('http://localhost:5000/api/enrollments/my-enrollments', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const enrolledCourses = response.data.map(enrollment => ({
          ...enrollment.course,
          enrollmentId: enrollment.id,
          progress: enrollment.progress,
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

  if (loading) {
    return <div className="loading">Loading courses...</div>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

      {user.role === 'instructor' && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '1rem'
        }}>
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
            <span style={{ fontSize: '1.1rem' }}><i className="bi bi-plus-circle-fill" style={{ color: '#7D9B6E' }}></i></span>
            Create New Course
          </Link>
        </div>
      )}

      {/* Header Section */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          marginBottom: '0.5rem',
          color: 'var(--color-primary)',
          fontSize: '2rem',
          fontWeight: '700'
        }}>
          My Courses
        </h1>
        <p style={{ margin: 0, color: 'var(--color-gray-600)', fontSize: '0.95rem' }}>
          {user.role === 'instructor'
            ? 'Manage and track your created courses'
            : 'Continue your learning journey'}
        </p>
      </div>

      {/* Courses Grid or Empty State */}
      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {user.role === 'instructor' ? <i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i> : <i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>}
          </div>
          <h2>
            {user.role === 'instructor' ? 'No Courses Yet' : 'No Enrolled Courses'}
          </h2>
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
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-image">
                <img
                  src={course.image ? `http://localhost:5000/uploads/courses/${course.image}` : 'https://via.placeholder.com/400x200?text=No+Image'
                    || 'https://via.placeholder.com/400x250/8B9D83/FFFFFF?text=Course'}
                  alt={course.title}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x250/8B9D83/FFFFFF?text=Course';
                  }}
                />
                {course.completed && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'var(--color-success)',
                    color: 'white',
                    padding: '0.4rem 0.8rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.85rem',
                    fontWeight: '600'
                  }}>
                    ✓ Completed
                  </div>
                )}
              </div>

              <div className="course-card-body">
                <h3>{course.title}</h3>
                <p className="course-description">
                  {course.description?.substring(0, 100)}...
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-level">{course.level}</span>
                  <span className="badge badge-duration"><i className="bi bi-alarm-fill" style={{ color: '#C9A961' }}></i> {course.duration}</span>
                </div>

                {/* Progress bar for learners */}
                {user.role === 'learner' && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '0.5rem',
                      fontSize: '0.85rem',
                      color: 'var(--color-gray-600)'
                    }}>
                      <span>Progress</span>
                      <span>{course.progress || 0}%</span>
                    </div>
                    <div style={{
                      height: '8px',
                      background: 'var(--color-gray-200)',
                      borderRadius: 'var(--radius-full)',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${course.progress || 0}%`,
                        background: 'var(--color-success)',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                  </div>
                )}

                {/* Stats for instructors */}
                {user.role === 'instructor' && (
                  <div style={{
                    display: 'flex',
                    gap: '1.5rem',
                    marginBottom: '1rem',
                    paddingTop: '0.75rem',
                    borderTop: '1px solid var(--color-gray-200)'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)', fontSize: '1.2rem' }}>
                        {course.enrolledCount || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-600)' }}>
                        Students
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '700', color: 'var(--color-primary)', fontSize: '1.2rem' }}>
                        {course.materialsCount || 0}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-600)' }}>
                        Materials
                      </div>
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => {
                      if (user.role === 'instructor') {
                        navigate(`/instructor/course/${course.id}`);
                      } else {
                        navigate(`/learner/course/${course.id}`);
                      }
                    }}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                  >
                    {user.role === 'instructor' ? 'Manage' : 'Continue'}
                  </button>

                  {user.role === 'instructor' && (
                    <button
                      onClick={() => handleDeleteCourse(course.id, course.title)}
                      className="btn btn-danger"
                      disabled={deleting === course.id}
                      style={{ minWidth: '50px' }}
                    >
                      {deleting === course.id ? <i className="bi bi-hourglass-split" style={{ color: '#6B7C5E' }}></i>
                        : <i className="bi bi-trash-fill" style={{ color: '#6B7C5E' }}></i>}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MyCourses;




