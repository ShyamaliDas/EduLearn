import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bankStatus, setBankStatus] = useState(null);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showBankSetup, setShowBankSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    contact: '',
    education: '',
    institution: '',
    profilePicture: '',
    // Learner specific
    class: '',
    group: '',
    university: '',
    department: '',
    // Instructor specific
    profession: '',
    bio: '',
    qualification: ''
  });
  const [bankForm, setBankForm] = useState({ secretCode: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [setupError, setSetupError] = useState('');
  const [setupSuccess, setSetupSuccess] = useState('');
  const [settingUp, setSettingUp] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      let profilePictureUrl = user.profile?.profilePicture || '';

      if (selectedFile) {
        const formData = new FormData();
        formData.append('profilePicture', selectedFile);

        try {
          const uploadResponse = await axios.post(
            'http://localhost:5000/api/auth/upload-profile-picture',
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              }
            }
          );
          profilePictureUrl = uploadResponse.data.url;
        } catch (uploadError) {
          console.error('Upload error:', uploadError.response?.data);
          alert('Failed to upload picture: ' + (uploadError.response?.data?.message || uploadError.message));
          return;
        }
      }

      await axios.put(
        'http://localhost:5000/api/auth/profile',
        { profile: { ...profileForm, profilePicture: profilePictureUrl } },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const updatedUser = {
        ...user,
        profile: { ...profileForm, profilePicture: profilePictureUrl },
        email: profileForm.email
      };

      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      alert('Profile updated successfully!');
      setShowEditProfile(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      window.location.reload();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(error.response?.data?.message || 'Failed to update profile');
    }
  };

  useEffect(() => {
    fetchUserProfile();
    fetchBankStatus();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem('user'));
      setUser(storedUser);

      if (storedUser?.profile) {
        setProfileForm({
          name: storedUser.profile.name || '',
          email: storedUser.email || '',
          contact: storedUser.profile.contact || '',
          education: storedUser.profile.education || '',
          institution: storedUser.profile.institution || '',
          class: storedUser.profile.class || '',
          group: storedUser.profile.group || '',
          university: storedUser.profile.university || '',
          department: storedUser.profile.department || '',
          profession: storedUser.profile.profession || '',
          bio: storedUser.profile.bio || '',
          qualification: storedUser.profile.qualification || ''
        });
      } else {
        setProfileForm(prev => ({ ...prev, email: storedUser.email }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBankStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/bank/status',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBankStatus(response.data);
    } catch (error) {
      console.error('Error fetching bank status:', error);
    }
  };

  const handleBankSetup = async (e) => {
    e.preventDefault();
    setSetupError('');
    setSetupSuccess('');
    setSettingUp(true);

    if (!bankForm.secretCode || bankForm.secretCode.length < 6) {
      setSetupError('Secret code must be at least 6 characters');
      setSettingUp(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/bank/setup',
        { secretCode: bankForm.secretCode },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSetupSuccess(response.data.message);
      const updatedUser = { ...user };
      if (!updatedUser.bankAccount) updatedUser.bankAccount = {};
      updatedUser.bankAccount.isSetup = true;
      localStorage.setItem('user', JSON.stringify(updatedUser));

      setTimeout(() => {
        setShowBankSetup(false);
        setBankForm({ secretCode: '' });
        fetchBankStatus();
        setSetupSuccess('');
      }, 2000);
    } catch (error) {
      console.error('Error setting up bank:', error);
      setSetupError(error.response?.data?.message || 'Failed to setup bank account');
    } finally {
      setSettingUp(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  const isInstructor = user.role === 'instructor';

  return (
    <div className="container" style={{ maxWidth: '1100px', paddingTop: '2rem', paddingBottom: '3rem' }}>
      {/* Profile Header */}
      <div className="profile-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Profile Picture */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '4px solid var(--color-secondary)',
              boxShadow: 'var(--shadow-md)',
              marginBottom: '1rem'
            }}>
              <img
                src={user.profile?.profilePicture || 'https://via.placeholder.com/150?text=User'}
                alt="Profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>

          {/* Profile Info */}
          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '1rem' }}>
              <h1 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>
                {user.profile?.name || user.username}
              </h1>
              <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>
                {user.email}
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <span className="role-badge">
                  {isInstructor ? (
                    <><i className="bi bi-person-badge-fill" style={{ color: '#6B7C5E' }}></i> Instructor</>
                  ) : (
                    <><i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E' }}></i> Learner</>
                  )}

                </span>
              </div>
            </div>

            {user.profile?.bio && (
              <p style={{
                color: 'var(--color-gray-700)',
                lineHeight: '1.6',
                padding: '1rem',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '3px solid var(--color-primary)'
              }}>
                {user.profile.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Personal Information */}
        <div className="profile-info-card">
          <h2 className="profile-info-title">Personal Information</h2>
          <button
            onClick={() => setShowEditProfile(true)}
            className="btn btn-outline btn-sm"
            style={{ float: 'right', marginTop: '-3.5rem' }}
          >
            Edit Profile
          </button>

          {user.role === 'instructor' ? (
            <>
              <div className="profile-info-item">
                <div className="profile-info-label">Qualification</div>
                <div className="profile-info-value">
                  {user.profile?.qualification || 'Not specified'}
                </div>
              </div>

              <div className="profile-info-item">
                <div className="profile-info-label">Profession</div>
                <div className="profile-info-value">
                  {user.profile?.profession || 'Not specified'}
                </div>
              </div>

              <div className="profile-info-item">
                <div className="profile-info-label">Email</div>
                <div className="profile-info-value">{user.email}</div>
              </div>

              {user.profile?.bio && (
                <div className="profile-info-item">
                  <div className="profile-info-label">Bio</div>
                  <div className="profile-info-value" style={{ fontStyle: 'italic' }}>
                    {user.profile.bio}
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="profile-info-item">
                <div className="profile-info-label">Email</div>
                <div className="profile-info-value">{user.email}</div>
              </div>

              <div className="profile-info-item">
                <div className="profile-info-label">Class</div>
                <div className="profile-info-value">
                  {user.profile?.class || 'Not specified'}
                </div>
              </div>

              {user.profile?.group && (
                <div className="profile-info-item">
                  <div className="profile-info-label">Group</div>
                  <div className="profile-info-value capitalize">
                    {user.profile.group}
                  </div>
                </div>
              )}

              <div className="profile-info-item">
                <div className="profile-info-label">Institution</div>
                <div className="profile-info-value">
                  {user.profile?.institution || 'Not specified'}
                </div>
              </div>

              {user.profile?.department && (
                <div className="profile-info-item">
                  <div className="profile-info-label">Department</div>
                  <div className="profile-info-value">
                    {user.profile.department}
                  </div>
                </div>
              )}
            </>
          )}
        </div>


        {/* Bank Account */}
        <div className="card" style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
            Bank Account
          </h2>

          {bankStatus?.isSetup ? (
            <div>
              <div style={{
                padding: '1.5rem',
                background: 'var(--color-secondary-light)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>
                    Account Number
                  </div>
                  <div style={{
                    fontWeight: '600',
                    fontSize: '1.1rem',
                    color: 'var(--color-primary)',
                    fontFamily: 'monospace'
                  }}>
                    {bankStatus.accountNumber}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-600)', marginBottom: '0.25rem' }}>
                    Current Balance
                  </div>
                  <div style={{
                    fontWeight: '700',
                    fontSize: '1.75rem',
                    color: 'var(--color-primary)'
                  }}>
                    ৳{bankStatus.balance || 0}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/transactions')}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                View Transactions
              </button>
            </div>
          ) : (
            <div>
              <div style={{
                padding: '1.5rem',
                background: 'var(--color-gray-50)',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}><i className="bi bi-bank" style={{ color: '#6B7C5E' }}></i></div>
                <p style={{ color: 'var(--color-gray-600)', marginBottom: '0' }}>
                  Setup your bank account to {user.role === 'learner' ? 'enroll in courses' : 'create courses and receive payments'}.
                  {user.role === 'learner' && ' You will receive ৳10,000 initially.'}
                </p>
              </div>

              <button
                onClick={() => setShowBankSetup(true)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Setup Bank Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Profile</h2>
              <button className="modal-close" onClick={() => setShowEditProfile(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>

            <form onSubmit={handleUpdateProfile}>
              {/* Profile Picture Upload */}
              <div className="form-group">
                <label>Profile Picture</label>
                {previewUrl && (
                  <div style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    marginBottom: '1rem',
                    border: '3px solid var(--color-secondary)'
                  }}>
                    <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  style={{
                    padding: '0.75rem',
                    border: '2px dashed var(--color-gray-300)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Your full name"
                  />
                </div>

                <div className="form-group">
                  <label>Contact</label>
                  <input
                    type="text"
                    value={profileForm.contact}
                    onChange={(e) => setProfileForm({ ...profileForm, contact: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
              </div>



              {user.role === 'instructor' ? (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Profession</label>
                      <input
                        type="text"
                        value={profileForm.profession}
                        onChange={(e) => setProfileForm({ ...profileForm, profession: e.target.value })}
                        placeholder="Your profession"
                      />
                    </div>

                    <div className="form-group">
                      <label>Qualification</label>
                      <input
                        type="text"
                        value={profileForm.qualification}
                        onChange={(e) => setProfileForm({ ...profileForm, qualification: e.target.value })}
                        placeholder="Your qualifications"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      placeholder="Tell us about yourself..."
                      rows="4"
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Email field */}
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="Your email"
                      readOnly
                      style={{ background: 'var(--color-gray-100)', cursor: 'not-allowed' }}
                    />
                    <small>Email cannot be changed</small>
                  </div>

                  {/* Class dropdown */}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Class</label>
                      <select
                        value={profileForm.class}
                        onChange={(e) => setProfileForm({ ...profileForm, class: e.target.value })}
                      >
                        <option value="">Select Class</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 'University'].map((cls) => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                      </select>
                    </div>

                    {/* Show Group only for class 9-12 */}
                    {profileForm.class >= 9 && profileForm.class <= 12 && (
                      <div className="form-group">
                        <label>Group</label>
                        <select
                          value={profileForm.group}
                          onChange={(e) => setProfileForm({ ...profileForm, group: e.target.value })}
                        >
                          <option value="">Select Group</option>
                          <option value="science">Science</option>
                          <option value="arts">Arts</option>
                          <option value="commerce">Commerce</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Institution - Dynamic label based on class */}
                  <div className="form-group">
                    <label>
                      {profileForm.class >= 1 && profileForm.class <= 10
                        ? 'School Name'
                        : profileForm.class >= 11 && profileForm.class <= 12
                          ? 'College Name'
                          : 'University Name'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.institution}
                      onChange={(e) => setProfileForm({ ...profileForm, institution: e.target.value })}
                      placeholder={
                        profileForm.class >= 1 && profileForm.class <= 10
                          ? 'Enter your school name'
                          : profileForm.class >= 11 && profileForm.class <= 12
                            ? 'Enter your college name'
                            : 'Enter your university name'
                      }
                    />
                  </div>

                  {/* Department - Only for University */}
                  {profileForm.class === 'University' && (
                    <div className="form-group">
                      <label>Department</label>
                      <input
                        type="text"
                        value={profileForm.department}
                        onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                        placeholder="e.g., Computer Science & Engineering"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowEditProfile(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* Bank Setup Modal */}
      {showBankSetup && (
        <div className="modal-overlay" onClick={() => setShowBankSetup(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Setup Bank Account</h2>
              <button className="modal-close" onClick={() => setShowBankSetup(false)}><i className="bi bi-x-lg" style={{ color: '#6B7C5E' }}></i>
              </button>
            </div>

            {setupError && <div className="error-message">{setupError}</div>}
            {setupSuccess && <div className="success-message">{setupSuccess}</div>}

            <form onSubmit={handleBankSetup}>
              <div className="form-group">
                <label>Secret Code</label>
                <input
                  type="password"
                  value={bankForm.secretCode}
                  onChange={(e) => setBankForm({ ...bankForm, secretCode: e.target.value })}
                  placeholder="Create a 6+ character secret code"
                  required
                  minLength={6}
                />
                <small>This code will secure your banking transactions</small>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowBankSetup(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={settingUp}
                >
                  {settingUp ? 'Setting up...' : 'Setup Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
