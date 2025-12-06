import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function CourseLearning() {
  const { enrollmentId } = useParams();
  const [enrollment, setEnrollment] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEnrollmentDetails();
  }, [enrollmentId]);

  const fetchEnrollmentDetails = async () => {
    try {
      const token = localStorage.getItem('token');

      const enrollmentResponse = await axios.get(
        `http://localhost:5000/api/enrollments/${enrollmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrollment(enrollmentResponse.data);

      const materialsResponse = await axios.get(
        `http://localhost:5000/api/materials/course/${enrollmentResponse.data.course._id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMaterials(materialsResponse.data);

      if (materialsResponse.data.length > 0) {
        setCurrentMaterial(materialsResponse.data[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching details:', error);
      setLoading(false);
    }
  };

  const handleCompleteCourse = async () => {
    if (!window.confirm('Mark this course as complete?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/enrollments/${enrollmentId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Congratulations! Course completed. Certificate issued!');
      navigate('/my-courses');
    } catch (error) {
      console.error('Error completing course:', error);
      alert('Failed to complete course');
    }
  };

  const handleQuizAnswer = (questionIndex, answerIndex) => {
    setQuizAnswers({ ...quizAnswers, [questionIndex]: answerIndex });
  };

  const submitQuiz = () => {
    if (!currentMaterial.quiz) return;

    let correct = 0;
    currentMaterial.quiz.forEach((question, index) => {
      if (quizAnswers[index] === question.correctAnswer) {
        correct++;
      }
    });

    const percentage = (correct / currentMaterial.quiz.length) * 100;
    setQuizResults({ correct, total: currentMaterial.quiz.length, percentage });
  };

  const renderMaterial = () => {
    if (!currentMaterial) return null;

    switch (currentMaterial.type) {
      case 'video':
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="mb-2" style={{ color: 'var(--color-primary)' }}>{currentMaterial.title}</h2>
            <video
              controls
              style={{
                width: '100%',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              <source src={currentMaterial.content} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        );
      case 'audio':
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="mb-2" style={{ color: 'var(--color-primary)' }}>{currentMaterial.title}</h2>
            <audio controls style={{ width: '100%' }}>
              <source src={currentMaterial.content} type="audio/mpeg" />
              Your browser does not support the audio element.
            </audio>
          </div>
        );
      case 'image':
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="mb-2" style={{ color: 'var(--color-primary)' }}>{currentMaterial.title}</h2>
            <img
              src={currentMaterial.content}
              alt={currentMaterial.title}
              style={{
                width: '100%',
                maxHeight: '500px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          </div>
        );
      case 'slide':
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="mb-2" style={{ color: 'var(--color-primary)' }}>{currentMaterial.title}</h2>
            <iframe
              src={currentMaterial.content}
              title={currentMaterial.title}
              style={{
                width: '100%',
                minHeight: '500px',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          </div>
        );
      case 'text':
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="mb-2" style={{ color: 'var(--color-primary)' }}>{currentMaterial.title}</h2>
            <div style={{ color: 'var(--color-gray-800)', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
              {currentMaterial.content}
            </div>
          </div>
        );
      case 'quiz':
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 className="mb-2" style={{ color: 'var(--color-primary)' }}>{currentMaterial.title}</h2>
            {currentMaterial.quiz && currentMaterial.quiz.map((question, qIndex) => (
              <div
                key={qIndex}
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-gray-50)'
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '0.75rem' }}>
                  Q{qIndex + 1}. {question.question}
                </div>
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {question.options.map((option, oIndex) => {
                    const isSelected = quizAnswers[qIndex] === oIndex;
                    return (
                      <button
                        key={oIndex}
                        type="button"
                        onClick={() => handleQuizAnswer(qIndex, oIndex)}
                        className={isSelected ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                        style={{ justifyContent: 'flex-start' }}
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={submitQuiz}
              className="btn btn-primary"
            >
              Submit Quiz
            </button>

            {quizResults && (
              <div
                className="mt-2"
                style={{
                  marginTop: '1.5rem',
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: quizResults.percentage >= 60 ? '#f0f9f4' : '#fef2f2',
                  borderLeft: `4px solid ${
                    quizResults.percentage >= 60
                      ? 'var(--color-success)'
                      : 'var(--color-danger)'
                  }`
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  Score: {quizResults.correct} / {quizResults.total} ({quizResults.percentage.toFixed(0)}%)
                </div>
                <div>
                  {quizResults.percentage >= 60 ? 'Great job! You passed!' : 'Keep practicing!'}
                </div>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="card" style={{ padding: '1.5rem' }}>
            <p>Unsupported material type</p>
          </div>
        );
    }
  };

  if (loading) {
    return <div className="loading">Loading course...</div>;
  }

  if (!enrollment) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-x-circle-fill"></i></div>
          <h2>Enrollment Not Found</h2>
          <p>We could not find this course enrollment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
            {enrollment.course.title}
          </h1>
          <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>
            Continue your learning journey
          </p>
        </div>
        <button
          onClick={handleCompleteCourse}
          className="btn btn-success"
        >
          Mark as Complete
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1.5rem' }}>
        {/* Sidebar - Materials List */}
        <div className="card" style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Content</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {materials.map((material) => {
              const isActive = currentMaterial && currentMaterial.id === material.id;
              return (
                <button
                  key={material.id}
                  type="button"
                  onClick={() => {
                    setCurrentMaterial(material);
                    setQuizResults(null);
                    setQuizAnswers({});
                  }}
                  className={isActive ? 'btn btn-primary btn-sm' : 'btn btn-outline btn-sm'}
                  style={{
                    justifyContent: 'flex-start',
                    whiteSpace: 'normal'
                  }}
                >
                  {material.title}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {renderMaterial()}
        </div>
      </div>
    </div>
  );
}

export default CourseLearning;