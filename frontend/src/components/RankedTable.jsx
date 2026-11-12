import { useState } from 'react';

function shortenAddress(addr) {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function RankedTable({ ranked, onHighlightPath, selectedAddress }) {
  const [expandedIndex, setExpandedIndex] = useState(0); // expand top result by default
  const [copiedAddress, setCopiedAddress] = useState(null);

  const handleCopy = (e, address) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1800);
  };

  const toggleExpand = (idx) => {
    setExpandedIndex(expandedIndex === idx ? null : idx);
  };

  const getRiskBadgeClass = (score) => {
    if (score >= 80) return 'badge-risk-critical';
    if (score >= 60) return 'badge-risk-high';
    if (score >= 40) return 'badge-risk-medium';
    return 'badge-risk-low';
  };

  if (!ranked || ranked.length === 0) {
    return (
      <div className="panel-card empty-panel">
        <p>No ranked end-receivers identified yet.</p>
      </div>
    );
  }

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>Ranked End-Receivers</h3>
          <span className="panel-subtitle">Probabilistic attribution &amp; cyber risk</span>
        </div>
        <span className="count-badge">{ranked.length} wallets</span>
      </div>

      <div className="ranked-list">
        {ranked.map((item, idx) => {
          const isSelected = selectedAddress === item.address;
          const isExpanded = expandedIndex === idx;
          const confPercent = Math.round((item.confidence || 0) * 100);
          const riskScore = item.risk || 0;

          return (
            <div
              key={item.address || idx}
              className={`ranked-item-card ${isSelected ? 'selected' : ''}`}
              onClick={() => {
                if (onHighlightPath) {
                  onHighlightPath(item.critical_path || [item.address], item.address);
                }
              }}
            >
              <div className="ranked-item-main">
                <div className="rank-badge">#{idx + 1}</div>

                <div className="address-column">
                  <div className="address-row">
                    <span className="address-text" title={item.address}>
                      {shortenAddress(item.address)}
                    </span>
                    <button
                      type="button"
                      className="btn-copy"
                      onClick={(e) => handleCopy(e, item.address)}
                      title="Copy full Bitcoin address"
                    >
                      {copiedAddress === item.address ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="confidence-wrapper">
                    <div className="confidence-label">
                      <span>Attribution Confidence</span>
                      <strong>{confPercent}%</strong>
                    </div>
                    <div className="progress-bar-bg">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${confPercent}%`,
                          backgroundColor: confPercent > 80 ? '#38bdf8' : confPercent > 50 ? '#818cf8' : '#94a3b8',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="risk-column">
                  <div className={`risk-pill ${getRiskBadgeClass(riskScore)}`}>
                    Risk: {riskScore}/100
                  </div>
                  <button
                    type="button"
                    className="btn-expand-details"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(idx);
                    }}
                  >
                    {isExpanded ? 'Hide Details ▲' : 'Inspect ▼'}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="ranked-item-expanded" onClick={(e) => e.stopPropagation()}>
                  <div className="reasoning-section">
                    <span className="section-label">Forensic Attribution Reasoning:</span>
                    <ul className="reasoning-bullets">
                      {(item.reasoning || []).map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  {item.risk_breakdown && (
                    <div className="breakdown-section">
                      <span className="section-label">Cyber-Risk Component Breakdown:</span>
                      <div className="breakdown-grid">
                        {Object.entries(item.risk_breakdown).map(([factor, val]) => {
                          const pct = Math.round(val * 100);
                          return (
                            <div key={factor} className="breakdown-row">
                              <span className="factor-name">{factor.replace('_', ' ')}:</span>
                              <div className="factor-bar-bg">
                                <div className="factor-bar-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="factor-val">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="action-row">
                    <button
                      type="button"
                      className="btn-path-focus"
                      onClick={() => {
                        if (onHighlightPath) {
                          onHighlightPath(item.critical_path || [item.address], item.address);
                        }
                      }}
                    >
                      ⚡ Highlight Full Trail On Graph
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
