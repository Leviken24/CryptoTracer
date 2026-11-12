import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  FileDown,
  Download,
  Share2,
  Clock,
  Shield,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Save,
  RefreshCw,
  ExternalLink,
  Plus,
  Calculator,
} from 'lucide-react';
import GraphView from '../components/GraphView';
import RankedTable from '../components/RankedTable';
import FindingsPanel from '../components/FindingsPanel';
import AuditPanel from '../components/AuditPanel';
import WalletDetailsDrawer from '../components/WalletDetailsDrawer';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import AIBriefingCard from '../components/AIBriefingCard';
import TimelineView from '../components/TimelineView';
import RiskBreakdownModal from '../components/RiskBreakdownModal';

export default function InvestigationDetailPage({ onOpenNewInvestigation }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active workspace state
  const [activeTab, setActiveTab] = useState('ranked'); // 'ranked' | 'timeline' | 'findings' | 'audit' | 'notes'
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [selectedEdgeData, setSelectedEdgeData] = useState(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);

  // Notes editing state
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const fetchInvestigationDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:8000/api/investigations/${id}`, {
        timeout: 5000,
      });
      setInvestigation(res.data);
      setNotesDraft(res.data.notes || '');

      // Set initial highlighted path to top ranked receiver
      const topRanked = res.data.results?.ranked?.[0];
      if (topRanked) {
        setHighlightedPath(topRanked.critical_path || [topRanked.address]);
        const matchNode = res.data.results?.graph?.nodes?.find((n) => n.id === topRanked.address);
        setSelectedNodeData(matchNode || null);
      }
    } catch (err) {
      console.warn('Failed to load investigation from backend:', err);
      setError('Could not connect to FastAPI backend at http://localhost:8000.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigationDetails();
  }, [id]);

  const handleHighlightPath = (pathNodes, targetAddress) => {
    setHighlightedPath(pathNodes || []);
    const matchNode = investigation?.results?.graph?.nodes?.find((n) => n.id === targetAddress);
    setSelectedNodeData(matchNode || null);
  };

  const handleResetHighlight = () => {
    setHighlightedPath([]);
    setSelectedNodeData(null);
    setSelectedEdgeData(null);
  };

  const handleSelectNode = (nodeId) => {
    const matchNode = investigation?.results?.graph?.nodes?.find((n) => n.id === nodeId);
    if (matchNode) {
      setSelectedNodeData(matchNode);
      setSelectedEdgeData(null);
    }
  };

  const handleSelectEdge = (edge) => {
    setSelectedEdgeData(edge);
  };

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await axios.patch(`http://localhost:8000/api/investigations/${id}`, {
        notes: notesDraft,
      });
      setInvestigation((prev) => ({ ...prev, notes: notesDraft }));
      setIsEditingNotes(false);
    } catch (err) {
      console.error('Failed to save notes:', err);
      alert('Failed to save case notes.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleDownloadPdf = () => {
    window.open(`http://localhost:8000/api/investigations/${id}/pdf`, '_blank');
  };

  const handleExportJson = () => {
    if (!investigation) return;
    const blob = new Blob([JSON.stringify(investigation, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `CryptoTrace-Case-${investigation.case_id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="page-container loading-container">
        <div className="loading-card">
          <span className="spinner-ring" />
          <h3>Reconstructing Multi-Hop Ledger Graph...</h3>
          <p>Loading forensic heuristics, taint propagation matrix &amp; audit evidence...</p>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="page-container error-container">
        <div className="empty-state-card">
          <AlertTriangle size={36} className="danger-icon" />
          <h3>Investigation Record Not Found</h3>
          <p>{error || 'This case ID does not exist in the database.'}</p>
          <button type="button" className="btn-primary-action" onClick={() => navigate('/investigations')}>
            <ArrowLeft size={16} /> Return to Investigations
          </button>
        </div>
      </div>
    );
  }

  const results = investigation.results || {};
  const graphData = results.graph || { nodes: [], edges: [] };
  const rankedReceivers = results.ranked || [];
  const findings = results.findings || [];
  const timeline = results.timeline || [];
  const aiSummary = results.ai_summary || null;
  const compositeRisk = results.composite_risk || null;
  const riskScore = investigation.risk_score || 0;

  const getRiskClass = (score) => {
    if (score >= 80) return 'risk-badge-critical';
    if (score >= 60) return 'risk-badge-high';
    if (score >= 40) return 'risk-badge-medium';
    return 'risk-badge-low';
  };

  return (
    <div className="page-container investigation-detail-page">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="case-detail-header">
        <div className="case-header-left">
          <button
            type="button"
            className="btn-back-breadcrumb"
            onClick={() => navigate('/investigations')}
          >
            <ArrowLeft size={16} />
            <span>Investigations</span>
          </button>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-case-id code-font">{investigation.case_id}</span>
        </div>

        <div className="case-header-actions">
          <button
            type="button"
            className="btn-header-outline"
            onClick={handleExportJson}
            title="Export raw JSON evidence bundle"
          >
            <Download size={14} />
            <span>Export JSON</span>
          </button>
          <button
            type="button"
            className="btn-header-primary"
            onClick={handleDownloadPdf}
            title="Download Court-Admissible PDF Forensic Report"
          >
            <FileDown size={15} />
            <span>Download PDF Report</span>
          </button>
        </div>
      </div>

      {/* Case Overview Banner Card */}
      <div className="case-meta-banner">
        <div className="banner-title-column">
          <div className="banner-badges-strip">
            <span className={`chain-pill ${investigation.blockchain || 'bitcoin'}`}>
              {investigation.blockchain === 'ethereum' ? 'Ξ Ethereum (EVM)' : '₿ Bitcoin'}
            </span>
            <span className={`status-pill ${investigation.status || 'completed'}`}>
              {investigation.status || 'completed'}
            </span>
            <span className="hops-pill">{investigation.hops || 4} Hops Radius</span>
          </div>
          <h1 className="case-banner-title">{investigation.title}</h1>
          <div className="case-target-row">
            <span className="target-label">Target Asset:</span>
            <span className="target-code code-font">{investigation.target}</span>
          </div>
        </div>

        <div className="banner-stats-column">
          <div className="banner-stat-box">
            <span className="stat-label">Composite Risk</span>
            <button
              type="button"
              className={`risk-pill large ${getRiskClass(riskScore)} btn-risk-clickable`}
              onClick={() => setIsRiskModalOpen(true)}
              title="Click to view mathematical formula and indicator breakdown"
            >
              <span>{riskScore}/100</span>
              <Calculator size={13} className="ml-1" />
            </button>
          </div>
          <div className="banner-stat-box">
            <span className="stat-label">Graph Entities</span>
            <span className="stat-number">{graphData.nodes.length} Nodes</span>
          </div>
          <div className="banner-stat-box">
            <span className="stat-label">Transactions</span>
            <span className="stat-number">{graphData.edges.length} Transfers</span>
          </div>
        </div>
      </div>

      {/* AI Forensic Executive Briefing Card (Phase 2 Feature) */}
      {aiSummary && (
        <AIBriefingCard aiSummary={aiSummary} investigation={investigation} />
      )}

      {/* Main Forensic Workspace: Graph on Top, Tabs Below */}
      <div className="forensic-workspace-layout">
        {/* Graph Canvas Section */}
        <section className="graph-workspace-panel">
          <GraphView
            graphData={graphData}
            highlightedPath={highlightedPath}
            onSelectNode={handleSelectNode}
            onSelectEdge={handleSelectEdge}
            onResetHighlight={handleResetHighlight}
          />
        </section>

        {/* Intelligence Panels & Tabs Section */}
        <section className="intelligence-workspace-tabs">
          <div className="tab-navigation-strip">
            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'ranked' ? 'active' : ''}`}
              onClick={() => setActiveTab('ranked')}
            >
              <span>Ranked End-Receivers</span>
              <span className="tab-badge">{rankedReceivers.length}</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <span>Forensic Timeline</span>
              <span className="tab-badge">{timeline.length}</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
              onClick={() => setActiveTab('findings')}
            >
              <span>Forensics &amp; Heuristics</span>
              <span className="tab-badge">{findings.length}</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              <span>Chain of Custody (Audit)</span>
            </button>

            <button
              type="button"
              className={`workspace-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
              onClick={() => setActiveTab('notes')}
            >
              <span>Case Notes</span>
            </button>
          </div>

          <div className="tab-content-area">
            {activeTab === 'ranked' && (
              <RankedTable
                ranked={rankedReceivers}
                onHighlightPath={handleHighlightPath}
                selectedAddress={selectedNodeData?.id}
              />
            )}

            {activeTab === 'timeline' && (
              <TimelineView
                timeline={timeline}
                onSelectTx={(txid) => {
                  const edge = graphData.edges?.find((e) => e.txid === txid);
                  if (edge) setSelectedEdgeData(edge);
                }}
              />
            )}

            {activeTab === 'findings' && (
              <FindingsPanel
                findings={findings}
                onHighlightNodes={(nodes) => setHighlightedPath(nodes || [])}
              />
            )}

            {activeTab === 'audit' && (
              <AuditPanel />
            )}

            {activeTab === 'notes' && (
              <div className="panel-card notes-panel">
                <div className="panel-header">
                  <div className="panel-title-group">
                    <h3>Case Notes &amp; Subpoena Log</h3>
                    <span className="panel-subtitle">Investigator observations &amp; audit commentary</span>
                  </div>
                  {!isEditingNotes ? (
                    <button
                      type="button"
                      className="btn-edit-notes"
                      onClick={() => setIsEditingNotes(true)}
                    >
                      <Edit3 size={14} />
                      <span>Edit Notes</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-save-notes"
                      onClick={handleSaveNotes}
                      disabled={savingNotes}
                    >
                      <Save size={14} />
                      <span>{savingNotes ? 'Saving...' : 'Save Notes'}</span>
                    </button>
                  )}
                </div>

                <div className="notes-body">
                  {isEditingNotes ? (
                    <textarea
                      className="notes-textarea"
                      rows={6}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Add case notes, warrant identifiers, or law enforcement remarks..."
                    />
                  ) : (
                    <div className="notes-display">
                      {investigation.notes ? (
                        <p className="notes-paragraph">{investigation.notes}</p>
                      ) : (
                        <p className="empty-subtext">No notes recorded yet. Click 'Edit Notes' to add case remarks.</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Wallet Details Drawer */}
      {selectedNodeData && (
        <WalletDetailsDrawer
          node={selectedNodeData}
          graphData={graphData}
          onClose={() => setSelectedNodeData(null)}
          onSelectNode={handleSelectNode}
          onSelectEdge={handleSelectEdge}
          onLaunchNewInvestigation={(targetAddr, chain) => {
            if (onOpenNewInvestigation) {
              onOpenNewInvestigation(targetAddr, chain);
            }
          }}
        />
      )}

      {/* Transaction Details Modal */}
      {selectedEdgeData && (
        <TransactionDetailsModal
          edge={selectedEdgeData}
          onClose={() => setSelectedEdgeData(null)}
          onInspectWallet={handleSelectNode}
        />
      )}

      {/* Risk Breakdown Modal */}
      <RiskBreakdownModal
        isOpen={isRiskModalOpen}
        onClose={() => setIsRiskModalOpen(false)}
        compositeRisk={compositeRisk}
        riskScore={riskScore}
      />
    </div>
  );
}
