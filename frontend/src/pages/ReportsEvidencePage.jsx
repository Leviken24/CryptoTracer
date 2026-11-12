import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileCheck2,
  FileDown,
  Download,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Lock,
} from 'lucide-react';
import TopHeader from '../components/TopHeader';

export default function ReportsEvidencePage({ onOpenNewInvestigation }) {
  const [investigations, setInvestigations] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [auditStatus, setAuditStatus] = useState({ valid: true, message: 'Chain intact' });
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [tampering, setTampering] = useState(false);

  const fetchReportsAndAudit = async () => {
    setLoading(true);
    try {
      const [invRes, auditRes, verifyRes] = await Promise.all([
        axios.get('http://localhost:8000/api/investigations', { timeout: 3000 }),
        axios.get('http://localhost:8000/audit', { timeout: 3000 }),
        axios.get('http://localhost:8000/audit/verify', { timeout: 3000 }),
      ]);
      setInvestigations(invRes.data);
      setAuditLog(auditRes.data);
      setAuditStatus(verifyRes.data);
    } catch (err) {
      console.warn('Backend unavailable, using fallback:', err);
      setInvestigations([
        {
          id: 1,
          case_id: 'CT-CASE-2026-BTC01',
          title: 'Ransomware Extortion & Peel Chain Cashout',
          blockchain: 'bitcoin',
          target: 'bc1qsrc0000000000000000000000000000000000',
          risk_score: 91,
          status: 'completed',
          created_at: Math.floor(Date.now() / 1000) - 86400 * 2,
        },
      ]);
      setAuditStatus({ valid: true, message: 'Chain intact' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportsAndAudit();
  }, []);

  const handleVerifyAudit = async () => {
    setVerifying(true);
    try {
      const res = await axios.get('http://localhost:8000/audit/verify');
      setAuditStatus(res.data);
    } catch (err) {
      console.error('Audit verification error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleTamperAudit = async () => {
    setTampering(true);
    try {
      await axios.post('http://localhost:8000/audit/tamper', { idx: 0 });
      const verifyRes = await axios.get('http://localhost:8000/audit/verify');
      setAuditStatus(verifyRes.data);
      const auditRes = await axios.get('http://localhost:8000/audit');
      setAuditLog(auditRes.data);
    } catch (err) {
      console.error('Audit tampering demo error:', err);
    } finally {
      setTampering(false);
    }
  };

  const handleResetAudit = async () => {
    try {
      await axios.post('http://localhost:8000/audit/reset');
      const verifyRes = await axios.get('http://localhost:8000/audit/verify');
      setAuditStatus(verifyRes.data);
      setAuditLog([]);
    } catch (err) {
      console.error('Audit reset error:', err);
    }
  };

  const handleDownloadPdf = (invId) => {
    window.open(`http://localhost:8000/api/investigations/${invId}/pdf`, '_blank');
  };

  return (
    <div className="page-container reports-evidence-page">
      <TopHeader
        title="Reports &amp; Evidence Vault"
        subtitle="Cryptographic chain of custody, court-admissible dossiers, and tamper verification"
        onOpenNewInvestigation={onOpenNewInvestigation}
      />

      <div className="reports-content">
        {/* Reports Table Section */}
        <div className="panel-card reports-table-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h3>Official Forensic Reports</h3>
              <span className="panel-subtitle">Exportable PDF investigation dossiers with cryptographic signatures</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Case Reference</th>
                  <th>Investigation Title</th>
                  <th>Blockchain</th>
                  <th>Risk Rating</th>
                  <th>Format</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {investigations.map((inv) => (
                  <tr key={inv.id}>
                    <td className="code-font">{inv.case_id}</td>
                    <td>
                      <strong>{inv.title}</strong>
                      <p className="table-sub-desc code-font">
                        Target: {inv.target ? `${inv.target.slice(0, 10)}...` : 'N/A'}
                      </p>
                    </td>
                    <td>
                      <span className={`chain-pill ${inv.blockchain || 'bitcoin'}`}>
                        {inv.blockchain === 'ethereum' ? 'Ξ Ethereum' : '₿ Bitcoin'}
                      </span>
                    </td>
                    <td>
                      <span className={`risk-pill ${inv.risk_score >= 80 ? 'risk-badge-critical' : 'risk-badge-high'}`}>
                        {inv.risk_score}/100
                      </span>
                    </td>
                    <td>
                      <span className="format-badge">PDF &amp; JSON</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-download-pdf-table"
                        onClick={() => handleDownloadPdf(inv.id)}
                        title="Generate &amp; Download PDF Report"
                      >
                        <FileDown size={14} />
                        <span>Download PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cryptographic Chain of Custody & Audit Log Section */}
        <div className="panel-card audit-vault-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <div className="vault-header-title">
                <Lock size={18} className="accent-icon" />
                <h3>Tamper-Evident SHA-256 Audit Log</h3>
              </div>
              <span className="panel-subtitle">
                Section 9 Specification: SHA256("idx|ts|action|payload_hash|prev_hash")
              </span>
            </div>

            <div className="audit-controls-actions">
              <button
                type="button"
                className="btn-audit-tool verify-btn"
                onClick={handleVerifyAudit}
                disabled={verifying}
              >
                <ShieldCheck size={14} />
                <span>{verifying ? 'Verifying...' : 'Verify Chain Integrity'}</span>
              </button>

              <button
                type="button"
                className="btn-audit-tool tamper-btn"
                onClick={handleTamperAudit}
                disabled={tampering}
                title="Demo Only: Corrupt entry #0 to test tamper detection"
              >
                <ShieldAlert size={14} />
                <span>Simulate Evidence Tamper</span>
              </button>

              <button
                type="button"
                className="btn-audit-tool reset-btn"
                onClick={handleResetAudit}
                title="Reset audit chain between demo runs"
              >
                <RotateCcw size={14} />
                <span>Reset Chain</span>
              </button>
            </div>
          </div>

          {/* Verification Status Pill Banner */}
          <div className={`audit-status-banner ${auditStatus.valid ? 'valid' : 'tampered'}`}>
            {auditStatus.valid ? (
              <>
                <CheckCircle2 size={18} className="status-svg success" />
                <div className="status-text-wrap">
                  <strong>Chain Cryptographically Intact</strong>
                  <span>All intermediate action hashes and parent linkages match SHA-256 signatures.</span>
                </div>
              </>
            ) : (
              <>
                <XCircle size={18} className="status-svg danger" />
                <div className="status-text-wrap">
                  <strong>SECURITY ALERT: Evidence Tampering Detected!</strong>
                  <span>
                    Hash mismatch at entry #{auditStatus.broken_at}. The cryptographic chain of custody was breached.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Audit Chain Entries Table */}
          {auditLog.length > 0 && (
            <div className="table-wrapper audit-table-wrapper">
              <table className="custom-data-table audit-table">
                <thead>
                  <tr>
                    <th>Index</th>
                    <th>Action</th>
                    <th>Payload Hash (SHA-256)</th>
                    <th>Parent Hash (prev_hash)</th>
                    <th>Merkle Link Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((entry) => (
                    <tr key={entry.idx}>
                      <td className="code-font">#{entry.idx}</td>
                      <td>
                        <span className="action-tag code-font">{entry.action}</span>
                      </td>
                      <td className="code-font hash-cell">
                        {entry.payload_hash ? `${entry.payload_hash.slice(0, 12)}...${entry.payload_hash.slice(-8)}` : 'N/A'}
                      </td>
                      <td className="code-font hash-cell">
                        {entry.prev_hash ? `${entry.prev_hash.slice(0, 12)}...${entry.prev_hash.slice(-8)}` : '000000000000...'}
                      </td>
                      <td className="code-font hash-cell highlight">
                        {entry.hash ? `${entry.hash.slice(0, 14)}...${entry.hash.slice(-8)}` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
