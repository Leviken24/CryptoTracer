import { useState } from 'react';

function shortenAddress(addr) {
  if (!addr || addr.length <= 16) return addr || '';
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

export default function AddressDossier({ nodeData, rankedItem, onHighlightTrail, onPrintReport }) {
  const [copied, setCopied] = useState(false);
  const [activeDossierTab, setActiveDossierTab] = useState('source'); // 'source' | 'transactions' | 'cluster'

  if (!nodeData && !rankedItem) {
    return (
      <div className="panel-card empty-panel dossier-empty">
        <div className="empty-icon-pulse">🔍</div>
        <p><strong>Select a Node on the Graph</strong></p>
        <span className="text-muted">Click any wallet or ranked item to view deep AML intelligence &amp; risk attribution.</span>
      </div>
    );
  }

  const address = nodeData?.id || rankedItem?.address;
  const label = nodeData?.label || (rankedItem ? 'ExchangeX Deposit' : 'Not Identified');
  const tags = nodeData?.tags || [];
  const taintPercent = Math.round(((nodeData?.taint ?? rankedItem?.taint_share) || 0) * 100);
  const riskScore = nodeData?.risk ?? rankedItem?.risk ?? 65;

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard?.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getRiskColor = (score) => {
    if (score >= 80) return '#ef4444'; // Red
    if (score >= 60) return '#f97316'; // Orange
    if (score >= 40) return '#eab308'; // Yellow
    return '#10b981'; // Green
  };

  const riskColor = getRiskColor(riskScore);

  // SVG Donut calculation
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (riskScore / 100) * circumference;

  return (
    <div className="panel-card dossier-card">
      <div className="dossier-header">
        <div className="dossier-title-area">
          <h3>Address Intelligence Dossier</h3>
          <span className="dossier-tag-pill">AML / CFT Forensic Profile</span>
        </div>
        <div className="dossier-quick-actions">
          <button
            type="button"
            className="btn-dossier-action"
            onClick={onHighlightTrail}
            title="Highlight full money trail from ransom source"
          >
            ⚡ Highlight Trail
          </button>
        </div>
      </div>

      <div className="dossier-address-box">
        <div className="meta-field">
          <span className="meta-label">ADDRESS:</span>
          <div className="address-display-row">
            <span className="address-hash" title={address}>
              {shortenAddress(address)}
            </span>
            <button type="button" className="btn-copy-small" onClick={handleCopy}>
              {copied ? '✓ Copied' : '📋 Copy'}
            </button>
          </div>
        </div>

        <div className="meta-row-two-col">
          <div className="meta-field">
            <span className="meta-label">IDENTIFIED ENTITY / OWNER:</span>
            <span className="meta-value-highlight">
              {label || 'Unlabeled Private Wallet'}
            </span>
          </div>

          <div className="meta-field">
            <span className="meta-label">CLUSTER IDENTIFIER:</span>
            <span className="meta-value mono">{nodeData?.cluster || 'Cluster c4 (Heuristic)'}</span>
          </div>
        </div>

        <div className="meta-field">
          <span className="meta-label">FORENSIC TAGS:</span>
          <div className="tags-flex-wrap">
            {tags.length > 0 ? (
              tags.map((t, i) => (
                <span key={i} className={`entity-tag tag-${t.toLowerCase()}`}>
                  {t}
                </span>
              ))
            ) : (
              <span className="entity-tag tag-intermediary">INTERMEDIARY_HOP</span>
            )}
            {taintPercent > 0 && (
              <span className="entity-tag tag-taint">
                {taintPercent}% TAINT
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Dossier Tabs matching Image 5 */}
      <div className="dossier-tabs-nav">
        <button
          type="button"
          className={`dossier-tab-btn ${activeDossierTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveDossierTab('source')}
        >
          Source of Funds &amp; Risk
        </button>
        <button
          type="button"
          className={`dossier-tab-btn ${activeDossierTab === 'reasoning' ? 'active' : ''}`}
          onClick={() => setActiveDossierTab('reasoning')}
        >
          Forensic Attribution
        </button>
      </div>

      {activeDossierTab === 'source' && (
        <div className="dossier-tab-body">
          {/* Risk Gauge Donut matching Image 5 */}
          <div className="risk-donut-container">
            <div className="donut-graphic-wrapper">
              <svg width="110" height="110" viewBox="0 0 110 110" className="donut-svg">
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="transparent"
                  stroke="#1e293b"
                  strokeWidth="12"
                />
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  fill="transparent"
                  stroke={riskColor}
                  strokeWidth="12"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  transform="rotate(-90 55 55)"
                  style={{ transition: 'stroke-dashoffset 0.8s ease' }}
                />
              </svg>
              <div className="donut-center-label">
                <span className="donut-score-text" style={{ color: riskColor }}>
                  {riskScore}
                </span>
                <span className="donut-caption">Risk Score</span>
              </div>
            </div>

            <div className="risk-details-breakdown">
              <div className="risk-header-line">
                <span className="risk-rating-title" style={{ color: riskColor }}>
                  {riskScore >= 80 ? 'CRITICAL AML RISK' : riskScore >= 60 ? 'HIGH RISK' : 'MODERATE RISK'}
                </span>
                <span className="taint-share-badge">
                  Taint: {taintPercent}%
                </span>
              </div>
              <p className="risk-sub-desc">
                Proportional tainted volume originating from extortion ransom deposit.
              </p>
            </div>
          </div>

          {/* Breakdown bars matching Image 5 */}
          <div className="source-of-funds-list">
            <div className="source-row">
              <span className="source-name">Mixing Service Exposure</span>
              <div className="source-bar-wrapper">
                <div className="source-bar-fill fill-mixer" style={{ width: '85%' }} />
              </div>
              <span className="source-percent">85%</span>
            </div>

            <div className="source-row">
              <span className="source-name">Ransomware Flow</span>
              <div className="source-bar-wrapper">
                <div className="source-bar-fill fill-ransom" style={{ width: `${taintPercent || 80}%` }} />
              </div>
              <span className="source-percent">{taintPercent || 80}%</span>
            </div>

            <div className="source-row">
              <span className="source-name">Peel Chain Depth</span>
              <div className="source-bar-wrapper">
                <div className="source-bar-fill fill-peel" style={{ width: '100%' }} />
              </div>
              <span className="source-percent">5 Hops</span>
            </div>

            <div className="source-row">
              <span className="source-name">Adversarial Proximity</span>
              <div className="source-bar-wrapper">
                <div className="source-bar-fill fill-adv" style={{ width: '40%' }} />
              </div>
              <span className="source-percent">40%</span>
            </div>
          </div>

          {/* AML Alert banner matching Image 5 */}
          <div className="aml-alert-banner">
            <span className="aml-alert-icon">⚠️</span>
            <div className="aml-alert-text">
              <strong>AML RISK DETECTED</strong>
              <p>Address received {taintPercent || 67.2}% funds from flagged ransomware laundering trail.</p>
            </div>
          </div>

          <div className="dossier-actions-row">
            <button type="button" className="btn-dossier-action-btn btn-secondary-dossier" onClick={onHighlightTrail}>
              ⚡ Highlight Full Trail
            </button>
            <button type="button" className="btn-dossier-action-btn btn-primary-dossier" onClick={onPrintReport}>
              🖨️ Get Full Report
            </button>
          </div>
        </div>
      )}

      {activeDossierTab === 'reasoning' && (
        <div className="dossier-tab-body">
          <ul className="dossier-bullets">
            {(rankedItem?.reasoning || [
              `Direct recipient in 5-hop structured laundering trail`,
              `Holds ${taintPercent}% proportional taint from primary ransom wallet`,
              `Identified as custodial off-ramp requiring SAR/AML preservation notice`,
            ]).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
