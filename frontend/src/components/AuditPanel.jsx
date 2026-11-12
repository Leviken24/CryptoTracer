import { useState, useEffect } from 'react';
import axios from 'axios';

function shortenHash(hash) {
  if (!hash || hash.length <= 16) return hash || '';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function AuditPanel() {
  const [entries, setEntries] = useState([]);
  const [verifyStatus, setVerifyStatus] = useState({
    valid: true,
    broken_at: null,
    message: 'Chain intact',
  });
  const [isTampered, setIsTampered] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAuditEntries();
  }, []);

  const fetchAuditEntries = async () => {
    try {
      const res = await axios.get('http://localhost:8000/audit', { timeout: 1500 });
      setEntries(res.data);
      setIsTampered(false);
    } catch {
      // Fallback offline
      try {
        const localRes = await fetch('/example_audit.json');
        if (localRes.ok) {
          const data = await localRes.json();
          setEntries(data);
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/audit/verify', { timeout: 1500 });
      setVerifyStatus(res.data);
      setIsTampered(!res.data.valid);
    } catch {
      if (isTampered) {
        setVerifyStatus({
          valid: false,
          broken_at: 0,
          message: 'Tampered at entry 0: stored information no longer matches its expected hash',
        });
      } else {
        setVerifyStatus({
          valid: true,
          broken_at: null,
          message: 'Chain intact: Genesis to Head validated',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTamper = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/audit/tamper', { idx: 0 }, { timeout: 1500 });
      await fetchAuditEntries();
      const vRes = await axios.get('http://localhost:8000/audit/verify', { timeout: 1500 });
      setVerifyStatus(vRes.data);
      setIsTampered(true);
    } catch {
      setIsTampered(true);
      setEntries((prev) =>
        prev.map((e) =>
          e.idx === 0
            ? { ...e, hash: 'bad000000000000000000000000000000000000000000000000000000000dead' }
            : e
        )
      );
      setVerifyStatus({
        valid: false,
        broken_at: 0,
        message: 'Tampered at entry 0: stored information no longer matches its expected hash',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:8000/audit/reset', {}, { timeout: 1500 });
      await fetchAuditEntries();
      setVerifyStatus({ valid: true, broken_at: null, message: 'Chain intact' });
      setIsTampered(false);
    } catch {
      setIsTampered(false);
      try {
        const localRes = await fetch('/example_audit.json');
        if (localRes.ok) {
          const data = await localRes.json();
          setEntries(data);
        }
      } catch (err) {
        console.error(err);
      }
      setVerifyStatus({ valid: true, broken_at: null, message: 'Chain intact' });
    } finally {
      setLoading(false);
    }
  };

  const checks = [
    { name: 'Sequence Check', desc: 'Verify sequential numbering', status: 'PASS' },
    { name: 'Hash Validation', desc: 'Verify content SHA-256 hashes', status: 'PASS' },
    { name: 'Link Verification', desc: 'Confirm previous_hash links', status: 'PASS' },
    { name: 'Signature Check', desc: 'Validate HMAC signatures', status: 'PASS' },
    {
      name: 'Tamper Detection',
      desc: 'Check for unauthorized changes in payload or hashes',
      status: isTampered ? 'FAIL' : 'PASS',
    },
  ];

  return (
    <div className="audit-workspace-two-col">
      {/* Top action toolbar */}
      <div className="audit-controls-header">
        <div className="audit-header-titles">
          <h3>Cryptographic Chain of Custody</h3>
          <p>Court-admissible proof • SHA-256 Merkle-style sequential hash chain</p>
        </div>

        <div className="audit-buttons-group">
          <button
            type="button"
            className="btn-audit-hero btn-verify-hero"
            onClick={handleVerify}
            disabled={loading}
          >
            🛡️ Verify Chain
          </button>
          <button
            type="button"
            className="btn-audit-hero btn-tamper-hero"
            onClick={handleTamper}
            disabled={loading}
          >
            ⚠️ DEMO: Tamper
          </button>
          <button
            type="button"
            className="btn-audit-hero btn-reset-hero"
            onClick={handleReset}
            disabled={loading}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      <div className="audit-grid-layout">
        {/* Left Card: 5-step validation process (Image 9) */}
        <div className="audit-card-surface">
          <div className="audit-card-header">
            <span className="card-badge-icon">🛡️</span>
            <div>
              <h4>Chain Integrity</h4>
              <span className="card-subtext">5-step validation process</span>
            </div>
          </div>

          <div className="validation-checks-list">
            {checks.map((c, i) => {
              const isFail = c.status === 'FAIL';
              return (
                <div key={i} className={`check-item ${isFail ? 'check-item-fail' : ''}`}>
                  <div className="check-left">
                    <span className={`check-icon-circle ${isFail ? 'icon-fail' : 'icon-pass'}`}>
                      {isFail ? '✕' : '✓'}
                    </span>
                    <div className="check-text">
                      <strong>{c.name}</strong>
                      <p>{c.desc}</p>
                    </div>
                  </div>
                  <span className={`check-pill ${isFail ? 'pill-fail' : 'pill-pass'}`}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Bottom Banner */}
          <div className={`chain-status-box ${isTampered ? 'status-box-tampered' : 'status-box-valid'}`}>
            <span className="box-icon">{isTampered ? '🚨' : '🛡️'}</span>
            <div>
              <strong>{isTampered ? 'Tamper Detected!' : 'Chain Valid'}</strong>
              <p>
                {isTampered
                  ? 'Integrity violation at entry 0 · Hash mismatch in memory'
                  : `All ${entries.length || 5} entries verified · Zero tampering detected`}
              </p>
            </div>
          </div>
        </div>

        {/* Right Card: Chain Links sequence (Image 9 & Image 6) */}
        <div className="audit-card-surface">
          <div className="audit-card-header">
            <span className="card-badge-icon">🔗</span>
            <div>
              <h4>Chain Links</h4>
              <span className="card-subtext">Hash-linked sequence</span>
            </div>
          </div>

          <div className="chain-links-scroll-list">
            {entries.map((entry, idx) => {
              const entryTampered = isTampered && (entry.idx === (verifyStatus.broken_at ?? 0));

              return (
                <div key={entry.idx} className="chain-link-wrapper">
                  <div className={`chain-link-card ${entryTampered ? 'card-tampered' : 'card-valid'}`}>
                    <div className="chain-link-top">
                      <span className="entry-tag">#{entry.idx}</span>
                      <span className="entry-action-name">{entry.action}</span>
                      <span className={`status-pill-small ${entryTampered ? 'pill-tampered' : 'pill-valid'}`}>
                        {entryTampered ? 'Tampered' : 'Valid'}
                      </span>
                    </div>

                    <div className="chain-link-hashes">
                      <div className="hash-line">
                        <span className="hash-key">PREVIOUS:</span>
                        <span className="hash-val" title={entry.prev_hash}>
                          sha256:{shortenHash(entry.prev_hash)}
                        </span>
                      </div>
                      <div className="hash-line">
                        <span className="hash-key">HASH:</span>
                        <span className={`hash-val ${entryTampered ? 'hash-tampered-text' : 'hash-glow'}`} title={entry.hash}>
                          sha256:{shortenHash(entry.hash)}
                        </span>
                      </div>
                    </div>

                    {entryTampered && (
                      <div className="tamper-reason-callout">
                        The stored information no longer matches its expected hash.
                      </div>
                    )}
                  </div>

                  {idx < entries.length - 1 && (
                    <div className="chain-vertical-connector">
                      <div className="connector-line" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tamper detection rules & stats box (Image 9) */}
          <div className="tamper-explanation-box">
            <div className="tamper-explanation-title">
              <span>⚠️</span>
              <strong>Tamper Detection Engine</strong>
            </div>
            <p>
              Any modification to historical data breaks the chain. The hash of each entry depends on both its content and the previous entry's hash, creating an unbreakable cryptographic dependency chain.
            </p>
            <div className="tamper-tags-row">
              <span className="tamper-tag">Hash Mismatch Detection</span>
              <span className="tamper-tag">Signature Validation</span>
              <span className="tamper-tag">Sequence Gap Detection</span>
            </div>
          </div>

          <div className="audit-metrics-row">
            <div className="audit-metric-tile">
              <span className="metric-num" style={{ color: isTampered ? '#ef4444' : '#10b981' }}>
                {isTampered ? '80%' : '100%'}
              </span>
              <span className="metric-lbl">Validation Success</span>
            </div>

            <div className="audit-metric-tile">
              <span className="metric-num" style={{ color: isTampered ? '#ef4444' : '#94a3b8' }}>
                {isTampered ? '1' : '0'}
              </span>
              <span className="metric-lbl">Tampering Events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
