import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Plus,
  Pin,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { useEvidence } from '../context/EvidenceContext';

function shorten(addr) {
  if (!addr || addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

export default function WalletDetailsDrawer({
  node,
  graphData,
  onClose,
  onSelectNode,
  onSelectEdge,
  onLaunchNewInvestigation,
}) {
  const [copied, setCopied] = useState(false);
  const [pinned, setPinned] = useState(false);
  const { addEvidenceItem, isItemPinned } = useEvidence();

  if (!node) return null;

  const handleCopy = () => {
    navigator.clipboard?.writeText(node.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePin = () => {
    addEvidenceItem({
      type: 'WALLET',
      title: `${node.label || 'Investigated Wallet'} (${node.id.slice(0, 10)}...)`,
      reference: node.id,
      details: `Held taint: ${Math.round((node.taint || 0) * 100)}%, Risk score: ${node.risk || 0}/100, Cluster: ${node.cluster || 'c1'}. Tags: ${(node.tags || []).join(', ')}.`,
      source: `Multi-Hop Ledger Graph (Cluster ${node.cluster || 'c1'})`,
      tags: node.tags || ['WALLET'],
    });
    setPinned(true);
    setTimeout(() => setPinned(false), 2500);
  };

  const incomingEdges = (graphData?.edges || []).filter((e) => e.to === node.id);
  const outgoingEdges = (graphData?.edges || []).filter((e) => e.from === node.id);

  const riskScore = node.risk || 0;
  let riskBadgeClass = 'badge-risk-low';
  let riskLabel = 'Low Risk';
  if (riskScore >= 80) {
    riskBadgeClass = 'badge-risk-critical';
    riskLabel = 'Critical Risk';
  } else if (riskScore >= 60) {
    riskBadgeClass = 'badge-risk-high';
    riskLabel = 'High Risk';
  } else if (riskScore >= 40) {
    riskBadgeClass = 'badge-risk-medium';
    riskLabel = 'Medium Risk';
  }

  const tags = node.tags || [];
  const isLookalike =
    tags.includes('LOOKALIKE') ||
    tags.includes('POISONING') ||
    node.id.includes('dpst') && tags.includes('DECOY') ||
    (node.label || '').toLowerCase().includes('poison') ||
    (node.label || '').toLowerCase().includes('lookalike');

  const alreadyPinned = isItemPinned(node.id) || pinned;

  return (
    <div className="entity-drawer-overlay" onClick={onClose}>
      <aside className="entity-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-group">
            <span className="drawer-badge">WALLET DOSSIER</span>
            <h3>{node.label || 'Unlabeled Wallet'}</h3>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="drawer-body">
          {/* Look-Alike Address Poisoning Warning Banner */}
          {isLookalike && (
            <div className="lookalike-warning-card">
              <div className="lookalike-header">
                <AlertTriangle size={18} className="text-danger" />
                <strong>ADVERSARIAL LOOK-ALIKE ADDRESS DETECTED</strong>
              </div>
              <p className="lookalike-body-text">
                This address mirrors the prefix (<code>{node.id.slice(0, 8)}</code>) and suffix (<code>{node.id.slice(-6)}</code>) of a legitimate counterparty cluster, but has distinct intermediate entropy.
              </p>
              <div className="lookalike-rule-alert">
                <strong>Forensic Protection Rule:</strong> Never substitute this visually similar address for the verified transaction address. Automated address poisoning attacks exploit visual truncation to de-anonymize or misdirect funds.
              </div>
            </div>
          )}

          {/* Address Display & Copy */}
          <div className="drawer-section">
            <div className="flex-between">
              <span className="section-label">Wallet Address</span>
              <span className="code-font address-length-indicator">{node.id.length} chars</span>
            </div>
            <div className="address-copy-box">
              <span className="full-address code-font" title={node.id}>
                {node.id}
              </span>
              <button
                type="button"
                className="btn-copy-address"
                onClick={handleCopy}
                title="Copy Address"
              >
                {copied ? <Check size={14} className="success-icon" /> : <Copy size={14} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Pin to Evidence Board Button */}
          <div className="drawer-section">
            <button
              type="button"
              className={`btn-pin-evidence ${alreadyPinned ? 'already-pinned' : ''}`}
              onClick={handlePin}
              disabled={alreadyPinned}
            >
              <Pin size={14} />
              <span>{alreadyPinned ? '✓ Exhibit Pinned to Evidence Board' : 'Pin Wallet to Evidence Board'}</span>
            </button>
          </div>

          {/* Risk & Taint Metrics Grid */}
          <div className="drawer-metrics-grid">
            <div className="metric-box">
              <span className="metric-box-label">Risk Assessment</span>
              <div className="metric-box-value">
                <span className={`risk-pill ${riskBadgeClass}`}>{riskLabel}</span>
                <span className="risk-score-num">{riskScore}/100</span>
              </div>
            </div>

            <div className="metric-box">
              <span className="metric-box-label">Held Taint Share</span>
              <div className="metric-box-value">
                <span className="taint-percent">{Math.round((node.taint || 0) * 100)}%</span>
                <span className="taint-desc">of dirty source flow</span>
              </div>
            </div>

            <div className="metric-box">
              <span className="metric-box-label">Cluster Entity</span>
              <div className="metric-box-value">
                <span className="cluster-id code-font">{node.cluster || 'c1'}</span>
                <span className="cluster-sub">Common-input group</span>
              </div>
            </div>

            <div className="metric-box">
              <span className="metric-box-label">Ledger Degree</span>
              <div className="metric-box-value">
                <span className="degree-count">
                  {incomingEdges.length} In / {outgoingEdges.length} Out
                </span>
              </div>
            </div>
          </div>

          {/* Forensic Heuristic Tags */}
          {tags.length > 0 && (
            <div className="drawer-section">
              <span className="section-label">Forensic Classification Tags</span>
              <div className="tags-flex-wrap">
                {tags.map((tag, idx) => (
                  <span key={idx} className="heuristic-tag-badge">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Incoming Transactions */}
          <div className="drawer-section">
            <span className="section-label">
              <ArrowDownLeft size={14} className="accent-icon" /> Incoming Transactions ({incomingEdges.length})
            </span>
            {incomingEdges.length === 0 ? (
              <p className="empty-subtext">No incoming transfers recorded in this hop radius.</p>
            ) : (
              <div className="transfer-list">
                {incomingEdges.map((edge, idx) => (
                  <div
                    key={idx}
                    className="transfer-item"
                    onClick={() => onSelectEdge && onSelectEdge(edge)}
                  >
                    <div className="transfer-main">
                      <span className="transfer-sender">From: {shorten(edge.from)}</span>
                      <span className="transfer-amount incoming">
                        +{edge.value} {node.blockchain === 'ethereum' ? 'ETH' : 'BTC'}
                      </span>
                    </div>
                    <div className="transfer-sub">
                      <span className="transfer-txid code-font">
                        {edge.txid ? edge.txid.slice(0, 14) + '...' : 'Direct Split'}
                      </span>
                      {edge.tags && edge.tags.length > 0 && (
                        <span className="transfer-tag">{edge.tags[0]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Transactions */}
          <div className="drawer-section">
            <span className="section-label">
              <ArrowUpRight size={14} className="accent-icon" /> Outgoing Transactions ({outgoingEdges.length})
            </span>
            {outgoingEdges.length === 0 ? (
              <p className="empty-subtext">Leaf wallet — funds remain unspent or pass beyond hop depth.</p>
            ) : (
              <div className="transfer-list">
                {outgoingEdges.map((edge, idx) => (
                  <div
                    key={idx}
                    className="transfer-item"
                    onClick={() => onSelectEdge && onSelectEdge(edge)}
                  >
                    <div className="transfer-main">
                      <span className="transfer-sender">To: {shorten(edge.to)}</span>
                      <span className="transfer-amount outgoing">
                        -{edge.value} {node.blockchain === 'ethereum' ? 'ETH' : 'BTC'}
                      </span>
                    </div>
                    <div className="transfer-sub">
                      <span className="transfer-txid code-font">
                        {edge.txid ? edge.txid.slice(0, 14) + '...' : 'Direct Split'}
                      </span>
                      {edge.tags && edge.tags.length > 0 && (
                        <span className="transfer-tag">{edge.tags[0]}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Drawer Actions Footer */}
        <div className="drawer-footer">
          {onLaunchNewInvestigation && (
            <button
              type="button"
              className="btn-drawer-action"
              onClick={() => onLaunchNewInvestigation(node.id, node.blockchain || 'bitcoin')}
            >
              <Plus size={15} />
              <span>Investigate this Wallet in New Case</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
