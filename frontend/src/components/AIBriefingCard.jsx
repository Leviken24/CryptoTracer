import React, { useState } from 'react';
import {
  Brain,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Info,
  ArrowRight,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';

export default function AIBriefingCard({ aiSummary, investigation }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTx, setCopiedTx] = useState(null);

  if (!aiSummary) return null;

  const handleCopyAll = () => {
    const textBlocks = [
      `CRYPTOTRACE AI - FORENSIC EXECUTIVE BRIEFING`,
      `Case: ${investigation?.title || 'Investigation'} (${investigation?.case_id || 'N/A'})`,
      `Target: ${investigation?.target || 'N/A'} [${(investigation?.blockchain || 'bitcoin').toUpperCase()}]`,
      `Composite Risk: ${investigation?.risk_score || 0}/100\n`,
      `1. INVESTIGATED TARGET:`,
      aiSummary.investigated_target,
      `\n2. FUND DISPOSITION & FLOW:`,
      aiSummary.fund_disposition,
      `\n3. SUSPICIOUS PATTERNS DETECTED:`,
      (aiSummary.suspicious_patterns || []).join('\n'),
      `\n4. PRIORITY DESTINATIONS:`,
      (aiSummary.priority_destinations || [])
        .map(
          (d, i) =>
            `#${i + 1} ${d.address} (${d.label}) - Confidence: ${d.confidence}, Risk: ${d.risk}\n   Action: ${d.action}`
        )
        .join('\n'),
      `\n5. SUPPORTING LEDGER EVIDENCE:`,
      aiSummary.supporting_evidence,
      `\n6. INVESTIGATIVE UNCERTAINTIES & LEGAL DISCLAIMERS:`,
      (aiSummary.investigative_uncertainties || []).map((u) => `• ${u}`).join('\n'),
      `\n7. RECOMMENDED NEXT ACTIONS:`,
      (aiSummary.recommended_next_actions || []).map((a, i) => `${i + 1}. ${a}`).join('\n'),
    ].join('\n');

    navigator.clipboard?.writeText(textBlocks);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyTx = (txid) => {
    navigator.clipboard?.writeText(txid);
    setCopiedTx(txid);
    setTimeout(() => setCopiedTx(null), 1800);
  };

  return (
    <div className="ai-briefing-container">
      <div className="ai-briefing-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="ai-header-title-group">
          <div className="ai-badge-icon">
            <Brain size={18} className="ai-pulse-icon" />
          </div>
          <div>
            <div className="ai-header-title-row">
              <h3>AI Forensic Executive Briefing</h3>
              <span className="ai-provenance-tag">
                <ShieldCheck size={12} />
                <span>Deterministic Evidence Engine • 100% Verifiable</span>
              </span>
            </div>
            <p className="ai-header-subtitle">
              Automated 7-point forensic reasoning derived strictly from empirical blockchain transactions
            </p>
          </div>
        </div>

        <div className="ai-header-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="btn-copy-briefing"
            onClick={handleCopyAll}
            title="Copy full briefing dossier text to clipboard"
          >
            {copiedAll ? <Check size={14} /> : <Copy size={14} />}
            <span>{copiedAll ? 'Dossier Copied!' : 'Copy Dossier'}</span>
          </button>
          <button
            type="button"
            className="btn-toggle-expand"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse Briefing' : 'Expand Briefing'}
          >
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="ai-briefing-body">
          {/* Question 1 & 2: Scope & Disposition */}
          <div className="ai-grid-two-col">
            <div className="ai-card-section">
              <div className="section-title-line">
                <span className="q-num">1</span>
                <h4>Investigated Scope</h4>
              </div>
              <p className="ai-narrative-text">{aiSummary.investigated_target}</p>
            </div>

            <div className="ai-card-section">
              <div className="section-title-line">
                <span className="q-num">2</span>
                <h4>Fund Disposition &amp; Flow</h4>
              </div>
              <p className="ai-narrative-text">{aiSummary.fund_disposition}</p>
            </div>
          </div>

          {/* Question 3: Suspicious Patterns */}
          <div className="ai-card-section full-width">
            <div className="section-title-line">
              <span className="q-num">3</span>
              <h4>Suspicious Forensic Patterns Detected</h4>
            </div>
            <div className="ai-patterns-list">
              {(aiSummary.suspicious_patterns || []).map((pattern, idx) => (
                <div key={idx} className="ai-pattern-item">
                  <span className="pattern-bullet">•</span>
                  <span className="pattern-desc">{pattern.replace(/^[•\s]+/, '')}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question 4: Priority Destinations */}
          <div className="ai-card-section full-width">
            <div className="section-title-line">
              <span className="q-num">4</span>
              <h4>Priority Destinations Requiring Subpoena &amp; Attention</h4>
            </div>
            <div className="ai-destinations-grid">
              {(aiSummary.priority_destinations || []).map((dest, idx) => (
                <div key={idx} className="ai-destination-card">
                  <div className="dest-header-row">
                    <span className="dest-rank-tag">#{idx + 1} Target</span>
                    <span className="dest-label-tag">{dest.label}</span>
                    <span className="dest-conf-tag">Conf: {dest.confidence}</span>
                  </div>
                  <div className="dest-address code-font" title={dest.address}>
                    {dest.address}
                  </div>
                  <div className="dest-reason-box">
                    <span className="box-label">Finding:</span>
                    <span className="box-val">{dest.reason}</span>
                  </div>
                  <div className="dest-action-callout">
                    <ArrowRight size={13} className="action-arrow" />
                    <span>{dest.action}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Question 5: Supporting Evidence */}
          <div className="ai-card-section full-width">
            <div className="section-title-line">
              <span className="q-num">5</span>
              <h4>Supporting On-Chain Evidence</h4>
            </div>
            <p className="ai-narrative-text">{aiSummary.supporting_evidence}</p>
            {aiSummary.supporting_txids && aiSummary.supporting_txids.length > 0 && (
              <div className="supporting-tx-chips">
                <span className="tx-chip-label">Verifiable Transaction Hashes:</span>
                <div className="tx-chip-row">
                  {aiSummary.supporting_txids.map((txid) => (
                    <button
                      key={txid}
                      type="button"
                      className="tx-hash-chip"
                      onClick={() => handleCopyTx(txid)}
                      title={`Click to copy hash: ${txid}`}
                    >
                      <span className="chip-code">{txid.slice(0, 10)}...{txid.slice(-6)}</span>
                      {copiedTx === txid ? <Check size={12} className="chip-icon success" /> : <Copy size={12} className="chip-icon" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Question 6: Uncertainties */}
          <div className="ai-card-section full-width disclaimer-box">
            <div className="section-title-line">
              <span className="q-num warning">6</span>
              <h4>Forensic Uncertainties &amp; Attribution Limitations</h4>
            </div>
            <div className="uncertainty-items">
              {(aiSummary.investigative_uncertainties || []).map((u, idx) => (
                <div key={idx} className="uncertainty-item">
                  <Info size={14} className="info-icon" />
                  <span>{u}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Question 7: Recommended Next Actions */}
          <div className="ai-card-section full-width actions-box">
            <div className="section-title-line">
              <span className="q-num primary">7</span>
              <h4>Recommended Next Investigative Actions</h4>
            </div>
            <ol className="recommended-actions-ol">
              {(aiSummary.recommended_next_actions || []).map((act, idx) => (
                <li key={idx} className="recommended-action-li">
                  <CheckCircle2 size={15} className="step-check-icon" />
                  <span>{act}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
