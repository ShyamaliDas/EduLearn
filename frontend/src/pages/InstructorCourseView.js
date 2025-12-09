import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function InstructorCourseView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [showQuizPreviewModal, setShowQuizPreviewModal] = useState(false);
  const [showMaterialPreviewModal, setShowMaterialPreviewModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    level: 'beginner'
  });
  const [editImage, setEditImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [materialForm, setMaterialForm] = useState({
    title: '',
    type: 'video',
    content: '',
    quiz: []
  });
  const [materialFile, setMaterialFile] = useState(null);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);

  useEffect(() => {
    fetchCourse();
    fetchMaterials();
  }, [id]);

  const fetchCourse = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:5000/api/courses/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCourse(response.data);
      setEditForm({
        title: response.data.title,
        description: response.data.description,
        price: response.data.price,
        duration: response.data.duration,
        level: response.data.level
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching course:', error);
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
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

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      formData.append('title', editForm.title);
      formData.append('description', editForm.description);
      formData.append('price', editForm.price);
      formData.append('duration', editForm.duration);
      formData.append('level', editForm.level);

      if (editImage) {
        formData.append('image', editImage);
      }

      const response = await axios.put(
        `http://localhost:5000/api/courses/${id}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setCourse(response.data);
      setShowEditModal(false);
      alert('Course updated successfully!');
    } catch (error) {
      console.error('Error updating course:', error);
      alert(error.response?.data?.message || 'Failed to update course');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setUploadingMaterial(true);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();

      formData.append('title', materialForm.title);
      formData.append('type', materialForm.type);
      formData.append('courseId', id);

      if (materialForm.type === 'quiz') {
        formData.append('quiz', JSON.stringify(materialForm.quiz));
        formData.append('content', 'quiz');
      } else {
        if (materialFile) {
          formData.append('file', materialFile);
        } else {
          formData.append('content', materialForm.content);
        }
      }

      await axios.post(
        'http://localhost:5000/api/materials',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      alert('Material added successfully!');
      setShowAddMaterialModal(false);
      setMaterialForm({ title: '', type: 'video', content: '', quiz: [] });
      setMaterialFile(null);
      fetchMaterials();
    } catch (error) {
      console.error('Error adding material:', error);
      alert(error.response?.data?.message || 'Failed to add material');
    } finally {
      setUploadingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId, materialTitle) => {
    if (!window.confirm(`Delete "${materialTitle}"?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/materials/${materialId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Material deleted!');
      fetchMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      alert('Failed to delete material');
    }
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm(`Delete "${course.title}"? This cannot be undone!`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `http://localhost:5000/api/courses/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('Course deleted successfully!');
      navigate('/my-courses');
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
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

  const openMaterialPreview = (material) => {
    setSelectedMaterial(material);
    setShowMaterialPreviewModal(true);
  };

  const renderMaterialPreview = () => {
    if (!selectedMaterial) return null;

    switch (selectedMaterial.type) {
      case 'video':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <video
              controls
              style={{
                width: '100%',
                maxHeight: '500px',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)'
              }}
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
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <audio controls style={{ width: '100%' }}>
              <source src={`http://localhost:5000${selectedMaterial.content.replace(/^\/+/, '/')}`}
                type="audio/mpeg" />
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
            <img
              src={`http://localhost:5000${selectedMaterial.content.replace(/^\/+/, '/')}`}

              alt={selectedMaterial.title}
              style={{
                width: '100%',
                maxHeight: '600px',
                objectFit: 'contain',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          </div>
        );
      case 'slide':
        return (
          <div style={{ padding: '1rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <iframe
              src={`http://localhost:5000${selectedMaterial.content.replace(/^\/+/, '/')}`}

              title={selectedMaterial.title}
              style={{
                width: '100%',
                minHeight: '600px',
                border: 'none',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)'
              }}
            />
          </div>
        );
      case 'text':
        return (
          <div style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>
              {selectedMaterial.title}
            </h3>
            <div style={{
              color: 'var(--color-gray-800)',
              lineHeight: '1.8',
              whiteSpace: 'pre-wrap',
              fontSize: '1rem'
            }}>
              {selectedMaterial.content}
            </div>
          </div>
        );
      default:
        return <p>Unsupported material type</p>;
    }
  };

  function QuizBuilder({ quiz, onChange }) {
    const [questions, setQuestions] = useState(quiz || []);

    const addQuestion = () => {
      const newQuestion = {
        id: Date.now(),
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0
      };
      const updated = [...questions, newQuestion];
      setQuestions(updated);
      onChange(updated);
    };

    const updateQuestion = (index, field, value) => {
      const updated = [...questions];
      updated[index][field] = value;
      setQuestions(updated);
      onChange(updated);
    };

    const updateOption = (qIndex, oIndex, value) => {
      const updated = [...questions];
      updated[qIndex].options[oIndex] = value;
      setQuestions(updated);
      onChange(updated);
    };

    const deleteQuestion = (index) => {
      const updated = questions.filter((_, i) => i !== index);
      setQuestions(updated);
      onChange(updated);
    };

    return (
      <div>
        <div style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            onClick={addQuestion}
            className="btn btn-outline btn-sm"
          >
            <i className="bi bi-plus-circle-fill" style={{ color: '#7D9B6E' }}></i> Add Question
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {questions.map((q, qIndex) => (
            <div
              key={q.id}
              style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-gray-50)'
              }}
            >
              <div className="form-group">
                <label>Question {qIndex + 1}</label>
                <input
                  type="text"
                  value={q.question}
                  onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                  placeholder="Enter question text"
                />
              </div>
              <div className="form-row">
                {q.options.map((opt, oIndex) => (
                  <div className="form-group" key={oIndex}>
                    <label>Option {oIndex + 1}</label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                      placeholder={`Option ${oIndex + 1}`}
                    />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label>Correct Answer (Index 0-3)</label>
                <input
                  type="number"
                  min="0"
                  max="3"
                  value={q.correctAnswer}
                  onChange={(e) => updateQuestion(qIndex, 'correctAnswer', Number(e.target.value))}
                />
              </div>
              <button
                type="button"
                onClick={() => deleteQuestion(qIndex)}
                className="btn btn-danger btn-sm"
              >
                <i className="bi bi-trash-fill" style={{ color: '#afd886ff' }}></i> Delete Question
              </button>
            </div>
          ))}
          {questions.length === 0 && (
            <p style={{ color: 'var(--color-gray-600)' }}>No questions added yet.</p>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading course...</div>;
  }

  if (!course) {
    return (
      <div className="container" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="empty-state">
          <div className="empty-icon"><i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i></div>
          <h2>Course Not Found</h2>
          <p>The course you're looking for doesn't exist.</p>
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
            {course.title}
          </h1>
          <p style={{ margin: 0, color: 'var(--color-gray-600)' }}>
            By {course.instructor?.profile?.name || course.instructor?.username}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowEditModal(true)}
            className="btn btn-outline btn-sm"
          >
            <i className="bi bi-pencil-square" style={{ color: '#6B7C5E' }}></i> Edit Course
          </button>
          <button
            onClick={() => setShowAddMaterialModal(true)}
            className="btn btn-primary btn-sm"
          >
            <i className="bi bi-plus-circle-fill" style={{ color: '#7D9B6E' }}></i> Add Material
          </button>
          <button
            onClick={handleDeleteCourse}
            className="btn btn-danger btn-sm"
          >
            <i className="bi bi-trash-fill" style={{ color: '#6B7C5E' }}></i> Delete Course
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '1.5rem' }}>

        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Description</h2>
            <p style={{ color: 'var(--color-gray-700)', marginBottom: '1rem' }}>
              {course.description}
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span className="badge badge-level">
                Level: {course.level}
              </span>
              <span className="badge badge-duration">
                Duration: {course.duration}
              </span>
              <span className="badge badge-price">
                Price: ৳{course.price}
              </span>
            </div>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Materials</h2>
            {materials.length === 0 ? (
              <p style={{ color: 'var(--color-gray-600)' }}>No materials added yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {materials.map((material, index) => (
                  <div
                    key={material.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-gray-50)'
                    }}
                  >
                    <div style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--color-white)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--color-gray-200)'
                    }}>
                      {material.type === 'quiz' ? (
                        <i className="bi bi-question-circle-fill" style={{ color: '#6B7C5E' }}></i>
                      ) : material.type === 'video' ? (
                        <i className="bi bi-camera-video-fill" style={{ color: '#6B7C5E' }}></i>
                      ) : material.type === 'audio' ? (
                        <i className="bi bi-music-note-beamed" style={{ color: '#6B7C5E' }}></i>
                      ) : material.type === 'slide' ? (
                        <i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i>
                      ) : material.type === 'image' ? (
                        <i className="bi bi-image-fill" style={{ color: '#6B7C5E' }}></i>
                      ) : material.type === 'text' ? (
                        <i className="bi bi-file-text-fill" style={{ color: '#6B7C5E' }}></i>
                      ) : (
                        <i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i>
                      )}

                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: 'var(--color-gray-900)', marginBottom: '0.15rem' }}>
                        {index + 1}. {material.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                        {material.type.toUpperCase()}
                      </div>
                    </div>
                    {material.type === 'quiz' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedQuiz(material);
                          setShowQuizPreviewModal(true);
                        }}
                        className="btn btn-outline btn-sm"
                      >
                        Preview Quiz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openMaterialPreview(material)}
                        className="btn btn-outline btn-sm"
                      >
                        Preview
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMaterial(material.id, material.title)}
                      className="btn btn-danger btn-sm"
                    >
                      <i className="bi bi-trash-fill" style={{ color: '#6B7C5E' }}></i>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Course Stats */}
        <div>
          <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Stats</h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '1rem'
            }}>
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-gray-50)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}><i className="bi bi-people-fill" style={{ color: '#6B7C5E' }}></i>
                </div>
                <div style={{ fontWeight: '600', color: 'var(--color-primary)', fontSize: '1.2rem' }}>
                  {course.enrolledCount || 0}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                  Enrolled Students
                </div>
              </div>
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-gray-50)',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}><i className="bi bi-box-seam-fill" style={{ color: '#6B7C5E' }}></i>
                </div>
                <div style={{ fontWeight: '600', color: 'var(--color-primary)', fontSize: '1.2rem' }}>
                  {materials.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)' }}>
                  Materials
                </div>
              </div>
            </div>
          </div>

          {/* Course Image */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ marginBottom: '1rem', color: 'var(--color-primary)' }}>Course Thumbnail</h2>
            <div style={{
              width: '100%',
              height: '200px',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <img
                src={course.image ? `http://localhost:5000/uploads/courses/${course.image}` : 'https://via.placeholder.com/400x200?text=No+Image'
                  || 'https://via.placeholder.com/400x200?text=Course'}
                alt={course.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Course Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Course</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Course Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  rows="4"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (৳)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                    required
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input
                    type="text"
                    value={editForm.duration}
                    onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Level</label>
                <select
                  value={editForm.level}
                  onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                  required
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>

              <div className="form-group">
                <label>Course Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEditImage(e.target.files[0])}
                />
                <small>Upload a new thumbnail if you want to change it</small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Modal */}
      {showAddMaterialModal && (
        <div className="modal-overlay" onClick={() => setShowAddMaterialModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add Material</h2>
              <button className="modal-close" onClick={() => setShowAddMaterialModal(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>

            <form onSubmit={handleAddMaterial}>
              <div className="form-group">
                <label>Title</label>
                <input
                  type="text"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({ ...materialForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  value={materialForm.type}
                  onChange={(e) => setMaterialForm({ ...materialForm, type: e.target.value })}
                  required
                >
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="image">Image</option>
                  <option value="slide">Slide</option>
                  <option value="text">Text</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>

              {materialForm.type === 'quiz' ? (
                <QuizBuilder
                  quiz={materialForm.quiz}
                  onChange={(quiz) => setMaterialForm({ ...materialForm, quiz })}
                />
              ) : (
                <>
                  <div className="form-group">
                    <label>Upload File (optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setMaterialFile(e.target.files[0])}
                    />
                  </div>
                  <div className="form-group">
                    <label>Content URL / Text</label>
                    <textarea
                      value={materialForm.content}
                      onChange={(e) => setMaterialForm({ ...materialForm, content: e.target.value })}
                      rows="3"
                      placeholder="Provide URL or text content"
                    />
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowAddMaterialModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={uploadingMaterial}
                >
                  {uploadingMaterial ? 'Adding...' : 'Add Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Preview Modal */}
      {showMaterialPreviewModal && selectedMaterial && (
        <div className="modal-overlay" onClick={() => setShowMaterialPreviewModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedMaterial.title}</h2>
              <button className="modal-close" onClick={() => setShowMaterialPreviewModal(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>
            {renderMaterialPreview()}
          </div>
        </div>
      )}

      {/* Quiz Preview Modal */}
      {showQuizPreviewModal && selectedQuiz && (
        <div className="modal-overlay" onClick={() => setShowQuizPreviewModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Quiz Preview: {selectedQuiz.title}</h2>
              <button className="modal-close" onClick={() => setShowQuizPreviewModal(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>
            <div style={{ paddingTop: '0.5rem' }}>
              {selectedQuiz.quiz && selectedQuiz.quiz.length > 0 ? (
                selectedQuiz.quiz.map((q, index) => (
                  <div
                    key={q.id || index}
                    style={{
                      marginBottom: '1.25rem',
                      padding: '1rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-gray-50)'
                    }}
                  >
                    <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                      Q{index + 1}. {q.question}
                    </div>
                    <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                      {q.options.map((opt, oIndex) => (
                        <li
                          key={oIndex}
                          style={{
                            marginBottom: '0.25rem',
                            color: oIndex === q.correctAnswer ? 'var(--color-success)' : 'var(--color-gray-700)',
                            fontWeight: oIndex === q.correctAnswer ? '600' : '400'
                          }}
                        >
                          {opt}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--color-gray-600)' }}>No questions in this quiz yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InstructorCourseView;


