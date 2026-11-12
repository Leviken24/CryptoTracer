import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  Calculator,
  AlertTriangle,
  Info,
  Check,
  Copy,
  ExternalLink,
  Percent,
} from 'lucide-react';

export default function RiskBreakdownModal({ isOpen, onClose, compositeRisk, riskScore }) {
  const [copiedTx, setCopiedTx] = useState(null);

  if (!isOpen) return null;

  const data = compositeRisk || {
    risk_score: riskScore || 0,
    risk_category: riskScore >= 80 ? 'Critical' : riskScore >= 60 ? 'High' : riskScore >= 40 ? 'Medium' : 'Low',
    formula: 'Score = min(100, Base Taint + Peel Pattern + Mixer Obfuscation + Poisoning Anomaly + Counterparty Exposure)',
    triggered_indicators: [],
    supporting_transactions: [],
    disclaimer:
      'Heuristic scoring indicates behavioral similarity to known money laundering topologies. It does NOT constitute scientific proof of criminal intent without off-chain corroborated evidence.',
  };

  const handleCopy = (tx) => {
    navigator.clipboard?.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  const getCategoryClass = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'critical':
        return 'cat-critical';
      case 'high':
        return 'cat-high';
      case 'medium':
        return 'cat-medium';
      default:
        return 'cat-low';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog risk-modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Calculator size={18} />
            </div>
            <div>
              <h3>Explainable Cyber-Risk Scoring Model</h3>
              <p className="modal-subtitle">Mathematical derivation and triggered forensic heuristics</p>
            </div>
          </div>
          <button type="button" className="btn-modal-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body-scroll">
          {/* Top Score Banner */}
          <div className="risk-score-overview-box">
            <div className="score-big-display">
              <span className="score-big-number">{data.risk_score}</span>
              <span className="score-total">/100</span>
            </div>
            <div className="score-details-col">
              <div className="score-badge-row">
                <span className={`risk-category-badge ${getCategoryClass(data.risk_category)}`}>
                  {data.risk_category?.toUpperCase()} RISK CATEGORY
                </span>
                <span className="indicator-count-badge">
                  {data.triggered_indicators?.length || 0} Indicators Triggered
                </span>
              </div>
              <p className="score-explanation">
                Derived transparently from topological graph features, peel chain hop metrics, equal-denomination fan-outs, and poisoning detectors.
              </p>
            </div>
          </div>

          {/* Formula Card */}
          <div className="risk-section-card">
            <h4 className="section-title">
              <Calculator size={14} />
              <span>Scoring Formula &amp; Bounded Aggregation</span>
            </h4>
            <div className="formula-code-box code-font">
              {data.formula}
            </div>
            <p className="formula-footnote">
              * Individual indicator weights are summed and capped at a maximum ceiling of 100 to prevent artificial inflation from overlapping topological patterns.
            </p>
          </div>

          {/* Triggered Indicators */}
          <div className="risk-section-card">
            <h4 className="section-title">
              <ShieldAlert size={14} />
              <span>Triggered Forensics &amp; Heuristic Contributions</span>
            </h4>
            {data.triggered_indicators && data.triggered_indicators.length > 0 ? (
              <div className="indicators-table-wrapper">
                <table className="indicators-table">
                  <thead>
                    <tr>
                      <th>Forensic Indicator</th>
                      <th>Category</th>
                      <th>Points</th>
                      <th>Evidence Rationale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.triggered_indicators.map((ind, idx) => (
                      <tr key={idx}>
                        <td className="indicator-name-cell">
                          <strong>{ind.indicator}</strong>
                        </td>
                        <td>
                          <span className="category-pill-sm">{ind.category || 'Heuristic'}</span>
                        </td>
                        <td className="points-cell">
                          <span className="points-tag">+{ind.points} pts</span>
                        </td>
                        <td className="evidence-cell">
                          {ind.evidence || ind.rationale || 'Topological match detected in transaction trail.'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-subtext">No elevated risk indicators triggered for this ledger graph.</div>
            )}
          </div>

          {/* Supporting Transactions */}
          {data.supporting_transactions && data.supporting_transactions.length > 0 && (
            <div className="risk-section-card">
              <h4 className="section-title">
                <Info size={14} />
                <span>Supporting Transaction Citations</span>
              </h4>
              <div className="supporting-tx-grid">
                {data.supporting_transactions.map((txid) => (
                  <button
                    key={txid}
                    type="button"
                    className="btn-tx-citation code-font"
                    onClick={() => handleCopy(txid)}
                    title="Click to copy full transaction ID"
                  >
                    <span>{txid.slice(0, 14)}...{txid.slice(-8)}</span>
                    {copiedTx === txid ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Legal / Non-Attribution Disclaimer */}
          <div className="risk-disclaimer-card">
            <AlertTriangle size={18} className="disclaimer-icon" />
            <div>
              <strong>Forensic Science &amp; Legal Attribution Notice:</strong>
              <p>
                {data.disclaimer ||
                  'Heuristic risk scoring assesses behavioral patterns for investigative prioritization. It does not establish legal ownership, mens rea, or real-world human identity. Official judicial actions require off-chain subpoenas to Virtual Asset Service Providers (VASPs).'}
              </p>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-dismiss" onClick={onClose}>
            Close Score Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
