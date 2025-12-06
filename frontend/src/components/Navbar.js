import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="logo">
          <img src="/logo.png" className="logo-img" />
          <span>EduLearn</span>
        </Link>

        <div className="nav-links">
          {!token ? (
            <>
              <Link to="/">Home</Link>
              <Link to="/courses">Browse Courses</Link>
              <Link to="/login">Login</Link>
              <Link to="/signup">Sign Up</Link>
            </>
          ) : (
            <>
              {user?.role === 'learner' && (
                <>
                  <Link to="/">Home</Link>
                  <Link to="/courses">Browse Courses</Link>
                  <Link to="/my-courses">My Courses</Link>
                  <Link to="/profile">
                    {user?.username}
                  </Link>
                </>
              )}
              {user?.role === 'instructor' && (
                <>
                  <Link to="/">Home</Link>
                  <Link to="/courses">Browse Courses</Link>
                  <Link to="/my-courses">My Courses</Link>
                  <Link to="/profile">
                    {user?.username}
                  </Link>
                </>
              )}

              <button onClick={handleLogout} className="btn-logout">
              </button>
              
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
