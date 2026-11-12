import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderSearch,
  Search,
  ShieldAlert,
  FileCheck2,
  Settings,
  User,
  LogOut,
  ChevronUp,
  Shield,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout, switchProfile, availableProfiles } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setProfileMenuOpen(false);
    navigate('/login');
  };

  return (
    <aside className="app-sidebar">
      {/* Brand Header */}
      <div className="sidebar-brand">
        <div className="brand-logo-badge">
          <Shield className="brand-icon-svg" size={20} />
        </div>
        <div className="brand-info">
          <span className="brand-name">CryptoTrace<span className="brand-ai-badge">AI</span></span>
          <span className="brand-tagline">Forensic Decision Engine</span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="sidebar-nav">
        <div className="nav-group-label">WORKSPACE</div>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <LayoutDashboard size={18} className="nav-icon" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/investigations"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <FolderSearch size={18} className="nav-icon" />
          <span>Investigations</span>
        </NavLink>

        <NavLink
          to="/explorer"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <Search size={18} className="nav-icon" />
          <span>Transaction Explorer</span>
        </NavLink>

        <NavLink
          to="/risk-intelligence"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <ShieldAlert size={18} className="nav-icon" />
          <span>Risk Intelligence</span>
        </NavLink>

        <NavLink
          to="/reports"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
        >
          <FileCheck2 size={18} className="nav-icon" />
          <span>Reports &amp; Evidence</span>
        </NavLink>
      </nav>

      {/* Sidebar Footer: Settings & Profile */}
      <div className="sidebar-footer">
        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-nav-item footer-item ${isActive ? 'active' : ''}`}
        >
          <Settings size={18} className="nav-icon" />
          <span>Settings</span>
        </NavLink>

        {/* Profile Menu Dropdown */}
        <div className="profile-widget-container">
          {profileMenuOpen && (
            <div className="profile-popover">
              <div className="popover-header">
                <span className="popover-title">Active Analyst Profile</span>
                <span className="popover-badge">{user?.badge}</span>
              </div>
              <div className="popover-user-details">
                <div className="popover-name">{user?.name}</div>
                <div className="popover-role">{user?.role}</div>
                <div className="popover-agency">{user?.agency}</div>
              </div>

              <div className="popover-divider" />
              <div className="popover-section-label">SWITCH INVESTIGATOR</div>
              {availableProfiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`profile-switch-btn ${user?.id === p.id ? 'active' : ''}`}
                  onClick={() => {
                    switchProfile(p.id);
                    setProfileMenuOpen(false);
                  }}
                >
                  <span className="switch-avatar">{p.avatar}</span>
                  <div className="switch-text">
                    <span className="switch-name">{p.name}</span>
                    <span className="switch-role">{p.role}</span>
                  </div>
                </button>
              ))}

              <div className="popover-divider" />
              <button
                type="button"
                className="profile-logout-btn"
                onClick={handleLogout}
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}

          <button
            type="button"
            className={`profile-trigger-btn ${profileMenuOpen ? 'open' : ''}`}
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <div className="profile-avatar">{user?.avatar || 'AI'}</div>
            <div className="profile-info">
              <span className="profile-name">{user?.name || 'Investigator'}</span>
              <span className="profile-role">{user?.badge || 'CFU'}</span>
            </div>
            <ChevronUp size={16} className={`profile-chevron ${profileMenuOpen ? 'rotate' : ''}`} />
          </button>
        </div>
      </div>
    </aside>
  );
}
