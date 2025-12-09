import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function CreateCourse() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    duration: '',
    level: 'beginner',
    bankSecret: '' 
  });
  const [image, setImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('price', formData.price);
      data.append('duration', formData.duration);
      data.append('level', formData.level);
      data.append('bankSecret', formData.bankSecret); 
      
      if (image) {
        data.append('image', image);
      }

      const response = await axios.post(
        'http://localhost:5000/api/courses',
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Show success message
      setSuccessMessage(response.data.message);
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/my-courses');
      }, 3000);

    } catch (err) {
      console.error('Create course error:', err);
      
      if (err.response?.data?.needsBankSetup) {
        if (window.confirm('You need to setup your bank account first. Setup now?')) {
          navigate('/bank-setup');
        }
      } else {
        setError(err.response?.data?.message || 'Failed to create course');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: '900px', paddingTop: '2rem', paddingBottom: '3rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
          Create New Course
        </h1>
        <p style={{ color: 'var(--color-gray-600)', fontSize: '1.05rem' }}>
          Share your knowledge and inspire learners worldwide
        </p>
      </div>

      <div className="card" style={{ padding: '2.5rem' }}>
        {/* Success Message */}
        {successMessage && (
          <div className="success-notice" style={{ marginBottom: '1.5rem' }}>
            <span className="success-notice-icon">
              <i className="bi bi-check-circle-fill"></i>
            </span>
            <div className="success-notice-text">
              <strong>{successMessage}</strong>
              <div style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                <span className="spinner-pending"></span>
                Redirecting to your courses...
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message" style={{ marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Course Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g., Complete Web Development Bootcamp"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Course Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe what students will learn in this course..."
              required
              rows="5"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price">Price (৳) *</label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                placeholder="e.g., 2500"
                required
                min="0"
              />
            </div>

            <div className="form-group">
              <label htmlFor="duration">Duration *</label>
              <input
                type="text"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="e.g., 6 weeks"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="level">Difficulty Level *</label>
            <select
              id="level"
              name="level"
              value={formData.level}
              onChange={handleChange}
              required
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="image">Course Thumbnail</label>
            <input
              type="file"
              id="image"
              accept="image/*"
              onChange={handleImageChange}
              style={{ 
                padding: '0.75rem',
                border: '2px dashed var(--color-gray-300)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer'
              }}
            />
            <small>Upload an attractive image for your course (recommended: 400x200px)</small>
          </div>

          {previewUrl && (
            <div style={{ 
              marginTop: '1rem', 
              marginBottom: '1.5rem',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  width: '100%', 
                  maxHeight: '300px', 
                  objectFit: 'cover' 
                }}
              />
            </div>
          )}

          {/* Bank Secret Input */}
          <div className="form-group" style={{ 
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '2px solid var(--color-gray-200)'
          }}>
            <label htmlFor="bankSecret">
              Bank Secret Code *
              <span style={{ 
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: '400',
                color: 'var(--color-gray-600)',
                marginTop: '0.25rem'
              }}>
                Enter your bank account secret code to confirm course creation
              </span>
            </label>
            <input
              type="password"
              id="bankSecret"
              name="bankSecret"
              value={formData.bankSecret}
              onChange={handleChange}
              placeholder="Enter your bank secret code"
              required
              minLength={6}
            />
            <small style={{ color: 'var(--color-warning)' }}>
              <i className="bi bi-shield-lock"></i> This ensures secure course creation and payment processing
            </small>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '1rem', 
            marginTop: '2rem'
          }}>
            <button
              type="button"
              onClick={() => navigate('/my-courses')}
              className="btn btn-outline"
            >
              Cancel
            </button>
            
            <button 
              type="submit" 
              className="btn btn-primary btn-lg" 
              style={{ flex: 1 }}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-pending"></span>
                  Creating Course...
                </>
              ) : (
                'Create Course'
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="pending-notice" style={{ marginTop: '1.5rem' }}>
          <span className="pending-notice-icon">
            <i className="bi bi-info-circle"></i>
          </span>
          <div className="pending-notice-text">
            After creating a course, it will be pending bank validation. 
            Once approved by the bank, you'll receive 1,500 TK reward automatically.
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreateCourse;