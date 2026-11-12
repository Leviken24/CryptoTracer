import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FolderSearch,
  Search,
  Filter,
  Plus,
  Trash2,
  FileDown,
  ArrowUpRight,
  ShieldAlert,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import TopHeader from '../components/TopHeader';
import DeleteConfirmModal from '../components/DeleteConfirmModal';

export default function InvestigationsPage({ onOpenNewInvestigation }) {
  const navigate = useNavigate();

  const [investigations, setInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState('all');

  // Deletion modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInvestigations = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (chainFilter !== 'all') params.blockchain = chainFilter;
      if (searchQuery.trim()) params.q = searchQuery.trim();

      const res = await axios.get('http://localhost:8000/api/investigations', {
        params,
        timeout: 4000,
      });
      setInvestigations(res.data);
      setBackendOnline(true);
    } catch (err) {
      console.warn('Backend unavailable, using fallback:', err);
      setBackendOnline(false);
      setInvestigations([
        {
          id: 1,
          case_id: 'CT-CASE-2026-BTC01',
          title: 'Ransomware Extortion & Peel Chain Cashout',
          blockchain: 'bitcoin',
          input_type: 'address',
          target: 'bc1qsrc0000000000000000000000000000000000',
          hops: 4,
          risk_score: 91,
          status: 'completed',
          notes: 'Target received extortion ransom payment. 8-split mixer pattern and subsequent 5-stage peel chain liquidating into ExchangeX deposit.',
          created_at: Math.floor(Date.now() / 1000) - 86400 * 2,
        },
        {
          id: 2,
          case_id: 'CT-CASE-2026-ETH02',
          title: 'DeFi Flash Loan Exploit & Mixer Hop',
          blockchain: 'ethereum',
          input_type: 'address',
          target: '0x71C8fb9697d744876ae1529d7694901f40d226a4',
          hops: 3,
          risk_score: 84,
          status: 'active',
          notes: 'Suspect wallet routed 25 ETH through anonymity pool and Uniswap router to Binance hot wallet.',
          created_at: Math.floor(Date.now() / 1000) - 3600 * 4,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvestigations();
  }, [statusFilter, chainFilter, searchQuery]);

  const handleDeleteClick = (e, inv) => {
    e.stopPropagation();
    setCaseToDelete(inv);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!caseToDelete) return;
    setDeleting(true);
    try {
      await axios.delete(`http://localhost:8000/api/investigations/${caseToDelete.id}`);
      setDeleteModalOpen(false);
      setCaseToDelete(null);
      fetchInvestigations();
    } catch (err) {
      console.error('Failed to delete investigation:', err);
      alert('Failed to delete investigation from database.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadPdf = (e, invId, caseId) => {
    e.stopPropagation();
    window.open(`http://localhost:8000/api/investigations/${invId}/pdf`, '_blank');
  };

  const getRiskClass = (score) => {
    if (score >= 80) return 'risk-badge-critical';
    if (score >= 60) return 'risk-badge-high';
    if (score >= 40) return 'risk-badge-medium';
    return 'risk-badge-low';
  };

  const formatDate = (ts) => {
    if (!ts) return 'N/A';
    return new Date(ts * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container investigations-page">
      <TopHeader
        title="Forensic Investigations Repository"
        subtitle="Manage, search, reopen, and export tamper-evident blockchain cases"
        onOpenNewInvestigation={onOpenNewInvestigation}
        backendOnline={backendOnline}
      />

      <div className="investigations-content">
        {/* Controls Bar: Search, Filters, Count */}
        <div className="investigations-filter-bar">
          <div className="search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Case ID, title, target address or txid..."
            />
          </div>

          <div className="filter-controls-group">
            <div className="filter-select-wrap">
              <span className="filter-label">Status:</span>
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Cases</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="filter-select-wrap">
              <span className="filter-label">Chain:</span>
              <select
                className="filter-select"
                value={chainFilter}
                onChange={(e) => setChainFilter(e.target.value)}
              >
                <option value="all">All Blockchains</option>
                <option value="bitcoin">Bitcoin</option>
                <option value="ethereum">Ethereum</option>
              </select>
            </div>

            <button
              type="button"
              className="btn-refresh-table"
              onClick={fetchInvestigations}
              title="Refresh Cases"
            >
              <RefreshCw size={14} className={loading ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {/* Investigations List */}
        {investigations.length === 0 ? (
          <div className="empty-state-card">
            <FolderSearch size={40} className="empty-icon" />
            <h3>No Investigations Found</h3>
            <p>
              {searchQuery || statusFilter !== 'all' || chainFilter !== 'all'
                ? 'No cases match your filter criteria. Try adjusting your search query or filters.'
                : 'Your SQLite case repository is currently empty. Start by creating a new investigation.'}
            </p>
            <button
              type="button"
              className="btn-primary-action"
              onClick={onOpenNewInvestigation}
            >
              <Plus size={16} />
              <span>New Investigation</span>
            </button>
          </div>
        ) : (
          <div className="investigations-cards-grid">
            {investigations.map((inv) => (
              <div
                key={inv.id}
                className="investigation-card"
                onClick={() => navigate(`/investigations/${inv.id}`)}
              >
                <div className="card-top-strip">
                  <span className="case-id-badge code-font">{inv.case_id}</span>
                  <div className="card-top-badges">
                    <span className={`chain-pill ${inv.blockchain || 'bitcoin'}`}>
                      {inv.blockchain === 'ethereum' ? 'Ξ Ethereum' : '₿ Bitcoin'}
                    </span>
                    <span className={`status-pill ${inv.status || 'completed'}`}>
                      {inv.status || 'completed'}
                    </span>
                  </div>
                </div>

                <div className="card-main-content">
                  <h3 className="card-case-title">{inv.title}</h3>
                  <div className="card-target-row">
                    <span className="target-label">Target:</span>
                    <span className="target-address code-font">
                      {inv.target ? `${inv.target.slice(0, 14)}...${inv.target.slice(-8)}` : 'N/A'}
                    </span>
                  </div>

                  {inv.notes && (
                    <p className="card-notes-preview">{inv.notes}</p>
                  )}

                  <div className="card-meta-row">
                    <div className="card-risk-indicator">
                      <span className="meta-label">Assessed Risk:</span>
                      <span className={`risk-pill ${getRiskClass(inv.risk_score)}`}>
                        {inv.risk_score}/100
                      </span>
                    </div>

                    <div className="card-hops-indicator">
                      <span className="meta-label">Hop Radius:</span>
                      <span className="hops-num">{inv.hops || 4} Hops</span>
                    </div>

                    <div className="card-date-indicator">
                      <Clock size={12} />
                      <span>{formatDate(inv.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="card-actions-footer" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="btn-card-reopen"
                    onClick={() => navigate(`/investigations/${inv.id}`)}
                  >
                    <span>Reopen Analysis</span>
                    <ArrowUpRight size={14} />
                  </button>

                  <div className="card-secondary-actions">
                    <button
                      type="button"
                      className="btn-card-icon"
                      onClick={(e) => handleDownloadPdf(e, inv.id, inv.case_id)}
                      title="Download PDF Investigation Dossier"
                    >
                      <FileDown size={15} />
                    </button>
                    <button
                      type="button"
                      className="btn-card-icon delete-btn"
                      onClick={(e) => handleDeleteClick(e, inv)}
                      title="Permanently Delete Case"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        caseTitle={caseToDelete?.title}
        loading={deleting}
      />
    </div>
  );
}
