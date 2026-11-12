import React, { useState } from 'react';
import {
  ShieldCheck,
  Building2,
  Copy,
  Check,
  ArrowRight,
  AlertTriangle,
  FileSearch,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

function shortenAddress(addr) {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`;
}

export default function RankedTable({ ranked, onHighlightPath, selectedAddress }) {
  const [expandedIndex, setExpandedIndex] = useState(0); // expand top result by default
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [copiedTx, setCopiedTx] = useState(null);

  const handleCopy = (e, address) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 1800);
  };

  const handleCopyTx = (e, txid) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(txid);
    setCopiedTx(txid);
    setTimeout(() => setCopiedTx(null), 1800);
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

  const getEvidenceStrengthClass = (strength) => {
    const s = (strength || '').toLowerCase();
    if (s.includes('strong')) return 'strength-strong';
    if (s.includes('moderate')) return 'strength-moderate';
    return 'strength-low';
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
          <h3>Ranked Probable End-Receivers</h3>
          <span className="panel-subtitle">
            Prioritized destinations, evidence strength &amp; recommended subpoena actions
          </span>
        </div>
        <span className="count-badge">{ranked.length} destinations</span>
      </div>

      <div className="ranked-list">
        {ranked.map((item, idx) => {
          const isSelected = selectedAddress === item.address;
          const isExpanded = expandedIndex === idx;
          const confPercent = Math.round((item.confidence || 0) * 100);
          const riskScore = item.risk || 0;
          const rankNum = item.rank || idx + 1;

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
                <div className="rank-badge">#{rankNum}</div>

                <div className="address-column">
                  <div className="address-row">
                    <span className="address-text code-font" title={item.address}>
                      {shortenAddress(item.address)}
                    </span>
                    <button
                      type="button"
                      className="btn-copy"
                      onClick={(e) => handleCopy(e, item.address)}
                      title="Copy full wallet address"
                    >
                      {copiedAddress === item.address ? '✓ Copied' : 'Copy'}
                    </button>

                    {item.entity_label && (
                      <span className="entity-label-pill" title={`Source: ${item.label_source || 'Verified Intelligence'}`}>
                        <Building2 size={12} />
                        <span>{item.entity_label}</span>
                      </span>
                    )}

                    {item.evidence_strength && (
                      <span
                        className={`evidence-strength-tag ${getEvidenceStrengthClass(item.evidence_strength)}`}
                        title="Evidence confidence based on direct transfer concentration"
                      >
                        {item.evidence_strength}
                      </span>
                    )}
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
                          backgroundColor:
                            confPercent > 80 ? '#38bdf8' : confPercent > 50 ? '#818cf8' : '#94a3b8',
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
                  {/* Forensic Reasoning */}
                  <div className="reasoning-section">
                    <span className="section-label">Forensic Attribution Reasoning:</span>
                    <ul className="reasoning-bullets">
                      {(item.reasoning || []).map((reason, rIdx) => (
                        <li key={rIdx}>{reason}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Suggested Next Action */}
                  {item.suggested_action && (
                    <div className="suggested-action-box">
                      <div className="action-box-header">
                        <FileSearch size={14} className="action-icon" />
                        <strong>Suggested Investigative Next Action:</strong>
                      </div>
                      <p className="action-box-text">{item.suggested_action}</p>
                    </div>
                  )}

                  {/* Supporting Relevant Transactions */}
                  {item.relevant_txs && item.relevant_txs.length > 0 && (
                    <div className="relevant-txs-section">
                      <span className="section-label">Supporting Ingress Transactions:</span>
                      <div className="relevant-tx-chips">
                        {item.relevant_txs.map((txid) => (
                          <button
                            key={txid}
                            type="button"
                            className="btn-tx-chip code-font"
                            onClick={(e) => handleCopyTx(e, txid)}
                            title={`Click to copy: ${txid}`}
                          >
                            <span>{txid.slice(0, 10)}...{txid.slice(-6)}</span>
                            {copiedTx === txid ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Risk Component Breakdown */}
                  {item.risk_breakdown && (
                    <div className="breakdown-section">
                      <span className="section-label">Cyber-Risk Factor Decomposition:</span>
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

                  {/* Legal Attribution Disclaimer */}
                  <div className="ranked-legal-notice">
                    <AlertTriangle size={13} className="notice-icon" />
                    <span>
                      {item.legal_disclaimer ||
                        'Probabilistic destination attribution based on ledger heuristics. Off-chain subpoena to exchange/VASP compliance is mandatory to confirm real-world customer identity.'}
                    </span>
                  </div>

                  {/* Action Bar */}
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
