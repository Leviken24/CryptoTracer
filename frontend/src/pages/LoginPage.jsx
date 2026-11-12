import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, ArrowRight, UserCheck, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, availableProfiles } = useAuth();
  const navigate = useNavigate();

  const [customName, setCustomName] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [badgeId, setBadgeId] = useState('');

  const handleSelectProfile = (profile) => {
    login(profile);
    navigate('/');
  };

  const handleCustomLogin = (e) => {
    e.preventDefault();
    login({
      id: `usr_${Date.now()}`,
      name: customName.trim() || 'Forensic Investigator',
      email: `${(customName.trim() || 'investigator').toLowerCase().replace(/\s+/g, '.')}@cryptotrace.ai`,
      role: customRole.trim() || 'Cyber Crime Analyst',
      badge: badgeId.trim() || 'CT-9999',
      agency: 'Cyber Intelligence Group',
      avatar: (customName.trim() || 'CI').slice(0, 2).toUpperCase(),
    });
    navigate('/');
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Brand Header */}
        <div className="login-brand-header">
          <div className="brand-logo-badge large">
            <Shield className="brand-icon-svg" size={26} />
          </div>
          <h1>CryptoTrace<span className="brand-ai-badge">AI</span></h1>
          <p className="login-subtext">Blockchain Forensics &amp; Cybersecurity Decision-Support System</p>
        </div>

        {/* Hackathon Disclaimer Banner */}
        <div className="login-disclaimer-box">
          <Info size={16} className="info-icon" />
          <div className="disclaimer-text">
            <strong>Hackathon Local Demo Mode:</strong>
            <span>
              Authentication uses local persistent storage. Select any investigator persona below for instant access.
            </span>
          </div>
        </div>

        {/* Quick Analyst Selection */}
        <div className="analyst-picker-section">
          <span className="section-title-label">CHOOSE INVESTIGATOR PERSONA</span>
          <div className="analyst-buttons-stack">
            {availableProfiles.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn-analyst-persona"
                onClick={() => handleSelectProfile(p)}
              >
                <div className="persona-avatar">{p.avatar}</div>
                <div className="persona-info">
                  <span className="persona-name">{p.name}</span>
                  <span className="persona-role">{p.role} • {p.badge}</span>
                </div>
                <ArrowRight size={16} className="arrow-icon" />
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="login-or-divider">
          <span>OR SIGN IN AS GUEST ANALYST</span>
        </div>

        {/* Custom Login Form */}
        <form onSubmit={handleCustomLogin} className="custom-login-form">
          <div className="form-field">
            <label>Analyst Name</label>
            <input
              type="text"
              className="form-input"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="e.g. Special Agent John Miller"
            />
          </div>

          <div className="form-field">
            <label>Role / Agency</label>
            <input
              type="text"
              className="form-input"
              value={customRole}
              onChange={(e) => setCustomRole(e.target.value)}
              placeholder="e.g. Major Crimes Detective / AML Specialist"
            />
          </div>

          <button type="submit" className="btn-login-submit">
            <UserCheck size={16} />
            <span>Enter Forensics Console</span>
          </button>
        </form>
      </div>
    </div>
  );
}
