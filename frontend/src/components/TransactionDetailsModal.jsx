import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, ArrowRight, Clock, Shield, Coins } from 'lucide-react';

function shorten(addr) {
  if (!addr || addr.length <= 16) return addr;
  return `${addr.slice(0, 10)}...${addr.slice(-8)}`;
}

export default function TransactionDetailsModal({ edge, onClose, onInspectWallet }) {
  const [copiedTxid, setCopiedTxid] = useState(false);

  if (!edge) return null;

  const handleCopy = () => {
    if (edge.txid) {
      navigator.clipboard?.writeText(edge.txid);
      setCopiedTxid(true);
      setTimeout(() => setCopiedTxid(false), 2000);
    }
  };

  const formattedDate = edge.ts
    ? new Date(edge.ts * 1000).toUTCString()
    : 'Simulated Forensic Block';

  const chain = edge.blockchain || 'bitcoin';
  const symbol = chain === 'ethereum' ? 'ETH' : 'BTC';

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
          {/* TxID Box */}
          <div className="tx-hash-box">
            <span className="tx-hash-label">Transaction Hash (TxID)</span>
            <div className="tx-hash-value-wrap">
              <span className="tx-hash-code code-font">{edge.txid || 'Direct Structured Split'}</span>
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
