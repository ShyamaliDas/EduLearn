import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function CourseDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [bankSecret, setBankSecret] = useState('');
  const [showEnrollForm, setShowEnrollForm] = useState(false);
  const [error, setError] = useState('');
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    fetchCourse();
    fetchMaterials();
    checkEnrollment();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const response = await axios.get(`http://localhost:5000/api/courses/${id}`);
      setCourse(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching course:', error);
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/api/enrollments/course/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setIsEnrolled(true);
    } catch (error) {
      if (error.response?.status === 404) {
        setIsEnrolled(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get(`http://localhost:5000/api/materials/course/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const handleEnrollClick = async () => {
    if (!user) {
      alert('Please login to enroll in courses');
      navigate('/login');
      return;
    }

    if (user.role !== 'learner') {
      alert('Only learners can enroll in courses');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const statusResponse = await axios.get('http://localhost:5000/api/bank/status', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!statusResponse.data.isSetup) {
        if (window.confirm('You need to setup your bank account first. Setup now?')) {
          navigate('/bank-setup');
        }
        return;
      }

      setShowEnrollForm(true);
    } catch (error) {
      setError('Failed to check bank status');
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    setEnrolling(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        'http://localhost:5000/api/enrollments',
        { courseId: id, bankSecret },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Successfully enrolled in course!');
      navigate('/my-courses');
    } catch (error) {
      setError(error.response?.data?.message || 'Enrollment failed');

      if (error.response?.data?.message === 'Please setup your bank account first') {
        if (window.confirm('You need to setup your bank account first. Setup now?')) {
          navigate('/bank-setup');
        }
      }
    } finally {
      setEnrolling(false);
    }
  };

  const getMaterialIcon = (type) => {
    const icons = {
      video: <i className='bi bi-camera-video-fill' style={{ color: '#6B7C5E' }}></i>,
      audio: <i className='bi bi-music-note-beamed' style={{ color: '#6B7C5E' }}></i>,
      slide: <i className='bi bi-bar-chart-fill' style={{ color: '#6B7C5E' }}></i>,
      image: <i className='bi bi-image-fill' style={{ color: '#6B7C5E' }}></i>,
      text: <i className='bi bi-file-text-fill' style={{ color: '#6B7C5E' }}></i>,
      quiz: <i className='bi bi-question-circle-fill' style={{ color: '#6B7C5E' }}></i>
    };
    return icons[type] || <i className='bi bi-book-fill' style={{ color: '#6B7C5E' }}></i>;
  };

  if (loading) return <div className="loading">Loading course details...</div>;

  if (!course) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-x-circle-fill"></i></div>
          <h2>Course Not Found</h2>
          <p>The course you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/courses')} className="btn btn-primary">
            Browse Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Course Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
        padding: '3rem 2rem',
        borderRadius: 'var(--radius-xl)',
        marginBottom: '2rem',
        color: 'white',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <span style={{
              padding: '0.4rem 0.9rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
            </span>
            <span style={{
              padding: '0.4rem 0.9rem',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius-full)',
              fontSize: '0.85rem',
              fontWeight: '600'
            }}>
              <i className="bi bi-alarm-fill" style={{ color: '#C9A961' }}></i> {course.duration}
            </span>
          </div>

          <h1 style={{ color: 'white', marginBottom: '1rem', fontSize: '2.25rem' }}>
            {course.title}
          </h1>

          <p style={{
            fontSize: '1.1rem',
            color: 'var(--color-secondary-light)',
            marginBottom: '1.5rem',
            lineHeight: '1.6'
          }}>
            {course.description.substring(0, 200)}...
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--color-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.5rem'
            }}>
              <i className="bi bi-person-circle" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>

            </div>
            <div>
              <div style={{ fontSize: '0.85rem', opacity: '0.9' }}>Instructor</div>
              <div style={{ fontWeight: '600', fontSize: '1.05rem' }}>
                {course.instructor?.profile?.name || course.instructor?.username}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem', alignItems: 'start' }}>
        {/* Main Content */}
        <div>
          {/* Full Description */}
          <div className="card" style={{ marginBottom: '2rem', padding: '2rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              About This Course
            </h2>
            <p style={{ color: 'var(--color-gray-700)', lineHeight: '1.8', margin: 0 }}>
              {course.description}
            </p>
          </div>

          {/* Course Materials Preview */}
          <div className="card" style={{ padding: '2rem' }}>
            <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
              Course Content
            </h2>

            {materials.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-gray-600)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '0.5rem', opacity: '0.5' }}><i className="bi bi-lock-fill" style={{ color: '#6B7C5E' }}></i></div>
                <p style={{ margin: 0 }}>Enroll to access all materials</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {materials.slice(0, 5).map((material, index) => (
                  <div
                    key={material.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '1rem',
                      background: 'var(--color-gray-50)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-gray-200)'
                    }}
                  >
                    <div style={{
                      fontSize: '1.5rem',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--color-white)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--color-gray-200)'
                    }}>
                      {getMaterialIcon(material.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>
                        {material.title}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                        {material.type.charAt(0).toUpperCase() + material.type.slice(1)}
                      </div>
                    </div>
                    {!isEnrolled && (
                      <div style={{ fontSize: '1.2rem', color: 'var(--color-gray-400)' }}><i className="bi bi-lock-fill"></i></div>
                    )}
                  </div>
                ))}

                {materials.length > 5 && (
                  <div style={{
                    padding: '1rem',
                    textAlign: 'center',
                    color: 'var(--color-gray-600)',
                    fontWeight: '500'
                  }}>
                    + {materials.length - 5} more materials
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Enrollment Card */}
        <div style={{ position: 'sticky', top: '2rem' }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            {/* Course Image */}
            <div style={{
              width: '100%',
              height: '200px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <img
                src={course.image ? `http://localhost:5000/uploads/courses/${course.image}` : 'https://via.placeholder.com/400x200?text=No+Image'
                  || 'https://via.placeholder.com/400x200?text=Course'}
                alt={course.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>

            {/* Price */}
            <div style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: 'var(--color-primary)',
              marginBottom: '1rem'
            }}>
              ৳{course.price}
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem',
              padding: '1rem',
              background: 'var(--color-gray-50)',
              borderRadius: 'var(--radius-md)'
            }}>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--color-primary)' }}>
                  {course.enrolledCount || 0}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>Students</div>
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--color-primary)' }}>
                  {materials.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>Materials</div>
              </div>
            </div>



            {/* Enroll Button */}
            {isEnrolled ? (
              <button
                onClick={() => navigate(`/learner/course/${course.id}`)}
                className="btn btn-success btn-lg"
                style={{ width: '100%' }}
              >
                <i className='bi bi-check-circle-fill' style={{ color: '#7D9B6E' }}></i>Go to Course
              </button>
            ) : user?.role === 'learner' ? (
              <button
                onClick={handleEnrollClick}
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
              >
                Enroll Now
              </button>
            ) : (
              <div style={{
                padding: '1rem',
                background: 'var(--color-gray-100)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-gray-600)',
                fontSize: '0.9rem'
              }}>
                {!user ? (
                  <>
                    <i className="bi bi-lock-fill"></i> Login as a learner to enroll
                  </>
                ) : (
                  <>
                    <i className="bi bi-person-badge-fill"></i> Instructors cannot enroll in courses
                  </>
                )}
              </div>
            )}


            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="btn btn-outline"
                style={{ width: '100%', marginTop: '0.75rem' }}
              >
                Login to Enroll
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Enrollment Modal */}
      {showEnrollForm && (
        <div className="modal-overlay" onClick={() => setShowEnrollForm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Enrollment</h2>
              <button className="modal-close" onClick={() => setShowEnrollForm(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div style={{
              padding: '1.5rem',
              background: 'var(--color-secondary-light)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontWeight: '600' }}>Course:</span>
                <span>{course.title}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: '600' }}>Price:</span>
                <span style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-primary)' }}>
                  ৳{course.price}
                </span>
              </div>
            </div>

            <form onSubmit={handleEnroll}>
              <div className="form-group">
                <label htmlFor="bankSecret">Bank Secret Code</label>
                <input
                  type="password"
                  id="bankSecret"
                  value={bankSecret}
                  onChange={(e) => setBankSecret(e.target.value)}
                  placeholder="Enter your bank secret code"
                  required
                />
                <small>Enter your bank account secret code to confirm payment</small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEnrollForm(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={enrolling}
                >
                  {enrolling ? 'Enrolling...' : 'Confirm & Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseDetails;




