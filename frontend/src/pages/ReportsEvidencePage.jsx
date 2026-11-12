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
  Pin,
  FileText,
} from 'lucide-react';
import TopHeader from '../components/TopHeader';
import EvidenceBoard from '../components/EvidenceBoard';
import AuditPanel from '../components/AuditPanel';

export default function ReportsEvidencePage({ onOpenNewInvestigation }) {
  const [activeSection, setActiveSection] = useState('board'); // 'board' | 'reports' | 'audit'
  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:8000/api/investigations', { timeout: 3000 });
      setInvestigations(res.data);
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
        {
          id: 2,
          case_id: 'CT-CASE-2026-ETH02',
          title: 'DeFi Flash Loan Exploit & Mixer Hop',
          blockchain: 'ethereum',
          target: '0x71C8fb9697d744876ae1529d7694901f40d226a4',
          risk_score: 84,
          status: 'active',
          created_at: Math.floor(Date.now() / 1000) - 86400,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDownloadPdf = (invId) => {
    window.open(`http://localhost:8000/api/investigations/${invId}/pdf`, '_blank');
  };

  const handleExportJson = (inv) => {
    const blob = new Blob([JSON.stringify(inv, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CryptoTrace-Case-${inv.case_id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container reports-evidence-page">
      <TopHeader
        title="Reports &amp; Evidence Vault"
        subtitle="Cryptographic chain of custody, evidence exhibits, and downloadable forensic dossiers"
        onOpenNewInvestigation={onOpenNewInvestigation}
      />

      {/* Primary Section Switcher Tabs */}
      <div className="tab-navigation-strip mb-4">
        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'board' ? 'active' : ''}`}
          onClick={() => setActiveSection('board')}
        >
          <Pin size={14} className="mr-1" />
          <span>Case Evidence Board</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveSection('reports')}
        >
          <FileText size={14} className="mr-1" />
          <span>Forensic PDF Dossiers</span>
          <span className="tab-badge">{investigations.length}</span>
        </button>

        <button
          type="button"
          className={`workspace-tab-btn ${activeSection === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveSection('audit')}
        >
          <Lock size={14} className="mr-1" />
          <span>SHA-256 Audit Trail</span>
        </button>
      </div>

      {/* Mandatory Forensic Integrity Notice */}
      <div className="legal-notice-banner mb-4">
        <AlertTriangle size={15} className="notice-icon text-warning" />
        <div>
          <strong>Forensic Decision-Support &amp; Legal Integrity Notice:</strong>
          <p>
            Generated dossiers and evidence board exhibits provide investigative decision-support and cryptographic verification of recorded events. They do not claim automatic legal admissibility or statutory court certification; formal judicial proceedings require evidentiary admission under local procedural rules and verified custodian affidavits.
          </p>
        </div>
      </div>

      {/* Tab 1: Evidence Board */}
      {activeSection === 'board' && (
        <EvidenceBoard />
      )}

      {/* Tab 2: Forensic PDF Dossiers Table */}
      {activeSection === 'reports' && (
        <div className="panel-card reports-table-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h3>Official Forensic Case Dossiers</h3>
              <span className="panel-subtitle">Exportable PDF investigation reports with cryptographic verification seals</span>
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
                      <div className="flex-row-gap-2">
                        <button
                          type="button"
                          className="btn-download-pdf-table"
                          onClick={() => handleDownloadPdf(inv.id)}
                          title="Generate &amp; Download Forensic PDF Report"
                        >
                          <FileDown size={14} />
                          <span>Download PDF</span>
                        </button>
                        <button
                          type="button"
                          className="btn-header-outline"
                          onClick={() => handleExportJson(inv)}
                          title="Export raw JSON evidence bundle"
                        >
                          <Download size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Cryptographic SHA-256 Audit Panel */}
      {activeSection === 'audit' && (
        <AuditPanel />
      )}
    </div>
  );
}
