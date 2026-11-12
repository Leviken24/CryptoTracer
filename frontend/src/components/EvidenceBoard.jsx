import React, { useState } from 'react';
import {
  Pin,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Filter,
  FileText,
  Clock,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Building2,
  AlertTriangle,
  GitBranch,
} from 'lucide-react';
import { useEvidence } from '../context/EvidenceContext';

const TYPE_CONFIG = {
  WALLET: {
    label: 'Target Wallet',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
    icon: Shield,
  },
  TRANSACTION: {
    label: 'Ledger Transfer',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    icon: ArrowRight,
  },
  FINDING: {
    label: 'Forensic Alert',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    icon: AlertTriangle,
  },
  GRAPH_REF: {
    label: 'Graph Topology',
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.15)',
    icon: GitBranch,
  },
  NOTE: {
    label: 'Analyst Note',
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.15)',
    icon: FileText,
  },
  LABEL: {
    label: 'Entity Intelligence',
    color: '#ec4899',
    bgColor: 'rgba(236, 72, 153, 0.15)',
    icon: Building2,
  },
};

export default function EvidenceBoard() {
  const {
    evidenceItems,
    addEvidenceItem,
    removeEvidenceItem,
    clearEvidence,
    resetToDemoEvidence,
  } = useEvidence();

  const [activeFilter, setActiveFilter] = useState('ALL');
  const [copiedId, setCopiedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New item form state
  const [newType, setNewType] = useState('WALLET');
  const [newTitle, setNewTitle] = useState('');
  const [newReference, setNewReference] = useState('');
  const [newDetails, setNewDetails] = useState('');
  const [newSource, setNewSource] = useState('Analyst Manual Verification');
  const [newTags, setNewTags] = useState('IMPORTANT, PRIORITY');

  const handleCopy = (id, text) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleExportJson = () => {
    const payload = {
      export_title: 'CryptoTrace AI - Digital Evidence Board Dossier',
      exported_at: new Date().toISOString(),
      total_items: evidenceItems.length,
      evidence_items: evidenceItems,
      disclaimer:
        'This evidence board dossier collates blockchain forensic indicators, verified entities, and analyst notes. It serves as decision-support evidence and does not constitute automatic statutory court certification without custodian testimony.',
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CryptoTrace-Evidence-Board-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateItem = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    addEvidenceItem({
      type: newType,
      title: newTitle.trim(),
      reference: newReference.trim() || 'N/A',
      details: newDetails.trim(),
      source: newSource.trim() || 'Analyst Verification',
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
    });

    // Reset form
    setNewTitle('');
    setNewReference('');
    setNewDetails('');
    setShowAddModal(false);
  };

  const filteredItems = evidenceItems.filter((item) => {
    if (activeFilter === 'ALL') return true;
    return item.type === activeFilter;
  });

  return (
    <div className="evidence-board-wrapper panel-card">
      <div className="panel-header">
        <div className="panel-title-group">
          <div className="flex-title-row">
            <Pin size={18} className="text-accent" />
            <h3>Case Evidence Board &amp; Artifact Repository</h3>
          </div>
          <span className="panel-subtitle">
            Curated blockchain exhibits, suspect addresses, alerts &amp; intelligence provenance
          </span>
        </div>

        <div className="panel-actions-group">
          <button
            type="button"
            className="btn-header-outline"
            onClick={() => setShowAddModal(true)}
            title="Pin custom exhibit to board"
          >
            <Plus size={14} />
            <span>Add Evidence Item</span>
          </button>

          <button
            type="button"
            className="btn-header-outline"
            onClick={handleExportJson}
            disabled={evidenceItems.length === 0}
            title="Download evidence bundle JSON"
          >
            <Download size={14} />
            <span>Export Bundle</span>
          </button>

          {evidenceItems.length === 0 ? (
            <button
              type="button"
              className="btn-header-outline"
              onClick={resetToDemoEvidence}
              title="Reset to demo exhibits"
            >
              <RotateCcw size={14} />
              <span>Load Demo Exhibits</span>
            </button>
          ) : (
            <button
              type="button"
              className="btn-header-outline btn-danger-text"
              onClick={clearEvidence}
              title="Clear all board exhibits"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter strip */}
      <div className="evidence-filter-bar">
        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveFilter('ALL')}
          >
            All Exhibits ({evidenceItems.length})
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeFilter === 'WALLET' ? 'active' : ''}`}
            onClick={() => setActiveFilter('WALLET')}
          >
            Wallets
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeFilter === 'TRANSACTION' ? 'active' : ''}`}
            onClick={() => setActiveFilter('TRANSACTION')}
          >
            Transactions
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeFilter === 'FINDING' ? 'active' : ''}`}
            onClick={() => setActiveFilter('FINDING')}
          >
            Alerts &amp; Findings
          </button>
          <button
            type="button"
            className={`filter-pill-btn ${activeFilter === 'NOTE' ? 'active' : ''}`}
            onClick={() => setActiveFilter('NOTE')}
          >
            Notes &amp; Labels
          </button>
        </div>
      </div>

      {/* Exhibits Grid */}
      {filteredItems.length === 0 ? (
        <div className="empty-panel">
          <Pin size={32} className="text-muted" style={{ marginBottom: 12 }} />
          <p>No evidence items matching this filter on the board.</p>
          <button
            type="button"
            className="btn-primary-action"
            style={{ marginTop: 12 }}
            onClick={() => setShowAddModal(true)}
          >
            <Plus size={15} /> Pin New Exhibit
          </button>
        </div>
      ) : (
        <div className="evidence-grid">
          {filteredItems.map((item) => {
            const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.NOTE;
            const IconComponent = cfg.icon;

            return (
              <div key={item.id} className="evidence-card">
                <div className="evidence-card-header">
                  <div className="evidence-type-badge" style={{ backgroundColor: cfg.bgColor, color: cfg.color }}>
                    <IconComponent size={13} />
                    <span>{cfg.label}</span>
                  </div>
                  <span className="evidence-id-tag">{item.id}</span>
                  <button
                    type="button"
                    className="btn-remove-evidence"
                    onClick={() => removeEvidenceItem(item.id)}
                    title="Remove exhibit from board"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <h4 className="evidence-title">{item.title}</h4>

                {item.reference && item.reference !== 'N/A' && (
                  <div className="evidence-ref-box">
                    <span className="ref-code code-font" title={item.reference}>
                      {item.reference.length > 24 ? `${item.reference.slice(0, 14)}...${item.reference.slice(-8)}` : item.reference}
                    </span>
                    <button
                      type="button"
                      className="btn-copy-ref"
                      onClick={() => handleCopy(item.id, item.reference)}
                      title="Copy reference identifier"
                    >
                      {copiedId === item.id ? <Check size={11} className="text-success" /> : <Copy size={11} />}
                    </button>
                  </div>
                )}

                <p className="evidence-details-text">{item.details}</p>

                <div className="evidence-footer">
                  <div className="evidence-source-line">
                    <span className="source-label">Source:</span>
                    <span className="source-val">{item.source}</span>
                  </div>

                  <div className="evidence-timestamp-line">
                    <Clock size={11} />
                    <span>{item.timestamp}</span>
                  </div>

                  {item.tags && item.tags.length > 0 && (
                    <div className="evidence-tags-row">
                      {item.tags.map((t, tIdx) => (
                        <span key={tIdx} className="evidence-tag-chip">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Evidence Modal */}
      {showAddModal && (
        <div className="modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h3>Pin New Forensic Exhibit</h3>
                <p className="modal-subtitle">Add verified artifact or investigative note to the Evidence Board</p>
              </div>
            </div>

            <form onSubmit={handleCreateItem} className="modal-form">
              <div className="modal-body-scroll">
                <div className="form-group">
                  <label>Exhibit Category</label>
                  <select
                    className="form-input"
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                  >
                    <option value="WALLET">Target Wallet Address</option>
                    <option value="TRANSACTION">On-Chain Transaction Hash</option>
                    <option value="FINDING">Forensic Heuristic / Alert</option>
                    <option value="GRAPH_REF">Graph Topology Reference</option>
                    <option value="LABEL">Entity Intelligence / VASP</option>
                    <option value="NOTE">Analyst Investigation Note</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Exhibit Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Intermediate Peel Mule Wallet 3"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Reference Identifier (Address / TxID / Rule)</label>
                  <input
                    type="text"
                    className="form-input code-font"
                    placeholder="e.g. bc1q... or 0x... or PEEL_CHAIN"
                    value={newReference}
                    onChange={(e) => setNewReference(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Observation &amp; Forensic Details</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Describe specific observations, taint values, or counterparty interactions..."
                    value={newDetails}
                    onChange={(e) => setNewDetails(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Source Reference &amp; Provenance</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Blockstream API / CISA Alert / OFAC SDN"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Tags (comma-separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HIGH_RISK, SUBPOENA_TARGET, PEEL"
                    value={newTags}
                    onChange={(e) => setNewTags(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-modal-dismiss"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary-action">
                  Pin Exhibit to Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
