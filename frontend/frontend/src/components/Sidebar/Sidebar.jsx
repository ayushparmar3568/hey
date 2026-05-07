import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Get user initials for avatar
  const getInitials = (name) => {
    if (!name) return 'AD';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">✨</div>
        <div className="sidebar-logo-text">SOCIOSCAN<br /></div>
      </div>

      {/* Operations Nav */}
      <div className="nav-section">OPERATIONS</div>
      <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>📊</span>
        <span>Dashboard</span>
      </NavLink>
      <NavLink to="/upload" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>📥</span>
        <span>Upload & Analyze</span>
      </NavLink>
      <NavLink to="/records" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span>📑</span>
        <span>All Records</span>
      </NavLink>
{/* 
      Channels Nav
      <div className="nav-section">CHANNELS</div>
      <div className="nav-item">
        <span>🐦</span>
        <span>Twitter Feed</span>
      </div>
      <div className="nav-item">
        <span>💬</span>
        <span>Direct Ingest</span>
      </div> */}

      {/* Footer with user info */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{getInitials(user?.name)}</div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'Admin'}</div>
            <div className="user-role">Administrator</div>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
