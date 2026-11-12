import React, { useState } from 'react';
import {
  AlertTriangle,
  Copy,
  Check,
  ShieldAlert,
  GitCommit,
  Info,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

const SEVERITY_WEIGHT = {
  high: 1,
  medium: 2,
  low: 3,
};

const FINDING_CONFIGS = {
  PEEL_CHAIN: {
    icon: '⛓️',
    title: 'Peel-Chain Structuring Pattern',
    desc: 'Structured rapid multi-hop peeling where a wallet sends the vast majority of balance downstream while peeling small off-ramps (<15%) to change addresses.',
    color: '#f97316',
  },
  MIXER_PATTERN: {
    icon: '🌪️',
    title: 'Mixer / CoinJoin Obfuscation',
    desc: 'Equal-denomination multi-output fan-out splitting transaction volume across unlinked addresses to break attribution.',
    color: '#eab308',
  },
  FAN_OUT: {
    icon: '🔱',
    title: 'High Fan-Out Dispersion',
    desc: 'Rapid splitting into 8+ outputs to evade simple linear heuristics.',
    color: '#f59e0b',
  },
  FAN_IN: {
    icon: '🧲',
    title: 'Fan-In Consolidation',
    desc: 'Aggregating unspent outputs from multiple intermediary hops prior to off-ramping.',
    color: '#38bdf8',
  },
  DUSTING: {
    icon: '💨',
    title: 'Adversarial Dusting Attack',
    desc: 'Micro-satoshis sent to de-anonymize wallet clustering heuristics without user consent.',
    color: '#ef4444',
  },
  LOOKALIKE: {
    icon: '🎭',
    title: 'Look-Alike Address Poisoning',
    desc: 'Adversarial spoof address mirroring the initial and trailing 4 characters of a verified counterparty.',
    color: '#ec4899',
  },
  DECOY: {
    icon: '🪤',
    title: 'Decoy Dust / Graph Poisoning Edge',
    desc: 'Extremely low value edge designed to poison forensic graphs with irrelevant noise nodes.',
    color: '#94a3b8',
  },
};

export default function FindingsPanel({ findings, onHighlightNodes }) {
  const [copiedTx, setCopiedTx] = useState(null);

  if (!findings || findings.length === 0) {
    return (
      <div className="panel-card empty-panel">
        <p>No heuristic or adversarial findings detected.</p>
      </div>
    );
  }

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  // Sort by severity: high first, then medium, then low
  const sortedFindings = [...findings].sort((a, b) => {
    const wA = SEVERITY_WEIGHT[a.severity?.toLowerCase()] || 4;
    const wB = SEVERITY_WEIGHT[b.severity?.toLowerCase()] || 4;
    return wA - wB;
  });

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>Forensic Intelligence &amp; Pattern Detection</h3>
          <span className="panel-subtitle">
            Heuristic rules, adversarial detection &amp; peel-chain analysis
          </span>
        </div>
        <span className="count-badge count-findings">{findings.length} detections</span>
      </div>

      <div className="findings-grid">
        {sortedFindings.map((finding, idx) => {
          const config = FINDING_CONFIGS[finding.type] || {
            icon: '⚠️',
            title: finding.type || 'Detection Alert',
            desc: 'Forensic heuristic trigger.',
            color: '#64748b',
          };
          const severity = (finding.severity || 'medium').toLowerCase();
          const confidencePct = finding.confidence ? Math.round(finding.confidence * 100) : null;

          return (
            <div
              key={idx}
              className={`finding-card severity-${severity}`}
              onClick={() => {
                if (onHighlightNodes && finding.nodes && finding.nodes.length > 0) {
                  onHighlightNodes(finding.nodes);
                }
              }}
            >
              <div className="finding-top-bar">
                <span className="finding-type-tag">
                  <span className="finding-icon">{config.icon}</span>
                  <strong>{config.title}</strong>
                </span>

                <div className="finding-badges-right">
                  {confidencePct !== null && (
                    <span className="confidence-pill" title="Heuristic detection confidence">
                      Conf: {confidencePct}%
                    </span>
                  )}
                  <span className={`severity-tag severity-${severity}`}>
                    {severity.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="finding-body">
                <p className="finding-text">{finding.text}</p>
                <p className="finding-rule-hint">{config.desc}</p>
              </div>

              {/* Peel Chain Details */}
              {finding.type === 'PEEL_CHAIN' && finding.steps && (
                <div className="finding-extra-details peel-details">
                  <div className="peel-metric-row">
                    <span className="peel-metric-label">Suspected Peel Steps:</span>
                    <span className="peel-metric-value">{finding.steps} Sequential Hops</span>
                  </div>
                  {finding.path && finding.path.length > 0 && (
                    <div className="peel-path-strip">
                      <span className="peel-strip-label">Chain Path:</span>
                      <div className="peel-hop-flow">
                        {finding.path.map((addr, pIdx) => (
                          <React.Fragment key={pIdx}>
                            <span className="peel-hop-node code-font" title={addr}>
                              {addr.slice(0, 6)}...{addr.slice(-4)}
                            </span>
                            {pIdx < finding.path.length - 1 && (
                              <ChevronRight size={12} className="peel-flow-arrow" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mixer Warning Notice */}
              {finding.type === 'MIXER_PATTERN' && (
                <div className="mixer-warning-notice">
                  <AlertTriangle size={14} className="mixer-warning-icon" />
                  <span>
                    <strong>Forensic Notice:</strong> Mixer interaction indicates obfuscation attempt, but alone does NOT prove criminal guilt or establish deterministic source-to-destination link.
                  </span>
                </div>
              )}

              {/* Supporting Transaction Hashes */}
              {finding.supporting_txs && finding.supporting_txs.length > 0 && (
                <div className="finding-supporting-txs">
                  <span className="txs-header">Supporting Transaction Citations:</span>
                  <div className="tx-chips-flow">
                    {finding.supporting_txs.slice(0, 4).map((txid) => (
                      <button
                        key={txid}
                        type="button"
                        className="btn-finding-tx code-font"
                        onClick={(e) => handleCopy(e, txid)}
                        title={`Copy tx: ${txid}`}
                      >
                        <span>{txid.slice(0, 8)}...{txid.slice(-4)}</span>
                        {copiedTx === txid ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Disclaimers if any */}
              {finding.disclaimer && (
                <div className="finding-disclaimer-subtext">
                  <Info size={11} />
                  <span>{finding.disclaimer}</span>
                </div>
              )}

              {finding.nodes && finding.nodes.length > 0 && (
                <div className="finding-footer">
                  <span className="affected-count">
                    {finding.nodes.length} affected {finding.nodes.length === 1 ? 'cluster node' : 'cluster nodes'}
                  </span>
                  <span className="action-hint">Click card to highlight nodes on graph</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
