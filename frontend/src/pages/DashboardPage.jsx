import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  FolderSearch,
  Activity,
  ShieldAlert,
  Wallet,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import TopHeader from '../components/TopHeader';

export default function DashboardPage({ onOpenNewInvestigation }) {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total_investigations: 0,
    active_investigations: 0,
    completed_investigations: 0,
    wallets_analyzed: 0,
    suspicious_wallets: 0,
    high_risk_destinations: 0,
    activity_timeline: [],
  });

  const [recentInvestigations, setRecentInvestigations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(true);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, invRes] = await Promise.all([
        axios.get('http://localhost:8000/api/stats', { timeout: 3000 }),
        axios.get('http://localhost:8000/api/investigations', { timeout: 3000 }),
      ]);

      setStats(statsRes.data);
      setRecentInvestigations(invRes.data.slice(0, 6));
      setBackendOnline(true);
    } catch (err) {
      console.warn('Backend unavailable, using baseline data:', err);
      setBackendOnline(false);

      // Fallback baseline data if backend is offline
      setStats({
        total_investigations: 2,
        active_investigations: 1,
        completed_investigations: 1,
        wallets_analyzed: 44,
        suspicious_wallets: 12,
        high_risk_destinations: 4,
        activity_timeline: [
          { date: 'Nov 06', investigations: 1, volume_btc: 4.25 },
          { date: 'Nov 07', investigations: 2, volume_btc: 8.5 },
          { date: 'Nov 08', investigations: 1, volume_btc: 3.1 },
          { date: 'Nov 09', investigations: 3, volume_btc: 12.8 },
          { date: 'Nov 10', investigations: 2, volume_btc: 6.9 },
          { date: 'Nov 11', investigations: 4, volume_btc: 16.4 },
          { date: 'Nov 12', investigations: 2, volume_btc: 7.2 },
        ],
      });

      setRecentInvestigations([
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
          created_at: Math.floor(Date.now() / 1000) - 3600 * 4,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const getRiskClass = (score) => {
    if (score >= 80) return 'risk-badge-critical';
    if (score >= 60) return 'risk-badge-high';
    if (score >= 40) return 'risk-badge-medium';
    return 'risk-badge-low';
  };

  const handleLaunchDemoCase = () => {
    if (recentInvestigations.length > 0) {
      navigate(`/investigations/${recentInvestigations[0].id}`);
    } else if (onOpenNewInvestigation) {
      onOpenNewInvestigation('bc1qsrc0000000000000000000000000000000000', 'bitcoin');
    }
  };

  const maxVolume = Math.max(...(stats.activity_timeline || []).map((t) => t.volume_btc), 10);

  return (
    <div className="page-container dashboard-page">
      <TopHeader
        title="Forensic Operations Dashboard"
        subtitle="Autonomous intelligence overview &amp; active blockchain threat monitoring"
        onOpenNewInvestigation={onOpenNewInvestigation}
        backendOnline={backendOnline}
      />

      <div className="dashboard-content">
        {/* Metric Cards Row */}
        <div className="stats-cards-grid">
          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Total Investigations</span>
              <div className="stat-icon-wrap primary">
                <FolderSearch size={18} />
              </div>
            </div>
            <div className="stat-value">{stats.total_investigations}</div>
            <div className="stat-meta">
              <span className="stat-highlight">{stats.active_investigations} Active</span>
              <span className="stat-subtext">• {stats.completed_investigations} Archived</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Wallets Ingested</span>
              <div className="stat-icon-wrap accent">
                <Wallet size={18} />
              </div>
            </div>
            <div className="stat-value">{stats.wallets_analyzed}</div>
            <div className="stat-meta">
              <span className="stat-subtext">Across Multi-Hop Transaction Graphs</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">Suspicious Wallets Identified</span>
              <div className="stat-icon-wrap warning">
                <ShieldAlert size={18} />
              </div>
            </div>
            <div className="stat-value warning">{stats.suspicious_wallets}</div>
            <div className="stat-meta">
              <span className="stat-subtext">Mixers, Peel Nodes &amp; Structuring</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-header">
              <span className="stat-title">High-Risk Destinations</span>
              <div className="stat-icon-wrap danger">
                <AlertTriangle size={18} />
              </div>
            </div>
            <div className="stat-value danger">{stats.high_risk_destinations}</div>
            <div className="stat-meta">
              <span className="stat-subtext">Sanctioned &amp; Unhosted Cashouts</span>
            </div>
          </div>
        </div>

        {/* Charts & Quick Actions Row */}
        <div className="dashboard-two-col-grid">
          {/* Activity Timeline Chart */}
          <div className="panel-card chart-panel">
            <div className="panel-header">
              <div className="panel-title-group">
                <h3>Forensic Activity &amp; Ingestion Volume</h3>
                <span className="panel-subtitle">Rolling 7-day transaction tracing volume</span>
              </div>
              <span className="chart-legend-badge">
                <TrendingUp size={14} /> Total: ~59.1 BTC
              </span>
            </div>

            <div className="chart-container-bars">
              {(stats.activity_timeline || []).map((point, idx) => {
                const heightPct = Math.round((point.volume_btc / maxVolume) * 100);
                return (
                  <div key={idx} className="chart-bar-column">
                    <div className="bar-wrapper">
                      <div
                        className="chart-bar-fill"
                        style={{ height: `${heightPct}%` }}
                        title={`${point.volume_btc} BTC (${point.investigations} traces)`}
                      />
                    </div>
                    <span className="chart-bar-date">{point.date}</span>
                    <span className="chart-bar-val">{point.volume_btc}B</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Investigation Launcher Banner */}
          <div className="panel-card quick-launcher-card">
            <div className="launcher-badge">AUTONOMOUS FORENSICS</div>
            <h3>Trace Suspicious Transaction or Address</h3>
            <p>
              Instantly construct a multi-hop directed graph, run peel-chain and mixer heuristics,
              rank end-receivers, and generate tamper-evident audit records.
            </p>

            <div className="launcher-features-list">
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-icon" />
                <span>Supports Bitcoin &amp; Ethereum (EVM) trails</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-icon" />
                <span>Detects dusting attacks &amp; look-alike poisoning</span>
              </div>
              <div className="feature-item">
                <CheckCircle2 size={16} className="feature-icon" />
                <span>Generates verifiable PDF forensic dossiers</span>
              </div>
            </div>

            <div className="launcher-actions-row">
              <button
                type="button"
                className="btn-launcher-cta"
                onClick={onOpenNewInvestigation}
              >
                <Plus size={16} />
                <span>New Investigation</span>
              </button>

              <button
                type="button"
                className="btn-demo-cta"
                onClick={handleLaunchDemoCase}
                title="Open the pre-configured 5-hop Bitcoin demo scenario"
              >
                <Sparkles size={16} />
                <span>Demo Investigation</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Investigations Table */}
        <div className="panel-card recent-cases-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h3>Recent Forensic Investigations</h3>
              <span className="panel-subtitle">Persisted SQLite investigation ledger</span>
            </div>
            <button
              type="button"
              className="btn-view-all"
              onClick={() => navigate('/investigations')}
            >
              <span>View All Cases</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          {recentInvestigations.length === 0 ? (
            <div className="empty-state-box">
              <FolderSearch size={32} className="empty-icon" />
              <p>No investigations created yet.</p>
              <button
                type="button"
                className="btn-primary-action"
                onClick={onOpenNewInvestigation}
              >
                Start First Investigation
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="custom-data-table">
                <thead>
                  <tr>
                    <th>Case Reference</th>
                    <th>Investigation Title</th>
                    <th>Target Asset</th>
                    <th>Network</th>
                    <th>Risk Rating</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvestigations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="code-font">{inv.case_id}</td>
                      <td className="table-cell-title">
                        <strong>{inv.title}</strong>
                      </td>
                      <td className="code-font table-cell-target">
                        {inv.target ? `${inv.target.slice(0, 8)}...${inv.target.slice(-6)}` : 'N/A'}
                      </td>
                      <td>
                        <span className={`chain-pill ${inv.blockchain || 'bitcoin'}`}>
                          {inv.blockchain === 'ethereum' ? 'Ξ Ethereum' : '₿ Bitcoin'}
                        </span>
                      </td>
                      <td>
                        <span className={`risk-pill ${getRiskClass(inv.risk_score || 0)}`}>
                          {inv.risk_score || 0}/100
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${inv.status || 'completed'}`}>
                          {inv.status || 'completed'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn-open-workspace"
                          onClick={() => navigate(`/investigations/${inv.id}`)}
                          title="Open Case Workspace"
                        >
                          <span>Open Workspace</span>
                          <ArrowUpRight size={13} />
                        </button>
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
