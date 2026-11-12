import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  Clock,
  Shield,
  Coins,
  Pin,
  AlertTriangle,
} from 'lucide-react';
import { useEvidence } from '../context/EvidenceContext';

function shorten(addr) {
  if (!addr || addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

export default function TransactionDetailsModal({ edge, onClose, onInspectWallet }) {
  const [copiedTxid, setCopiedTxid] = useState(false);
  const [pinned, setPinned] = useState(false);
  const { addEvidenceItem, isItemPinned } = useEvidence();

  if (!edge) return null;

  const handleCopy = () => {
    if (edge.txid) {
      navigator.clipboard?.writeText(edge.txid);
      setCopiedTxid(true);
      setTimeout(() => setCopiedTxid(false), 2000);
    }
  };

  const handlePin = () => {
    const txHash = edge.txid || `TX-${edge.from.slice(0, 6)}-${edge.to.slice(0, 6)}`;
    addEvidenceItem({
      type: 'TRANSACTION',
      title: `Transfer of ${edge.value} ${edge.blockchain === 'ethereum' ? 'ETH' : 'BTC'}`,
      reference: txHash,
      details: `Sender: ${edge.from}\nRecipient: ${edge.to}\nAmount: ${edge.value} ${edge.blockchain === 'ethereum' ? 'ETH' : 'BTC'}\nTags: ${(edge.tags || []).join(', ') || 'Direct Hop'}`,
      source: 'On-Chain Ledger Hop / Block Inspection',
      tags: edge.tags || ['TRANSACTION'],
    });
    setPinned(true);
    setTimeout(() => setPinned(false), 2500);
  };

  const formattedDate = edge.ts
    ? new Date(edge.ts * 1000).toUTCString()
    : 'Simulated Forensic Block';

  const chain = edge.blockchain || 'bitcoin';
  const symbol = chain === 'ethereum' ? 'ETH' : 'BTC';
  const txHash = edge.txid || 'Direct Structured Split';
  const alreadyPinned = isItemPinned(txHash) || pinned;

  const isDustOrDecoy =
    edge.value <= 0.0001 ||
    (edge.tags || []).includes('DUSTING') ||
    (edge.tags || []).includes('DECOY');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content tx-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-eyebrow">TRANSACTION INSPECTION</span>
            <h2>On-Chain Ledger Transfer</h2>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {/* Dusting / Decoy Edge Alert */}
          {isDustOrDecoy && (
            <div className="lookalike-warning-card mb-3">
              <div className="lookalike-header">
                <AlertTriangle size={16} className="text-warning" />
                <strong>ADVERSARIAL DUST / DECOY TRANSFER DETECTED</strong>
              </div>
              <p className="lookalike-body-text">
                This transaction carries negligible economic value ({edge.value} {symbol}). Adversaries inject micro-value dust to contaminate graph heuristics or poison wallet addresses without owner consent.
              </p>
            </div>
          )}

          {/* TxID Box */}
          <div className="tx-hash-box">
            <span className="tx-hash-label">Transaction Hash (TxID)</span>
            <div className="tx-hash-value-wrap">
              <span className="tx-hash-code code-font">{txHash}</span>
              {edge.txid && (
                <button
                  type="button"
                  className="btn-copy-small"
                  onClick={handleCopy}
                  title="Copy Tx Hash"
                >
                  {copiedTxid ? <Check size={14} className="success-icon" /> : <Copy size={14} />}
                </button>
              )}
            </div>
          </div>

          {/* Pin to Evidence Board */}
          <div className="mb-3">
            <button
              type="button"
              className={`btn-pin-evidence ${alreadyPinned ? 'already-pinned' : ''}`}
              onClick={handlePin}
              disabled={alreadyPinned}
            >
              <Pin size={14} />
              <span>{alreadyPinned ? '✓ Transaction Pinned to Evidence Board' : 'Pin Transaction to Evidence Board'}</span>
            </button>
          </div>

          {/* Transfer Flow Visual */}
          <div className="tx-transfer-flow-card">
            <div
              className="flow-endpoint clickable"
              onClick={() => onInspectWallet && onInspectWallet(edge.from)}
              title="Click to view sender dossier"
            >
              <span className="flow-role">Sender (Origin)</span>
              <span className="flow-address code-font">{shorten(edge.from)}</span>
            </div>

            <div className="flow-arrow-indicator">
              <ArrowRight size={20} className="arrow-svg" />
              <div className="flow-value-badge">
                <span className="value-amount">{edge.value} {symbol}</span>
              </div>
            </div>

            <div
              className="flow-endpoint clickable"
              onClick={() => onInspectWallet && onInspectWallet(edge.to)}
              title="Click to view recipient dossier"
            >
              <span className="flow-role">Receiver (Destination)</span>
              <span className="flow-address code-font">{shorten(edge.to)}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="tx-meta-grid">
            <div className="meta-item">
              <div className="meta-item-label">
                <Coins size={14} /> Network Asset
              </div>
              <div className="meta-item-value">{chain.toUpperCase()} ({symbol})</div>
            </div>

            <div className="meta-item">
              <div className="meta-item-label">
                <Clock size={14} /> Block Timestamp
              </div>
              <div className="meta-item-value">{formattedDate}</div>
            </div>

            <div className="meta-item">
              <div className="meta-item-label">
                <Shield size={14} /> Forensic Classification
              </div>
              <div className="meta-item-value">
                {edge.tags && edge.tags.length > 0 ? (
                  <div className="tags-flex-wrap">
                    {edge.tags.map((t, idx) => (
                      <span key={idx} className="heuristic-tag-badge">{t}</span>
                    ))}
                  </div>
                ) : (
                  <span>Standard Transfer</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
