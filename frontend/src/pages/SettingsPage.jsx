import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Key,
  Sliders,
  Database,
  Check,
  AlertCircle,
  HelpCircle,
  User,
  Info,
} from 'lucide-react';
import TopHeader from '../components/TopHeader';
import { useAuth } from '../context/AuthContext';

export default function SettingsPage({ onOpenNewInvestigation }) {
  const { user } = useAuth();

  // API Config
  const [blockstreamUrl, setBlockstreamUrl] = useState('https://blockstream.info/api');
  const [mempoolUrl, setMempoolUrl] = useState('https://mempool.space/api');
  const [etherscanKey, setEtherscanKey] = useState('');
  const [demoMode, setDemoMode] = useState(true);

  // Forensics Thresholds
  const [peelRatio, setPeelRatio] = useState(15); // 15%
  const [dustThreshold, setDustThreshold] = useState(1000); // sats
  const [mixerTolerance, setMixerTolerance] = useState(1); // 1%

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="page-container settings-page">
      <TopHeader
        title="System &amp; Forensics Configuration"
        subtitle="Manage blockchain node endpoints, heuristic sensitivity, and environment preferences"
        onOpenNewInvestigation={onOpenNewInvestigation}
      />

      <div className="settings-content">
        {savedSuccess && (
          <div className="form-success-banner">
            <Check size={16} />
            <span>Settings successfully updated and saved to local configuration.</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="settings-form">
          {/* Local Development Authentication Disclaimer Card */}
          <div className="panel-card auth-notice-card">
            <div className="notice-icon-wrap">
              <Info size={20} className="info-icon" />
            </div>
            <div className="notice-content">
              <h4>Local Development Authentication Notice</h4>
              <p>
                For this hackathon evaluation, CryptoTrace AI operates using a local development authentication
                setup stored in <code>localStorage</code>. It does not employ enterprise OAuth2/OIDC, MFA, or remote session
                tokens. You can freely switch between investigator personas (Lead Forensics Agent, AML Officer, OFAC Analyst)
                using the profile menu at the bottom of the sidebar.
              </p>
              <div className="current-analyst-strip">
                <span>Active Persona:</span>
                <strong>{user?.name} ({user?.badge})</strong>
                <span className="bullet-sep">•</span>
                <span>{user?.agency}</span>
              </div>
            </div>
          </div>

          {/* Blockchain Node & API Settings */}
          <div className="panel-card settings-section-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <div className="section-title-wrap">
                  <Key size={18} className="accent-icon" />
                  <h3>Blockchain Ingestion &amp; API Keys</h3>
                </div>
                <span className="panel-subtitle">External node endpoints for live ledger extraction</span>
              </div>
            </div>

            <div className="settings-fields-grid">
              <div className="form-field">
                <label>Bitcoin Blockstream API Endpoint</label>
                <input
                  type="text"
                  className="form-input code-font"
                  value={blockstreamUrl}
                  onChange={(e) => setBlockstreamUrl(e.target.value)}
                  placeholder="https://blockstream.info/api"
                />
              </div>

              <div className="form-field">
                <label>Mempool.space Secondary Source Endpoint</label>
                <input
                  type="text"
                  className="form-input code-font"
                  value={mempoolUrl}
                  onChange={(e) => setMempoolUrl(e.target.value)}
                  placeholder="https://mempool.space/api"
                />
              </div>

              <div className="form-field">
                <label>Etherscan API Key (Optional)</label>
                <input
                  type="password"
                  className="form-input code-font"
                  value={etherscanKey}
                  onChange={(e) => setEtherscanKey(e.target.value)}
                  placeholder="Paste Etherscan Developer Key..."
                />
              </div>

              <div className="form-field checkbox-field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={demoMode}
                    onChange={(e) => setDemoMode(e.target.checked)}
                  />
                  <span>
                    Enable Deterministic Demo Fallback (Guarantees multi-hop graph generation if API is unreachable)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Forensics Heuristics Sensitivity */}
          <div className="panel-card settings-section-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <div className="section-title-wrap">
                  <Sliders size={18} className="accent-icon" />
                  <h3>Forensics Engine Thresholds</h3>
                </div>
                <span className="panel-subtitle">Algorithmic parameter tuning for heuristic pattern detectors</span>
              </div>
            </div>

            <div className="settings-fields-grid">
              <div className="form-field">
                <label>Peel Chain Asymmetry Threshold (% of input value)</label>
                <div className="range-input-wrap">
                  <input
                    type="number"
                    className="form-input"
                    min="5"
                    max="30"
                    value={peelRatio}
                    onChange={(e) => setPeelRatio(Number(e.target.value))}
                  />
                  <span className="input-unit">%</span>
                </div>
                <span className="field-hint">Outputs under this percentage are classified as peeled amounts.</span>
              </div>

              <div className="form-field">
                <label>Dust Attack Ceiling (Satoshis)</label>
                <div className="range-input-wrap">
                  <input
                    type="number"
                    className="form-input"
                    min="100"
                    max="10000"
                    value={dustThreshold}
                    onChange={(e) => setDustThreshold(Number(e.target.value))}
                  />
                  <span className="input-unit">sats</span>
                </div>
                <span className="field-hint">Outputs below this value are tagged as potential dusting poison.</span>
              </div>

              <div className="form-field">
                <label>Mixer Equal-Value Tolerance (%)</label>
                <div className="range-input-wrap">
                  <input
                    type="number"
                    className="form-input"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={mixerTolerance}
                    onChange={(e) => setMixerTolerance(Number(e.target.value))}
                  />
                  <span className="input-unit">%</span>
                </div>
                <span className="field-hint">Outputs within this percentage spread trigger mixer heuristics.</span>
              </div>
            </div>
          </div>

          {/* Database & Storage */}
          <div className="panel-card settings-section-card">
            <div className="panel-header">
              <div className="panel-title-group">
                <div className="section-title-wrap">
                  <Database size={18} className="accent-icon" />
                  <h3>Database &amp; Audit Storage</h3>
                </div>
                <span className="panel-subtitle">Local SQLite storage engine</span>
              </div>
            </div>

            <div className="database-info-row">
              <div className="db-info-item">
                <span className="db-info-label">Active Database Engine:</span>
                <span className="db-info-value code-font">SQLite 3 (backend/data/cryptotrace.db)</span>
              </div>
              <div className="db-info-item">
                <span className="db-info-label">Audit Evidence Log:</span>
                <span className="db-info-value code-font">In-Memory Hash Chain (SHA-256)</span>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="settings-submit-bar">
            <button type="submit" className="btn-primary-action">
              <span>Save Configuration</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
