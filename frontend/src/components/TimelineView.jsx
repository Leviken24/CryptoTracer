import React, { useState } from 'react';
import {
  Clock,
  ArrowRight,
  ShieldAlert,
  Layers,
  Shuffle,
  Building2,
  Copy,
  Check,
  Filter,
  ExternalLink,
  Split,
  GitMerge,
} from 'lucide-react';

const EVENT_CONFIG = {
  INITIAL_TRANSACTION: {
    icon: Layers,
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
    label: 'Root Inflow',
  },
  WALLET_SPLITTING: {
    icon: Split,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    label: 'Fan-Out Splitting',
  },
  WALLET_CONSOLIDATION: {
    icon: GitMerge,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    label: 'Consolidation',
  },
  PEEL_CHAIN_STEP: {
    icon: Shuffle,
    color: '#f97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
    label: 'Peel Hop',
  },
  EXCHANGE_INTERACTION: {
    icon: Building2,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    label: 'Exchange Ingress',
  },
  SUSPICIOUS_ALERT: {
    icon: ShieldAlert,
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    label: 'Forensic Alert',
  },
  LEDGER_TRANSFER: {
    icon: ArrowRight,
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    label: 'Ledger Hop',
  },
};

export default function TimelineView({ timeline, onSelectTx }) {
  const [filterType, setFilterType] = useState('ALL'); // ALL | TRANSFERS | ALERTS | HIGH
  const [copiedTx, setCopiedTx] = useState(null);

  if (!timeline || timeline.length === 0) {
    return (
      <div className="panel-card empty-panel">
        <Clock size={32} className="text-muted" style={{ marginBottom: 12 }} />
        <p>No chronological events recorded for this timeline.</p>
      </div>
    );
  }

  const handleCopy = (e, text) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(text);
    setCopiedTx(text);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  const filteredEvents = timeline.filter((evt) => {
    if (filterType === 'TRANSFERS') {
      return evt.event_type !== 'SUSPICIOUS_ALERT';
    }
    if (filterType === 'ALERTS') {
      return evt.event_type === 'SUSPICIOUS_ALERT';
    }
    if (filterType === 'HIGH') {
      return evt.severity === 'high' || evt.event_type === 'EXCHANGE_INTERACTION';
    }
    return true;
  });

  return (
    <div className="panel-card timeline-panel">
      <div className="panel-header">
        <div className="panel-title-group">
          <h3>Forensic Investigation Timeline</h3>
          <span className="panel-subtitle">
            Chronological reconstruction of on-chain fund flows and detector triggers
          </span>
        </div>

        <div className="timeline-filter-buttons">
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterType('ALL')}
          >
            All Events ({timeline.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'TRANSFERS' ? 'active' : ''}`}
            onClick={() => setFilterType('TRANSFERS')}
          >
            Ledger Hops
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'ALERTS' ? 'active' : ''}`}
            onClick={() => setFilterType('ALERTS')}
          >
            Security Alerts
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${filterType === 'HIGH' ? 'active' : ''}`}
            onClick={() => setFilterType('HIGH')}
          >
            High Priority
          </button>
        </div>
      </div>

      <div className="timeline-tree">
        {filteredEvents.map((evt, idx) => {
          const cfg = EVENT_CONFIG[evt.event_type] || EVENT_CONFIG.LEDGER_TRANSFER;
          const IconComponent = cfg.icon;
          const isAlert = evt.event_type === 'SUSPICIOUS_ALERT';

          return (
            <div key={idx} className={`timeline-node-item severity-${evt.severity || 'info'}`}>
              <div className="timeline-rail">
                <div
                  className="timeline-icon-bubble"
                  style={{ backgroundColor: cfg.bgColor, borderColor: cfg.color, color: cfg.color }}
                >
                  <IconComponent size={15} />
                </div>
                {idx < filteredEvents.length - 1 && <div className="timeline-rail-line" />}
              </div>

              <div className="timeline-content-card">
                <div className="timeline-card-header">
                  <div className="timeline-header-left">
                    <span
                      className="timeline-badge-tag"
                      style={{ color: cfg.color, backgroundColor: cfg.bgColor }}
                    >
                      {cfg.label}
                    </span>
                    <h4 className="timeline-event-title">{evt.title}</h4>
                  </div>
                  <div className="timeline-header-right">
                    <span className="timeline-timestamp">
                      <Clock size={12} />
                      <span>{evt.formatted_time}</span>
                    </span>
                  </div>
                </div>

                <p className="timeline-desc-text">{evt.description}</p>

                <div className="timeline-meta-row">
                  {evt.amount && (
                    <div className="timeline-meta-cell">
                      <span className="meta-label">Amount:</span>
                      <span className="meta-val highlight">{evt.amount}</span>
                    </div>
                  )}

                  {evt.sender && evt.sender !== 'Unknown' && (
                    <div className="timeline-meta-cell">
                      <span className="meta-label">Sender:</span>
                      <span className="meta-val code-font">{evt.sender.slice(0, 10)}...</span>
                    </div>
                  )}

                  {evt.txid && (
                    <div className="timeline-meta-cell txid-cell">
                      <span className="meta-label">Tx Hash:</span>
                      <button
                        type="button"
                        className="btn-copy-inline"
                        onClick={(e) => handleCopy(e, evt.txid)}
                        title={`Copy tx: ${evt.txid}`}
                      >
                        <span className="code-font">{evt.txid.slice(0, 10)}...{evt.txid.slice(-6)}</span>
                        {copiedTx === evt.txid ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
