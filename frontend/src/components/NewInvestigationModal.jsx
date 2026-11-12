import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  X,
  Play,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Sliders,
} from 'lucide-react';

const PRESETS = [
  {
    id: 'btc-ransom',
    name: 'Bitcoin: Ransomware & 5-Hop Peel Chain (Recommended)',
    blockchain: 'bitcoin',
    inputType: 'address',
    target: 'bc1qsrc0000000000000000000000000000000000',
    title: 'WannaCry/DarkSide Extortion Trail',
    notes: 'Ransom payment received in suspect wallet. Identified 8-split mixer pattern and subsequent 5-stage peel chain toward ExchangeX deposit.',
    hops: 4,
  },
  {
    id: 'eth-defi',
    name: 'Ethereum: DeFi Flash Loan Exploit & Mixer Hop',
    blockchain: 'ethereum',
    inputType: 'address',
    target: '0x71C8fb9697d744876ae1529d7694901f40d226a4',
    title: 'DeFi Liquidity Drain & Tornado Cash Trail',
    notes: '25 ETH drained via re-entrancy exploit, obfuscated across anonymity smart contract and Uniswap V2 router into Binance hot wallet.',
    hops: 3,
  },
  {
    id: 'btc-tx',
    name: 'Bitcoin: Direct Transaction Hash Analysis',
    blockchain: 'bitcoin',
    inputType: 'txid',
    target: '1111111111111111111111111111111111111111111111111111111111111111',
    title: 'High-Value Multi-Output Tx Forensics',
    notes: 'Forensic evaluation of 4.05 BTC fan-out transaction to investigate structuring patterns.',
    hops: 4,
  },
];

