import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QuizView from '../components/QuizView';
import '../App.css';

function LearnerCourseView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const certificateRef = useRef(null);

  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [enrollmentId, setEnrollmentId] = useState(null);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [showCertificate, setShowCertificate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingCert, setDownloadingCert] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [accessExpired, setAccessExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [deadline, setDeadline] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user'));

    if (!token || !user || user.role !== 'learner') {
      navigate('/login');
      return;
    }

    if (!id || isNaN(id)) {
      console.error('Invalid course ID:', id);
      setError('Invalid course ID');
      setLoading(false);
      return;
    }

    fetchEnrollment();
    fetchMaterials();
    fetchCourse();
  }, [id, navigate]);

  const fetchCourse = async () => {
    if (!id) {
      setError('No course ID provided');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/courses/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourse(response.data);
    } catch (error) {
      console.error('Error fetching course:', error);
      setError('Failed to load course');
    }
  };

  const fetchMaterials = async () => {
    if (!id) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/materials/course/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMaterials(response.data);
    } catch (error) {
      console.error('Error fetching materials:', error);
    }
  };

  const fetchEnrollment = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/enrollments/course/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEnrollment(response.data);
      setEnrollmentId(response.data.id);

      // Check if enrollment is still valid
      const now = new Date();
      const deadline = new Date(response.data.deadline);
      const expired = now > deadline;
      setIsExpired(expired);


      await checkCourseAccess();

      setLoading(false);
    } catch (error) {
      console.error('Error fetching enrollment:', error);

      // If enrollment pending validation (403)
      if (error.response?.status === 403 && error.response?.data?.pending) {
        console.log('Enrollment pending - redirecting to course details');
        setTimeout(() => navigate(`/courses/${id}`), 100);
        return;
      }

      // If enrollment not found (404) - already deleted/rejected
      if (error.response?.status === 404) {
        console.log('Enrollment not found - redirecting to course details page');
        setTimeout(() => navigate(`/courses/${id}`), 100);
        return;
      }


      setError('Failed to load course. Please try again.');
      setLoading(false);
    }
  };

  const checkCourseAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/enrollments/check-access/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.expired) {
        setAccessExpired(true);
        setDeadline(new Date(response.data.deadline));
        alert('Your access to this course has expired. Please re-enroll to continue learning.');
      } else {
        setAccessExpired(false);
        setDaysRemaining(response.data.daysRemaining);
        setDeadline(new Date(response.data.deadline));
      }
    } catch (error) {
      console.error('Error checking course access:', error);
    }
  };

  const areAllQuizzesCompleted = () => {
    const quizMaterials = materials.filter(m => m.type === 'quiz');

    console.log('Checking quiz completion:', {
      totalQuizzes: quizMaterials.length,
      quizScores: enrollment?.quizScores
    });

    if (quizMaterials.length === 0) {
      return true;
    }

    const allCompleted = quizMaterials.every(quiz => {
      const score = enrollment?.quizScores?.[quiz.id];
      const isComplete = score && score.percentage === 100;

      console.log(`Quiz "${quiz.title}": ${isComplete ? '✓' : '✗'}`, score);

      return isComplete;
    });

    console.log('All quizzes completed:', allCompleted);
    return allCompleted;
  };

  const handleCompleteCourse = async () => {
    if (!areAllQuizzesCompleted()) {
      alert('You must complete all quizzes with 100% score before completing the course!');
      return;
    }

    if (!window.confirm('Mark this course as complete?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');

      console.log('Completing course with enrollmentId:', enrollmentId);

      const response = await axios.put(
        `http://localhost:5000/api/enrollments/${enrollmentId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      console.log('Course completion response:', response.data);

      alert('Congratulations! Course completed successfully!');

      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchEnrollment();
      await new Promise(resolve => setTimeout(resolve, 300));
      setShowCertificate(true);
    } catch (error) {
      console.error('Error completing course:', error);
      console.error('Error response:', error.response?.data);
      alert(error.response?.data?.message || 'Failed to complete course.');
    }
  };

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;

    setDownloadingCert(true);
    try {
      const canvas = await html2canvas(certificateRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${course.title}_Certificate.pdf`);
    } catch (error) {
      console.error('Error downloading certificate:', error);
      alert('Failed to download certificate. Please try again.');
    } finally {
      setDownloadingCert(false);
    }
  };

  const getMaterialIcon = (type) => {
    const icons = {
      video: <i className="bi bi-camera-video-fill" style={{ color: '#6B7C5E' }}></i>,
      audio: <i className="bi bi-music-note-beamed" style={{ color: '#6B7C5E' }}></i>,
      slide: <i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i>,
      image: <i className="bi bi-image-fill" style={{ color: '#6B7C5E' }}></i>,
      text: <i className="bi bi-file-text-fill" style={{ color: '#6B7C5E' }}></i>,
      quiz: <i className="bi bi-question-circle-fill" style={{ color: '#6B7C5E' }}></i>
    };
    return icons[type] || <i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i>;
  };

  const openQuiz = (quizMaterial) => {
    if (accessExpired) {
      alert('Your access has expired. Please re-enroll to take quizzes.');
      return;
    }
    setSelectedQuiz(quizMaterial);
    setShowQuizModal(true);
  };

  const openMaterial = (material) => {
    if (accessExpired) {
      alert('Your access has expired. Please re-enroll to view materials.');
      return;
    }
    setSelectedMaterial(material);
    setShowMaterialModal(true);
  };

  const renderMaterial = () => {
    if (!selectedMaterial) return null;

    switch (selectedMaterial.type) {
      case 'video':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{selectedMaterial.title}</h3>
            <video
              controls
              style={{ width: '100%', maxHeight: '500px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}
            >
              <source src={`http://localhost:5000${selectedMaterial.content.replace(/^\/+/, '/')}`}
                type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        );

      case 'audio':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{selectedMaterial.title}</h3>
            <audio controls style={{ width: '100%' }}>
              <source src={`http://localhost:5000/${selectedMaterial.content.replace(/^\/+/, '/')}`} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );

      case 'image':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{selectedMaterial.title}</h3>
            <img
              src={`http://localhost:5000${selectedMaterial.content.replace(/^\/+/, '/')}`}

              alt={selectedMaterial.title}
              style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}
            />
          </div>
        );

      case 'slide':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{selectedMaterial.title}</h3>
            <iframe
              src={`http://localhost:5000${selectedMaterial.content.replace(/^\/+/, '/')}`}

              title={selectedMaterial.title}
              style={{ width: '100%', minHeight: '600px', border: 'none', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}
            />
          </div>
        );

      case 'text':
        return (
          <div style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>{selectedMaterial.title}</h3>
            <div style={{ color: 'var(--color-gray-800)', lineHeight: '1.8', whiteSpace: 'pre-wrap', fontSize: '1rem' }}>
              {selectedMaterial.content}
            </div>
          </div>
        );

      default:
        return <p>Unsupported material type</p>;
    }
  };

  if (loading) {
    return <div className="loading">Loading course...</div>;
  }

  if (error || !enrollment || !course) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon" style={{ fontSize: '4rem', color: '#dc3545' }}>
            <i className="bi bi-exclamation-triangle-fill"></i>
          </div>
          <h2>Unable to load course</h2>
          <p>{error || 'Course not found'}</p>
          <button
            onClick={() => navigate('/my-courses')}
            className="btn btn-primary"
          >
            Back to My Courses
          </button>
        </div>
      </div>
    );
  }

  const progress = enrollment?.progress || 0;
  const canComplete = areAllQuizzesCompleted();

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>{course.title}</h1>
          <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>
            By {course.instructor?.profile?.name || course.instructor?.username}
          </p>
        </div>
        <div style={{ textAlign: 'right', minWidth: '220px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem', color: 'var(--color-gray-600)' }}>
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: '8px', background: 'var(--color-gray-200)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-success)', transition: 'width 0.3s ease' }}></div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
        {/* Sidebar */}
        <div className="card" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Content</h3>

          {accessExpired && (
            <div className="deadline-warning-sidebar">
              <div className="deadline-icon"><i className="bi bi-lock-fill" style={{ color: '#6B7C5E' }}></i></div>
              <div className="deadline-text">Access Expired</div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {materials.length === 0 ? (
              <p style={{ color: 'var(--color-gray-600)' }}>No materials available yet.</p>
            ) : (
              materials.map((material, index) => {
                const isQuiz = material.type === 'quiz';
                const quizScore = enrollment?.quizScores?.[material.id];

                return (
                  <div
                    key={material.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-gray-50)',
                      opacity: accessExpired ? 0.5 : 1
                    }}
                  >
                    <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-gray-200)' }}>
                      {getMaterialIcon(material.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: 'var(--color-gray-900)', marginBottom: '0.15rem' }}>
                        {index + 1}. {material.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                        {material.type.toUpperCase()} {isQuiz && quizScore && `• Score: ${quizScore.percentage}%`}
                      </div>
                    </div>
                    {isQuiz ? (
                      <button
                        type="button"
                        onClick={() => openQuiz(material)}
                        className="btn btn-outline btn-sm"
                        disabled={accessExpired}
                      >
                        Take Quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openMaterial(material)}
                        className="btn btn-primary btn-sm"
                        disabled={accessExpired}
                      >
                        Open
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Course Overview */}
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Overview</h2>
            <p style={{ color: 'var(--color-gray-700)' }}>{course.description}</p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
              <span className="badge badge-level">Level: {course.level}</span>
              <span className="badge badge-duration">Duration: {course.duration}</span>
            </div>
          </div>

          {/* Deadline Card */}
          {enrollment && !enrollment.completed && deadline && (
            <div className={`deadline-card ${accessExpired ? 'expired' : daysRemaining && daysRemaining <= 7 ? 'warning' : 'active'}`}>
              <div className="deadline-card-icon">
                {accessExpired ? (
                  <i className="bi bi-lock-fill"></i>
                ) : daysRemaining && daysRemaining <= 7 ? (
                  <i className="bi bi-exclamation-triangle-fill" style={{ color: '#C9A961' }}></i>
                ) : (
                  <i className="bi bi-check-circle-fill" style={{ color: '#7D9B6E' }}></i>
                )}
              </div>
              <div className="deadline-card-content">
                <h3 className="deadline-card-title">
                  {accessExpired ? 'Access Expired' : daysRemaining && daysRemaining <= 7 ? 'Access Expiring Soon!' : 'Course Access Active'}
                </h3>
                <p className="deadline-card-text">
                  {accessExpired
                    ? `Your access expired on ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                    : `${daysRemaining} days remaining until ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
                  }
                </p>
                {accessExpired && (
                  <button
                    onClick={() => navigate(`/courses/${id}`)}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: '0.75rem' }}
                  >
                    Re-Enroll Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Access Expired Block OR Certificate */}
          {accessExpired ? (
            <div className="card access-expired-card">
              <div className="access-expired-icon"><i className="bi bi-lock-fill" style={{ color: '#6B7C5E' }}></i></div>
              <h2 className="access-expired-title">Course Access Expired</h2>
              <p className="access-expired-text">
                Your access to this course has ended. Re-enroll to continue your learning journey!
              </p>
              <button
                onClick={() => navigate(`/courses/${id}`)}
                className="btn btn-primary btn-lg"
              >
                Re-Enroll in Course
              </button>
            </div>
          ) : enrollment?.completed ? (
            <div ref={certificateRef} className="card certificate-card">
              <div className="certificate-corner certificate-corner-tl"></div>
              <div className="certificate-corner certificate-corner-tr"></div>
              <div className="certificate-corner certificate-corner-bl"></div>
              <div className="certificate-corner certificate-corner-br"></div>

              <div className="certificate-icon"><i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
              <h2 className="certificate-title">CERTIFICATE OF COMPLETION</h2>
              <p className="certificate-label">This is to certify that</p>
              <h3 className="certificate-name">{enrollment.learner?.profile?.name || enrollment.learner?.username}</h3>
              <p className="certificate-label">has successfully completed</p>
              <h3 className="certificate-course-name">{course.title}</h3>

              <p className="certificate-instructor">Instructed by {course.instructor?.profile?.name || course.instructor?.username}</p>

              <div className="certificate-footer">
                <div>
                  <div className="certificate-footer-label">Date</div>
                  <div className="certificate-footer-value">
                    {new Date(enrollment.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div className="certificate-footer-label">Level</div>
                  <div className="certificate-footer-value">{course.level}</div>
                </div>
                <div>
                  <div className="certificate-footer-label">Duration</div>
                  <div className="certificate-footer-value">{course.duration}</div>
                </div>
              </div>

              <div className="certificate-brand">EduLearn - Bridge to a Thriving Career</div>
            </div>
          ) : (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Complete Course</h3>
              <p style={{ marginBottom: '1.5rem', color: 'var(--color-gray-600)' }}>
                {canComplete
                  ? 'Congratulations! You have completed all required quizzes. Click below to complete the course and get your certificate.'
                  : 'Complete all quizzes with 100% score to finish this course.'}
              </p>

            </div>
          )}

          {enrollment?.completed && (
            <button
              onClick={downloadCertificate}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={downloadingCert}
            >
              {downloadingCert ? (
                <><i className="bi bi-hourglass-split" style={{ color: '#6B7C5E' }}></i> Generating PDF...</>
              ) : (
                <><i className="bi bi-download" style={{ color: '#e1ebda' }}></i> Download Certificate</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && selectedQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedQuiz.title}</h2>
              <button className="modal-close" onClick={() => setShowQuizModal(false)}>
                <i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>
            <QuizView
              material={selectedQuiz}
              enrollmentId={enrollmentId}
              onCompleted={fetchEnrollment}
              onClose={() => {
                setShowQuizModal(false);
                setSelectedQuiz(null);
                fetchEnrollment();
              }}
            />
          </div>
        </div>
      )}

      {/* Material Viewer Modal */}
      {showMaterialModal && selectedMaterial && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMaterial.title}</h2>
              <button className="modal-close" onClick={() => setShowMaterialModal(false)}>
                <i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>
            {renderMaterial()}
          </div>
        </div>
      )}
    </div>
  );
}

export default LearnerCourseView;
