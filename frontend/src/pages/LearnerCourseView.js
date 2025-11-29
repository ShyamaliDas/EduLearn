import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import QuizView from '../components/QuizView';
import '../App.css';

function LearnerCourseView() {
  const allParams = useParams();
  const { id } = allParams;
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

  const [accessExpired, setAccessExpired] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [deadline, setDeadline] = useState(null);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  useEffect(() => {
    if (!id) {
      setError('Invalid course ID');
      setLoading(false);
      return;
    }
    fetchCourse();
    fetchMaterials();
    fetchEnrollment();
    checkCourseAccess();
  }, [id]);

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
    if (!id) {
      setLoading(false);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/enrollments/course/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log(' Fresh Enrollment data:', response.data);
      console.log(' Quiz Scores:', response.data.quizScores);
      console.log(' Completed:', response.data.completed);
      console.log(' Progress:', response.data.progress);
      setEnrollment(response.data);
      setEnrollmentId(response.data.id);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching enrollment:', error);
      setError(error.response?.data?.message || 'Failed to load course enrollment');
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
        alert(' Your access to this course has expired. Please re-enroll to continue learning.');
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
    console.log('🔍 Checking quiz completion:', {
      totalQuizzes: quizMaterials.length,
      quizScores: enrollment?.quizScores
    });

    if (quizMaterials.length === 0) return true;

    const allCompleted = quizMaterials.every(quiz => {
      const score = enrollment?.quizScores?.[quiz.id];
      const isComplete = score && score.percentage === 100;
      console.log(`Quiz ${quiz.title}: ${isComplete ? <i className="bi bi-check-circle-fill" style={{ color: '#7D9B6E' }}></i> : <i className="bi bi-x-circle-fill" style={{ color: '#B85C5C' }}></i>}`, score);
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
      
      console.log('🎓 Completing course with enrollmentId:', enrollmentId);
      
      const response = await axios.put(
        `http://localhost:5000/api/enrollments/${enrollmentId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log(' Course completion response:', response.data);
      
      alert(' Congratulations! Course completed successfully!');
      
      await new Promise(resolve => setTimeout(resolve, 800));
      await fetchEnrollment();
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setShowCertificate(true);
      
    } catch (error) {
      console.error(' Error completing course:', error);
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
    return icons[type] || 
<i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i>;
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
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <video controls style={{ width: '100%', maxHeight: '500px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
              <source src={`http://localhost:5000${selectedMaterial.content}`} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <audio controls style={{ width: '100%' }}>
              <source src={`http://localhost:5000${selectedMaterial.content}`} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      case 'image':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <img src={`http://localhost:5000${selectedMaterial.content}`} alt={selectedMaterial.title} style={{ width: '100%', maxHeight: '600px', objectFit: 'contain', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }} />
          </div>
        );
      case 'slide':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <iframe src={`http://localhost:5000${selectedMaterial.content}`} title={selectedMaterial.title} style={{ width: '100%', minHeight: '600px', border: 'none', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }} />
          </div>
        );
      case 'text':
        return (
          <div style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
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

  if (error) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-x-circle-fill" style={{ color: '#B85C5C' }}></i></div>
          <h2>Unable to load course</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i></div>
          <h2>Course Not Found</h2>
          <p>The course you're looking for doesn't exist.</p>
          <button onClick={() => navigate('/my-courses')} className="btn btn-primary">
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
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            {course.title}
          </h1>
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
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--color-success)', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
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
                  <div key={material.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--color-gray-50)', opacity: accessExpired ? 0.5 : 1 }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-full)', background: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--color-gray-200)' }}>
                      {getMaterialIcon(material.type)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: 'var(--color-gray-900)', marginBottom: '0.15rem' }}>
                        {index + 1}. {material.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                        {material.type.toUpperCase()}
                        {isQuiz && quizScore && ` • Score: ${quizScore.percentage}%`}
                      </div>
                    </div>
                    {isQuiz ? (
                      <button type="button" onClick={() => openQuiz(material)} className="btn btn-outline btn-sm" disabled={accessExpired}>
                        Take Quiz
                      </button>
                    ) : (
                      <button type="button" onClick={() => openMaterial(material)} className="btn btn-primary btn-sm" disabled={accessExpired}>
                        Open
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {!enrollment?.completed && !accessExpired && (
            <button onClick={handleCompleteCourse} className="btn btn-success" style={{ width: '100%', marginTop: '1.5rem' }} disabled={!canComplete}>
              {canComplete ? 'Mark Course as Complete ✓' : 'Complete All Quizzes (100% Required)'}
            </button>
          )}
        </div>

        {/* Main Content Area */}
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
            <div className={`deadline-card ${accessExpired ? 'expired' : daysRemaining <= 7 ? 'warning' : 'active'}`}>
              <div className="deadline-card-icon">
                {accessExpired ? '⏰' : daysRemaining <= 7 ? <i className="bi bi-exclamation-triangle-fill" style={{ color: '#C9A961' }}></i> : <i className="bi bi-check-circle-fill" style={{ color: '#7D9B6E' }}></i>
}
              </div>
              <div className="deadline-card-content">
                <h3 className="deadline-card-title">
                  {accessExpired ? 'Access Expired' : daysRemaining <= 7 ? 'Access Expiring Soon!' : 'Course Access Active'}
                </h3>
                <p className="deadline-card-text">
                  {accessExpired 
                    ? `Your access expired on ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}` 
                    : `${daysRemaining} days remaining until ${deadline.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
                </p>
                {accessExpired && (
                  <button onClick={() => navigate(`/course/${id}`)} className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
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
              <button onClick={() => navigate(`/course/${id}`)} className="btn btn-primary btn-lg">
                Re-Enroll in Course
              </button>
            </div>
          ) : (
            enrollment?.completed && (
              <>
                <div ref={certificateRef} className="card certificate-card">
                  <div className="certificate-corner certificate-corner-tl" />
                  <div className="certificate-corner certificate-corner-tr" />
                  <div className="certificate-corner certificate-corner-bl" />
                  <div className="certificate-corner certificate-corner-br" />

                  <div className="certificate-icon"><i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
                  <h2 className="certificate-title">CERTIFICATE OF COMPLETION</h2>
                  <p className="certificate-label">This is to certify that</p>
                  <h3 className="certificate-name">
                    {enrollment.learner?.profile?.name || enrollment.learner?.username}
                  </h3>
                  <p className="certificate-label">has successfully completed</p>
                  <h3 className="certificate-course-name">{course.title}</h3>
                  <p className="certificate-instructor">
                    Instructed by {course.instructor?.profile?.name || course.instructor?.username}
                  </p>
                  
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

                  <div className="certificate-brand">EduLearn - Learning Management System</div>
                </div>

                <button onClick={downloadCertificate} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '1rem' }} disabled={downloadingCert}>
                  {downloadingCert ? (
                    <><i className="bi bi-hourglass-split" style={{ color: '#6B7C5E' }}></i> Generating PDF...</>
                  ) : (
                    <><i className="bi bi-download" style={{ color: '#e1ebdaff' }}></i> Download Certificate</>
                  )}

                </button>
              </>
            )
          )}
        </div>
      </div>

      {/* Quiz Modal */}
      {showQuizModal && selectedQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedQuiz.title}</h2>
              <button className="modal-close" onClick={() => setShowQuizModal(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
</button>
            </div>
            <QuizView material={selectedQuiz} enrollmentId={enrollmentId} onCompleted={() => { fetchEnrollment(); }} onClose={() => { setShowQuizModal(false); setSelectedQuiz(null); fetchEnrollment(); }} />
          </div>
        </div>
      )}

      {/* Material Viewer Modal */}
      {showMaterialModal && selectedMaterial && (
        <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMaterial.title}</h2>
              <button className="modal-close" onClick={() => setShowMaterialModal(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
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



















// import React, { useState, useEffect, useRef } from 'react';
// import { useParams, useNavigate } from 'react-router-dom';
// import axios from 'axios';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// import QuizView from '../components/QuizView';
// import '../App.css';

// function LearnerCourseView() {
//   const allParams = useParams();
//   const { id } = allParams;
//   const navigate = useNavigate();
//   const certificateRef = useRef(null);

//   const [course, setCourse] = useState(null);
//   const [materials, setMaterials] = useState([]);
//   const [enrollment, setEnrollment] = useState(null);
//   const [enrollmentId, setEnrollmentId] = useState(null);
//   const [showQuizModal, setShowQuizModal] = useState(false);
//   const [selectedQuiz, setSelectedQuiz] = useState(null);
//   const [showCertificate, setShowCertificate] = useState(false);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [downloadingCert, setDownloadingCert] = useState(false);

//   const [accessExpired, setAccessExpired] = useState(false);
//   const [daysRemaining, setDaysRemaining] = useState(null);
//   const [deadline, setDeadline] = useState(null);

//   // For viewing non-quiz materials
//   const [showMaterialModal, setShowMaterialModal] = useState(false);
//   const [selectedMaterial, setSelectedMaterial] = useState(null);

//   useEffect(() => {
//     if (!id) {
//       setError('Invalid course ID');
//       setLoading(false);
//       return;
//     }
//     fetchCourse();
//     fetchMaterials();
//     fetchEnrollment();
//     checkCourseAccess();
//   }, [id]);

//   const fetchCourse = async () => {
//     if (!id) {
//       setError('No course ID provided');
//       setLoading(false);
//       return;
//     }
//     try {
//       const token = localStorage.getItem('token');
//       const response = await axios.get(
//         `http://localhost:5000/api/courses/${id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setCourse(response.data);
//     } catch (error) {
//       console.error('Error fetching course:', error);
//       setError('Failed to load course');
//     }
//   };

//   const fetchMaterials = async () => {
//     if (!id) return;
//     try {
//       const token = localStorage.getItem('token');
//       const response = await axios.get(
//         `http://localhost:5000/api/materials/course/${id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setMaterials(response.data);
//     } catch (error) {
//       console.error('Error fetching materials:', error);
//     }
//   };

//   const fetchEnrollment = async () => {
//     if (!id) {
//       setLoading(false);
//       return;
//     }
//     try {
//       const token = localStorage.getItem('token');
//       const response = await axios.get(
//         `http://localhost:5000/api/enrollments/course/${id}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//         console.log('📊 Fresh Enrollment data:', response.data);
//         console.log('📊 Quiz Scores:', response.data.quizScores);
//         console.log('📊 Completed:', response.data.completed);
//         console.log('📊 Progress:', response.data.progress);
//       setEnrollment(response.data);
//       setEnrollmentId(response.data.id);
//       setLoading(false);
//     } catch (error) {
//       console.error('Error fetching enrollment:', error);
//       setError(error.response?.data?.message || 'Failed to load course enrollment');
//       setLoading(false);
//     }
//   };



// const checkCourseAccess = async () => {
//   try {
//     const token = localStorage.getItem('token');
//     const response = await axios.get(
//       `http://localhost:5000/api/enrollments/check-access/${id}`,
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     if (response.data.expired) {
//       setAccessExpired(true);
//       setDeadline(new Date(response.data.deadline));
//       alert('⏰ Your access to this course has expired. Please re-enroll to continue learning.');
//     } else {
//       setAccessExpired(false);
//       setDaysRemaining(response.data.daysRemaining);
//       setDeadline(new Date(response.data.deadline));
//     }
//   } catch (error) {
//     console.error('Error checking course access:', error);
//   }
// };



//   const areAllQuizzesCompleted = () => {
//     const quizMaterials = materials.filter(m => m.type === 'quiz');
//     console.log('🔍 Checking quiz completion:', {
//       totalQuizzes: quizMaterials.length,
//       quizScores: enrollment?.quizScores
//     });

//     if (quizMaterials.length === 0) return true;

//     const allCompleted = quizMaterials.every(quiz => {
//       const score = enrollment?.quizScores?.[quiz.id];
//       const isComplete = score && score.percentage === 100;
//       console.log(`Quiz ${quiz.title}: ${isComplete ? '✅' : '❌'}`, score);
//       return isComplete;
//     });

//     console.log('All quizzes completed:', allCompleted);
//     return allCompleted;
//   };




//   const handleCompleteCourse = async () => {
//   if (!areAllQuizzesCompleted()) {
//     alert('You must complete all quizzes with 100% score before completing the course!');
//     return;
//   }

//   if (!window.confirm('Mark this course as complete?')) {
//     return;
//   }

//   try {
//     const token = localStorage.getItem('token');
    
//     console.log('🎓 Completing course with enrollmentId:', enrollmentId);
    
//     const response = await axios.put(
//       `http://localhost:5000/api/enrollments/${enrollmentId}/complete`,
//       {},
//       { headers: { Authorization: `Bearer ${token}` } }
//     );
    
//     console.log('✅ Course completion response:', response.data);
    
//     alert('🎉 Congratulations! Course completed successfully!');
    
//     // Wait a bit for database to fully update
//     await new Promise(resolve => setTimeout(resolve, 800));
    
//     // Force refresh enrollment data
//     await fetchEnrollment();
    
//     // Small delay to ensure state updates
//     await new Promise(resolve => setTimeout(resolve, 300));
    
//     // Show certificate
//     setShowCertificate(true);
    
//   } catch (error) {
//     console.error('❌ Error completing course:', error);
//     console.error('Error response:', error.response?.data);
//     alert(error.response?.data?.message || 'Failed to complete course.');
//   }
// };

//   const downloadCertificate = async () => {
//     if (!certificateRef.current) return;

//     setDownloadingCert(true);
//     try {
//       const canvas = await html2canvas(certificateRef.current, {
//         scale: 2,
//         backgroundColor: '#ffffff',
//         logging: false,
//         useCORS: true
//       });

//       const imgData = canvas.toDataURL('image/png');
//       const pdf = new jsPDF({
//         orientation: 'landscape',
//         unit: 'mm',
//         format: 'a4'
//       });

//       const pdfWidth = pdf.internal.pageSize.getWidth();
//       const pdfHeight = pdf.internal.pageSize.getHeight();

//       pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
//       pdf.save(`${course.title}_Certificate.pdf`);
//     } catch (error) {
//       console.error('Error downloading certificate:', error);
//       alert('Failed to download certificate. Please try again.');
//     } finally {
//       setDownloadingCert(false);
//     }
//   };

//   const getMaterialIcon = (type) => {
//     const icons = {
//       video: '🎥',
//       audio: '🎵',
//       slide: '📊',
//       image: '🖼️',
//       text: '📄',
//       quiz: '❓'
//     };
//     return icons[type] || '📚';
//   };

//   const openQuiz = (quizMaterial) => {
//     setSelectedQuiz(quizMaterial);
//     setShowQuizModal(true);
//   };

//   const openMaterial = (material) => {
//     setSelectedMaterial(material);
//     setShowMaterialModal(true);
//   };

//   const renderMaterial = () => {
//     if (!selectedMaterial) return null;

//     switch (selectedMaterial.type) {
//       case 'video':
//         return (
//           <div style={{ padding: '1rem' }}>
//             <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
//               {selectedMaterial.title}
//             </h3>
//             <video
//               controls
//               style={{
//                 width: '100%',
//                 maxHeight: '500px',
//                 borderRadius: 'var(--radius-lg)',
//                 boxShadow: 'var(--shadow-md)'
//               }}
//             >
//               <source src={`http://localhost:5000${selectedMaterial.content}`} type="video/mp4" />
//               Your browser does not support the video tag.
//             </video>
//           </div>
//         );
//       case 'audio':
//         return (
//           <div style={{ padding: '1rem' }}>
//             <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
//               {selectedMaterial.title}
//             </h3>
//             <audio controls style={{ width: '100%' }}>
//               <source src={`http://localhost:5000${selectedMaterial.content}`} type="audio/mpeg" />
//               Your browser does not support the audio element.
//             </audio>
//           </div>
//         );
//       case 'image':
//         return (
//           <div style={{ padding: '1rem' }}>
//             <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
//               {selectedMaterial.title}
//             </h3>
//             <img
//               src={`http://localhost:5000${selectedMaterial.content}`}
//               alt={selectedMaterial.title}
//               style={{
//                 width: '100%',
//                 maxHeight: '600px',
//                 objectFit: 'contain',
//                 borderRadius: 'var(--radius-lg)',
//                 boxShadow: 'var(--shadow-md)'
//               }}
//             />
//           </div>
//         );
//       case 'slide':
//         return (
//           <div style={{ padding: '1rem' }}>
//             <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
//               {selectedMaterial.title}
//             </h3>
//             <iframe
//               src={`http://localhost:5000${selectedMaterial.content}`}
//               title={selectedMaterial.title}
//               style={{
//                 width: '100%',
//                 minHeight: '600px',
//                 border: 'none',
//                 borderRadius: 'var(--radius-lg)',
//                 boxShadow: 'var(--shadow-md)'
//               }}
//             />
//           </div>
//         );
//       case 'text':
//         return (
//           <div style={{ padding: '2rem' }}>
//             <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
//               {selectedMaterial.title}
//             </h3>
//             <div style={{
//               color: 'var(--color-gray-800)',
//               lineHeight: '1.8',
//               whiteSpace: 'pre-wrap',
//               fontSize: '1rem'
//             }}>
//               {selectedMaterial.content}
//             </div>
//           </div>
//         );
//       default:
//         return <p>Unsupported material type</p>;
//     }
//   };

//   if (loading) {
//     return <div className="loading">Loading course...</div>;
//   }

//   if (error) {
//     return (
//       <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         <div className="empty-state">
//           <div className="empty-icon">❌</div>
//           <h2>Unable to load course</h2>
//           <p>{error}</p>
//         </div>
//       </div>
//     );
//   }

//   if (!course) {
//     return (
//       <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
//         <div className="empty-state">
//           <div className="empty-icon">📚</div>
//           <h2>Course Not Found</h2>
//           <p>The course you're looking for doesn't exist.</p>
//           <button onClick={() => navigate('/my-courses')} className="btn btn-primary">
//             Back to My Courses
//           </button>
//         </div>
//       </div>
//     );
//   }

//   const progress = enrollment?.progress || 0;
//   const canComplete = areAllQuizzesCompleted();

//   return (
//     <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
//       {/* Header */}
//       <div style={{
//         marginBottom: '2rem',
//         display: 'flex',
//         justifyContent: 'space-between',
//         alignItems: 'center',
//         flexWrap: 'wrap',
//         gap: '1rem'
//       }}>
//         <div>
//           <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
//             {course.title}
//           </h1>
//           <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>
//             By {course.instructor?.profile?.name || course.instructor?.username}
//           </p>
//         </div>
//         <div style={{ textAlign: 'right', minWidth: '220px' }}>
//           <div style={{
//             display: 'flex',
//             justifyContent: 'space-between',
//             marginBottom: '0.25rem',
//             fontSize: '0.9rem',
//             color: 'var(--color-gray-600)'
//           }}>
//             <span>Progress</span>
//             <span>{progress}%</span>
//           </div>
//           <div style={{
//             height: '8px',
//             background: 'var(--color-gray-200)',
//             borderRadius: 'var(--radius-full)',
//             overflow: 'hidden'
//           }}>
//             <div
//               style={{
//                 height: '100%',
//                 width: `${progress}%`,
//                 background: 'var(--color-success)',
//                 transition: 'width 0.3s ease'
//               }}
//             />
//           </div>
//         </div>
//       </div>

//       <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem' }}>
//         {/* Materials List */}
//         <div className="card" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
//           <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Content</h3>
//           <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
//             {materials.length === 0 ? (
//               <p style={{ color: 'var(--color-gray-600)' }}>No materials available yet.</p>
//             ) : (
//               materials.map((material, index) => {
//                 const isQuiz = material.type === 'quiz';
//                 const quizScore = enrollment?.quizScores?.[material.id];
//                 return (
//                   <div
//                     key={material.id}
//                     style={{
//                       display: 'flex',
//                       alignItems: 'center',
//                       gap: '0.75rem',
//                       padding: '0.75rem',
//                       borderRadius: 'var(--radius-md)',
//                       background: 'var(--color-gray-50)'
//                     }}
//                   >
//                     <div style={{
//                       width: '36px',
//                       height: '36px',
//                       borderRadius: 'var(--radius-full)',
//                       background: 'var(--color-white)',
//                       display: 'flex',
//                       alignItems: 'center',
//                       justifyContent: 'center',
//                       border: '1px solid var(--color-gray-200)'
//                     }}>
//                       {getMaterialIcon(material.type)}
//                     </div>
//                     <div style={{ flex: 1 }}>
//                       <div style={{ fontWeight: '500', color: 'var(--color-gray-900)', marginBottom: '0.15rem' }}>
//                         {index + 1}. {material.title}
//                       </div>
//                       <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
//                         {material.type.toUpperCase()}
//                         {isQuiz && quizScore && ` • Score: ${quizScore.percentage}%`}
//                       </div>
//                     </div>
//                     {isQuiz ? (
//                       <button
//                         type="button"
//                         onClick={() => openQuiz(material)}
//                         className="btn btn-outline btn-sm"
//                       >
//                         Take Quiz
//                       </button>
//                     ) : (
//                       <button
//                         type="button"
//                         onClick={() => openMaterial(material)}
//                         className="btn btn-primary btn-sm"
//                       >
//                         Open
//                       </button>
//                     )}
//                   </div>
//                 );
//               })
//             )}
//           </div>

//         </div>

//         {/* Summary / Certificate */}
//         <div>
//           <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
//             <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Overview</h2>
//             <p style={{ color: 'var(--color-gray-700)' }}>{course.description}</p>
//             <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
//               <span className="badge badge-level">
//                 Level: {course.level}
//               </span>
//               <span className="badge badge-duration">
//                 Duration: {course.duration}
//               </span>
//             </div>
//           </div>

//           {enrollment?.completed && (
//             <>
//               {/* Downloadable Certificate */}
//               <div 
//                 ref={certificateRef}
//                 className="card" 
//                 style={{ 
//                   padding: '3rem 2rem', 
//                   textAlign: 'center',
//                   background: 'linear-gradient(135deg, var(--color-secondary-light) 0%, var(--color-cream) 100%)',
//                   border: '8px double var(--color-primary)',
//                   position: 'relative'
//                 }}
//               >
//                 {/* Decorative corners */}
//                 <div style={{
//                   position: 'absolute',
//                   top: '20px',
//                   left: '20px',
//                   width: '50px',
//                   height: '50px',
//                   borderTop: '3px solid var(--color-primary)',
//                   borderLeft: '3px solid var(--color-primary)'
//                 }} />
//                 <div style={{
//                   position: 'absolute',
//                   top: '20px',
//                   right: '20px',
//                   width: '50px',
//                   height: '50px',
//                   borderTop: '3px solid var(--color-primary)',
//                   borderRight: '3px solid var(--color-primary)'
//                 }} />
//                 <div style={{
//                   position: 'absolute',
//                   bottom: '20px',
//                   left: '20px',
//                   width: '50px',
//                   height: '50px',
//                   borderBottom: '3px solid var(--color-primary)',
//                   borderLeft: '3px solid var(--color-primary)'
//                 }} />
//                 <div style={{
//                   position: 'absolute',
//                   bottom: '20px',
//                   right: '20px',
//                   width: '50px',
//                   height: '50px',
//                   borderBottom: '3px solid var(--color-primary)',
//                   borderRight: '3px solid var(--color-primary)'
//                 }} />

//                 <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎓</div>
                
//                 <h2 style={{ 
//                   color: 'var(--color-primary)', 
//                   marginBottom: '1.5rem',
//                   fontSize: '1.8rem',
//                   fontWeight: '700',
//                   letterSpacing: '2px'
//                 }}>
//                   CERTIFICATE OF COMPLETION
//                 </h2>
                
//                 <p style={{ marginBottom: '0.5rem', color: 'var(--color-gray-700)', fontSize: '1rem' }}>
//                   This is to certify that
//                 </p>
                
//                 <h3 style={{ 
//                   marginBottom: '1.5rem', 
//                   color: 'var(--color-primary)',
//                   fontSize: '2rem',
//                   fontWeight: '700',
//                   fontStyle: 'italic',
//                   textDecoration: 'underline',
//                   textDecorationColor: 'var(--color-sage)'
//                 }}>
//                   {enrollment.learner?.profile?.name || enrollment.learner?.username}
//                 </h3>
                
//                 <p style={{ marginBottom: '0.5rem', color: 'var(--color-gray-700)', fontSize: '1rem' }}>
//                   has successfully completed
//                 </p>
                
//                 <h3 style={{ 
//                   marginBottom: '1.5rem', 
//                   color: 'var(--color-primary)',
//                   fontSize: '1.5rem',
//                   fontWeight: '700'
//                 }}>
//                   {course.title}
//                 </h3>
                
//                 <p style={{ 
//                   marginBottom: '1.5rem', 
//                   color: 'var(--color-gray-600)',
//                   fontSize: '0.95rem'
//                 }}>
//                   Instructed by {course.instructor?.profile?.name || course.instructor?.username}
//                 </p>
                
//                 <div style={{
//                   marginTop: '2rem',
//                   paddingTop: '1.5rem',
//                   borderTop: '2px solid var(--color-primary)',
//                   display: 'flex',
//                   justifyContent: 'space-around',
//                   fontSize: '0.9rem',
//                   color: 'var(--color-gray-700)'
//                 }}>
//                   <div>
//                     <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Date</div>
//                     <div>{new Date(enrollment.completedAt).toLocaleDateString('en-US', {
//                       year: 'numeric',
//                       month: 'long',
//                       day: 'numeric'
//                     })}</div>
//                   </div>
//                   <div>
//                     <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Level</div>
//                     <div style={{ textTransform: 'capitalize' }}>{course.level}</div>
//                   </div>
//                   <div>
//                     <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Duration</div>
//                     <div>{course.duration}</div>
//                   </div>
//                 </div>

//                 <div style={{
//                   marginTop: '2rem',
//                   fontSize: '0.75rem',
//                   color: 'var(--color-gray-500)',
//                   fontStyle: 'italic'
//                 }}>
//                   EduLearn - Learning Management System
//                 </div>
//               </div>

//               {/* Download Button */}
//               <button
//                 onClick={downloadCertificate}
//                 className="btn btn-primary btn-lg"
//                 style={{ width: '100%', marginTop: '1rem' }}
//                 disabled={downloadingCert}
//               >
//                 {downloadingCert ? '⏳ Generating PDF...' : '📥 Download Certificate'}
//               </button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* Quiz Modal */}
//       {showQuizModal && selectedQuiz && (
//         <div className="modal-overlay" onClick={() => setShowQuizModal(false)}>
//           <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2>{selectedQuiz.title}</h2>
//               <button className="modal-close" onClick={() => setShowQuizModal(false)}>×</button>
//             </div>
//             <QuizView
//               material={selectedQuiz}
//               enrollmentId={enrollmentId}
//               onCompleted={() => {
//                 fetchEnrollment();
//               }}
//               onClose={() => {
//                 setShowQuizModal(false);
//                 setSelectedQuiz(null);
//                 fetchEnrollment();
//               }}
//             />
//           </div>
//         </div>
//       )}

//       {/* Material Viewer Modal */}
//       {showMaterialModal && selectedMaterial && (
//         <div className="modal-overlay" onClick={() => setShowMaterialModal(false)}>
//           <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
//             <div className="modal-header">
//               <h2>{selectedMaterial.title}</h2>
//               <button className="modal-close" onClick={() => setShowMaterialModal(false)}>×</button>
//             </div>
//             {renderMaterial()}
//           </div>
//         </div>
//       )}
//     </div>




//   );
// }

// export default LearnerCourseView;