export default function NewInvestigationModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate();

  const [blockchain, setBlockchain] = useState('bitcoin');
  const [inputType, setInputType] = useState('address');
  const [target, setTarget] = useState('bc1qsrc0000000000000000000000000000000000');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [hops, setHops] = useState(4);
  const [mode, setMode] = useState('sample'); // 'sample' | 'live'

  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState('');
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const validateInput = (value, chain, type) => {
    const val = value.trim();
    if (!val) return 'Input cannot be empty.';

    if (chain === 'bitcoin') {
      if (type === 'txid') {
        if (!/^[0-9a-fA-F]{64}$/.test(val)) {
          return 'Invalid Bitcoin TxID. Expected a 64-character hexadecimal string.';
        }
      } else {
        // Bech32 or Base58
        if (val.toLowerCase().startsWith('bc1') || val.toLowerCase().startsWith('tb1')) {
          if (!/^(?:bc1|tb1)[qpzry9x8gf2tvdw0s3jn54khce6mua7l]{25,87}$/i.test(val)) {
            return 'Invalid Bech32 Bitcoin address format.';
          }
        } else if (/^[123mn][1-9A-HJ-NP-Za-km-z]{24,34}$/.test(val)) {
          return null; // Valid Legacy
        } else {
          return 'Invalid Bitcoin address. Expected Bech32 (bc1...) or Legacy format.';
        }
      }
    } else if (chain === 'ethereum') {
      if (type === 'txid') {
        if (!/^0x[0-9a-fA-F]{64}$/.test(val)) {
          return 'Invalid Ethereum Tx Hash. Expected 0x followed by 64 hexadecimal characters.';
        }
      } else {
        if (!/^0x[0-9a-fA-F]{40}$/.test(val)) {
          return 'Invalid Ethereum address. Expected 0x followed by 40 hexadecimal characters.';
        }
      }
    }
    return null;
  };

  const handleApplyPreset = (preset) => {
    setBlockchain(preset.blockchain);
    setInputType(preset.inputType);
    setTarget(preset.target);
    setTitle(preset.title);
    setNotes(preset.notes);
    setHops(preset.hops);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const validationError = validateInput(target, blockchain, inputType);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setProgressStep('Step 1/5: Cryptographically validating target address...');

    const payload = {
      title: title.trim() || undefined,
      blockchain,
      input_type: inputType,
      target: target.trim(),
      hops: Number(hops),
      mode,
      notes: notes.trim(),
    };

    try {
      setTimeout(() => setProgressStep('Step 2/5: Ingesting multi-hop transaction ledger...'), 350);
      setTimeout(() => setProgressStep('Step 3/5: Building NetworkX directed transaction graph...'), 700);
      setTimeout(() => setProgressStep('Step 4/5: Executing peel-chain & adversarial heuristics...'), 1100);
      setTimeout(() => setProgressStep('Step 5/5: Computing taint propagation & signing audit log...'), 1500);

      const res = await axios.post('http://localhost:8000/api/investigations', payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      if (onCreated) {
        onCreated(res.data);
      }
      onClose();
      navigate(`/investigations/${res.data.id}`);
    } catch (err) {
      console.error('Failed to create investigation:', err);
      const msg = err.response?.data?.detail || err.message || 'Failed to execute investigation analysis.';
      setError(`Analysis Error: ${msg}`);
    } finally {
      setLoading(false);
      setProgressStep('');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content new-investigation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2>New Blockchain Investigation</h2>
            <p>Initiate automated forensics trace, graph analysis &amp; receiver attribution</p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Presets Strip */}
        <div className="presets-container">
          <span className="presets-label">
            <Sparkles size={14} className="accent-icon" /> Quick Demo Scenarios:
          </span>
          <div className="presets-grid">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="preset-chip"
                onClick={() => handleApplyPreset(p)}
                disabled={loading}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="form-error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="investigation-form">
          {/* Blockchain & Input Type row */}
          <div className="form-row-two-col">
            <div className="form-field">
              <label>Blockchain Network</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segment-btn ${blockchain === 'bitcoin' ? 'active' : ''}`}
                  onClick={() => {
                    setBlockchain('bitcoin');
                    if (target.startsWith('0x')) {
                      setTarget('bc1qsrc0000000000000000000000000000000000');
                    }
                  }}
                  disabled={loading}
                >
                  ₿ Bitcoin
                </button>
                <button
                  type="button"
                  className={`segment-btn ${blockchain === 'ethereum' ? 'active' : ''}`}
                  onClick={() => {
                    setBlockchain('ethereum');
                    if (!target.startsWith('0x')) {
                      setTarget('0x71C8fb9697d744876ae1529d7694901f40d226a4');
                    }
                  }}
                  disabled={loading}
                >
                  Ξ Ethereum (EVM)
                </button>
              </div>
            </div>

            <div className="form-field">
              <label>Input Type</label>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segment-btn ${inputType === 'address' ? 'active' : ''}`}
                  onClick={() => setInputType('address')}
                  disabled={loading}
                >
                  Wallet Address
                </button>
                <button
                  type="button"
                  className={`segment-btn ${inputType === 'txid' ? 'active' : ''}`}
                  onClick={() => setInputType('txid')}
                  disabled={loading}
                >
                  Transaction Hash
                </button>
              </div>
            </div>
          </div>

          {/* Target Address / Hash Field */}
          <div className="form-field">
            <label>
              Target {inputType === 'address' ? 'Wallet Address' : 'Transaction Hash'}
              <span className="required-mark">*</span>
            </label>
            <input
              type="text"
              className="form-input code-font"
              value={target}
              onChange={(e) => {
                setTarget(e.target.value);
                setError(null);
              }}
              placeholder={
                blockchain === 'bitcoin'
                  ? (inputType === 'address' ? 'e.g. bc1q... or 1...' : 'e.g. 64-char hex txid')
                  : (inputType === 'address' ? 'e.g. 0x71C8...' : 'e.g. 0x + 64-char hex tx hash')
              }
              required
              disabled={loading}
            />
          </div>

          {/* Case Name (Optional) */}
          <div className="form-field">
            <label>Case Name (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. DarkSide Extortion Cashout Tracking"
              disabled={loading}
            />
          </div>

          {/* Hops & Mode Selector row */}
          <div className="form-row-two-col">
            <div className="form-field">
              <label>Hop Depth (Analysis Radius)</label>
              <select
                className="form-select"
                value={hops}
                onChange={(e) => setHops(Number(e.target.value))}
                disabled={loading}
              >
                <option value="2">2 Hops (Direct Counterparties)</option>
                <option value="3">3 Hops (Intermediary Layer)</option>
                <option value="4">4 Hops (Recommended Standard)</option>
                <option value="5">5 Hops (Deep Peel Chain Trace)</option>
                <option value="6">6 Hops (Extended Network)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Data Ingestion Source</label>
              <select
                className="form-select"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                disabled={loading}
              >
                <option value="sample">Deterministic Forensics (Offline Demo Dataset)</option>
                <option value="live">Live Blockchain Explorer (Blockstream / Mempool)</option>
              </select>
            </div>
          </div>

          {/* Optional Investigation Notes */}
          <div className="form-field">
            <label>Case Notes &amp; Investigator Context (Optional)</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record preliminary intelligence, extortion demands, victim report references, or search warrant IDs..."
              disabled={loading}
            />
          </div>

          {/* Modal Actions */}
          <div className="modal-footer">
            {loading ? (
              <div className="loading-indicator-strip">
                <span className="spinner-ring" />
                <span className="loading-status-text">{progressStep}</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={loading || !target.trim()}
                >
                  <Play size={16} fill="currentColor" />
                  <span>Analyze Transaction Trail</span>
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
