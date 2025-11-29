import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../App.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalInstructors: 0
  });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [instructorStats, setInstructorStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    setUser(storedUser);

    fetchStats();

    if (storedUser?.role === 'learner') {
      fetchEnrolledCourses();
    } else if (storedUser?.role === 'instructor') {
      fetchInstructorStats();
    }
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/courses/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };


  const fetchInstructorStats = async () => {
  try {
    const token = localStorage.getItem('token');

    // Fetch instructor's courses
    const coursesResponse = await axios.get(
      'http://localhost:5000/api/courses/instructor/my-courses',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const courses = coursesResponse.data;

    // Calculate stats from courses
    const totalCourses = courses.length;
    const totalStudents = courses.reduce((sum, course) => sum + (course.enrolledCount || 0), 0);

    //  Fetch REAL bank balance instead of calculating
    let totalEarnings = 0;
    try {
      const bankResponse = await axios.get(
        'http://localhost:5000/api/bank/balance',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      totalEarnings = bankResponse.data.balance || 0;
    } catch (bankError) {
      console.error('Error fetching bank balance:', bankError);
      totalEarnings = 0;
    }

    setInstructorStats({
      totalCourses,
      totalStudents,
      totalEarnings
    });
  } catch (error) {
    console.error('Error fetching instructor stats:', error);
    // Set default values on error
    setInstructorStats({
      totalCourses: 0,
      totalStudents: 0,
      totalEarnings: 0
    });
  }
};



  const fetchEnrolledCourses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        'http://localhost:5000/api/enrollments/my-enrollments',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEnrolledCourses(response.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    }
  };

  // Logged Out User View
  if (!user) {
    return (
      <div className="container">
        {/* Hero Section */}
        <div className='hero-section-logout'>
          <h1 className='welcome-logout'>
            Welcome to EduLearn
          </h1>
          <p className='hro-sctn-lgot'>
            Join EduLearn and unlock your potential with expert-led courses
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/signup" className="btn btn-primary btn-lg">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-outline btn-lg">
              Sign In
            </Link>
          </div>
        </div>

        {/* Platform Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem',
          marginBottom: '3rem'
        }}>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i></div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              {stats.totalCourses}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Courses</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E' }}></i>
</div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              {stats.totalStudents}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Students</p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-person-badge-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              {stats.totalInstructors}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Instructors</p>
          </div>
        </div>

        {/* Features Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
            Why Choose EduLearn?
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { icon: <i className="bi bi-person-badge-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Expert Instructors', desc: 'Learn from industry professionals and certified educators' },
              { icon: <i className="bi bi-phone-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Rich Content', desc: 'Access videos, slides, audio lectures, and interactive quizzes' },
              { icon: <i className="bi bi-bar-chart-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Track Progress', desc: 'Monitor your learning journey with detailed progress tracking' },
              { icon: <i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Certificates', desc: 'Earn certificates upon course completion' },
              { icon: <i className="bi bi-credit-card-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Secure Payments', desc: 'Integrated banking system for safe transactions' },
              { icon: <i className="bi bi-globe" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Learn Anywhere', desc: 'Access courses on any device, anytime' }
            ].map((feature, idx) => (
              <div key={idx} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>
                  {feature.title}
                </h4>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', margin: 0 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>


      </div>
    );
  }

  // Learner Dashboard
  if (user.role === 'learner') {
    return (
      <div className="container">
        {/* Welcome Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: 'white',
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h1 style={{ color: 'white', marginBottom: '0.5rem' }}>
            Welcome back, {user.username}! <i className="bi bi-hand-wave-fill" style={{ color: '#6B7C5E' }}></i>
          </h1>
          <p style={{ color: 'var(--color-secondary-light)', fontSize: '1.1rem', margin: 0 }}>
            Ready to continue your learning journey?
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '3rem'
        }}>
          <Link to="/courses" className="card" style={{
            textDecoration: 'none',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-search" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>Discover</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              Explore new courses
            </p>
          </Link>
          <Link to="/my-courses" className="card" style={{
            textDecoration: 'none',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>My Courses</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              Continue learning
            </p>
          </Link>
          <Link to="/profile" className="card" style={{
            textDecoration: 'none',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-person-circle" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>Profile</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              Manage account
            </p>
          </Link>
        </div>

        {/* Features Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
            Why Choose EduLearn?
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { icon: <i className="bi bi-person-badge-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Expert Instructors', desc: 'Learn from industry professionals and certified educators' },
              { icon: <i className="bi bi-phone-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Rich Content', desc: 'Access videos, slides, audio lectures, and interactive quizzes' },
              { icon: <i className="bi bi-bar-chart-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Track Progress', desc: 'Monitor your learning journey with detailed progress tracking' },
              { icon: <i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Certificates', desc: 'Earn certificates upon course completion' },
              { icon: <i className="bi bi-credit-card-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Secure Payments', desc: 'Integrated banking system for safe transactions' },
              { icon: <i className="bi bi-globe" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Learn Anywhere', desc: 'Access courses on any device, anytime' }
            ].map((feature, idx) => (
              <div key={idx} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>
                  {feature.title}
                </h4>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', margin: 0 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Enrolled Courses */}
        {enrolledCourses.length > 0 && (
          <div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem'
            }}>
              <h2 style={{ color: 'var(--color-primary)', margin: 0 }}>My Enrolled Courses</h2>
            </div>
            <div className="courses-grid">
              {enrolledCourses.map(enrollment => (
                <div
                  key={enrollment.id}
                  className="course-card"
                  onClick={() => navigate(`/learner/course/${enrollment.course.id}`)}
                >
                  <div className="course-image">
                    <img
                      src={enrollment.course.image ? `http://localhost:5000/uploads/courses/${enrollment.course.image}` : 'https://via.placeholder.com/400x200?text=No+Image'
                        || 'https://via.placeholder.com/400x200?text=Course'}
                      alt={enrollment.course.title}
                    />
                  </div>
                  <div className="course-card-body">
                    <h3>{enrollment.course.title}</h3>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        marginBottom: '0.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--color-gray-600)'
                      }}>
                        <span>Progress</span>
                        <span>{enrollment.progress || 0}%</span>
                      </div>
                      <div style={{
                        height: '8px',
                        background: 'var(--color-gray-200)',
                        borderRadius: 'var(--radius-full)',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${enrollment.progress || 0}%`,
                          background: 'var(--color-success)',
                          transition: 'width 0.3s ease'
                        }} />
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" style={{ width: '100%' }}>
                      Go to Course
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Link to="/my-courses" className="btn btn-outline btn-sm">View All Courses</Link>
          </div>
        )}


      </div>
    );
  }

  // Instructor Dashboard
  if (user.role === 'instructor') {
    return (
      <div className="container">
        {/* Welcome Section */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-dark) 100%)',
          color: 'white',
          padding: '2.5rem',
          borderRadius: 'var(--radius-xl)',
          marginBottom: '2rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h1 style={{ color: 'white', marginBottom: '0.5rem' }}>
            Welcome, {user.username}! <i className="bi bi-person-badge-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>
          </h1>
          <p style={{ color: 'var(--color-secondary-light)', fontSize: '1.1rem', margin: 0 }}>
            Manage your courses and inspire students
          </p>
        </div>

        {/* Features Section */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
            Why Choose EduLearn?
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.5rem'
          }}>
            {[
              { icon: <i className="bi bi-person-badge-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Expert Instructors', desc: 'Learn from industry professionals and certified educators' },
              { icon: <i className="bi bi-phone-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Rich Content', desc: 'Access videos, slides, audio lectures, and interactive quizzes' },
              { icon: <i className="bi bi-bar-chart-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Track Progress', desc: 'Monitor your learning journey with detailed progress tracking' },
              { icon: <i className="bi bi-mortarboard-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Certificates', desc: 'Earn certificates upon course completion' },
              { icon: <i className="bi bi-credit-card-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Secure Payments', desc: 'Integrated banking system for safe transactions' },
              { icon: <i className="bi bi-globe" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i>, title: 'Learn Anywhere', desc: 'Access courses on any device, anytime' }
            ].map((feature, idx) => (
              <div key={idx} className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-gray-900)' }}>
                  {feature.title}
                </h4>
                <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', margin: 0 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Instructor Stats */}
        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
            Your Statistics
          </h2><div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i></div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              {instructorStats.totalCourses}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Your Courses</p>
          </div>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-person-circle" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              {instructorStats.totalStudents}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Total Students</p>
          </div>
          <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-cash-coin" style={{ color: '#6B7C5E' }}></i>
</div>
            <h3 style={{ color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
              ৳{instructorStats.totalEarnings}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', margin: 0 }}>Total Earnings</p>
          </div></div>
        </div>




        {/* Quick Actions */}

        <div style={{ marginBottom: '3rem' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--color-primary)' }}>
          Quick Actions
          </h2>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem'
          }}>
          <Link to="/instructor/create-course" className="card" style={{ textDecoration: 'none', padding: '1.5rem', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-plus-circle-fill" style={{ color: '#7D9B6E' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>Create Course</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              Build a new course
            </p>
          </Link>

          <Link to="/my-courses" className="card" style={{
            textDecoration: 'none',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-book-fill" style={{ color: '#6B7C5E' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>My Courses</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              Manage your courses
            </p>
          </Link>
          <Link to="/transactions" className="card" style={{
            textDecoration: 'none',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-credit-card-fill" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>Earnings</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              View earnings
            </p>
          </Link>
          <Link to="/profile" className="card" style={{
            textDecoration: 'none',
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}><i className="bi bi-person-circle" style={{ color: '#6B7C5E', fontSize: '3rem' }}></i></div>
            <h4 style={{ color: 'var(--color-gray-900)', marginBottom: '0.25rem' }}>Profile</h4>
            <p style={{ color: 'var(--color-gray-600)', fontSize: '0.85rem', margin: 0 }}>
              Update profile
            </p>
          </Link>
          </div>
        </div>
      </div>
    );
  }

  return <div className="loading">Loading...</div>;
}

export default Home;


