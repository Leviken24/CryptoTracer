const SEVERITY_WEIGHT = {
  high: 1,
  medium: 2,
  low: 3,
};

const FINDING_CONFIGS = {
  PEEL_CHAIN: {
    icon: '⛓️',
    title: 'Peel Chain Pattern',
    desc: 'Structured rapid multi-hop peeling used to launder funds into incremental off-ramps.',
    color: '#f97316',
  },
  MIXER_PATTERN: {
    icon: '🌪️',
    title: 'Mixer / CoinJoin Obfuscation',
    desc: 'Equal-value fan-out splitting transaction volume across unlinked addresses to break attribution.',
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
    desc: 'Micro-satoshis sent to de-anonymize wallet clustering heuristics without consent.',
    color: '#ef4444',
  },
  LOOKALIKE: {
    icon: '🎭',
    title: 'Address Poisoning / Lookalike',
    desc: 'Adversarial fake wallet spoofing first and last 4 characters of verified deposit address.',
    color: '#ec4899',
  },
  DECOY: {
    icon: '🪤',
    title: 'Decoy Dust / Noise Edge',
    desc: 'Extremely low value edge designed to poison forensic graphs with irrelevant nodes.',
    color: '#94a3b8',
  },
};

export default function FindingsPanel({ findings, onHighlightNodes }) {
  if (!findings || findings.length === 0) {
    return (
      <div className="panel-card empty-panel">
        <p>No heuristic or adversarial findings detected.</p>
      </div>
    );
  }

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
          <h3>Forensic &amp; Adversarial Findings</h3>
          <span className="panel-subtitle">Sorted by severity • Adversarial layer active</span>
        </div>
        <span className="count-badge count-findings">{findings.length} alerts</span>
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
                <span className={`severity-tag severity-${severity}`}>
                  {severity.toUpperCase()}
                </span>
              </div>

              <div className="finding-body">
                <p className="finding-text">{finding.text}</p>
                <p className="finding-rule-hint">{config.desc}</p>
              </div>

              {finding.nodes && finding.nodes.length > 0 && (
                <div className="finding-footer">
                  <span className="affected-count">
                    {finding.nodes.length} affected {finding.nodes.length === 1 ? 'node' : 'nodes'}
                  </span>
                  <span className="action-hint">Click card to highlight</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
