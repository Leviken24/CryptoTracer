import { useState, useEffect } from 'react';
import axios from 'axios';
import GraphView from './components/GraphView';
import RankedTable from './components/RankedTable';
import FindingsPanel from './components/FindingsPanel';
import AuditPanel from './components/AuditPanel';
import './App.css';

export default function App() {
  const [inputAddress, setInputAddress] = useState('bc1qsrc0000000000000000000000000000000000');
  const [hops, setHops] = useState(4);
  const [mode, setMode] = useState('sample');
  const [loading, setLoading] = useState(false);
  const [traceData, setTraceData] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'live' | 'fallback' | 'error'
  const [highlightedPath, setHighlightedPath] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [activeTab, setActiveTab] = useState('ranked'); // 'ranked' | 'findings' | 'audit'

  // Load offline scenario on initial mount
  useEffect(() => {
    executeTrace(true, false);
  }, []);

  const executeTrace = async (isInitial = false, isDemo = false) => {
    setLoading(true);
    setStatusMessage(null);

    const payload = {
      input: inputAddress.trim(),
      hops: Number(hops),
      mode: isDemo ? 'sample' : mode,
    };

    try {
      // Fast timeout to avoid hanging if backend is not yet started by teammate P1
      const res = await axios.post('http://localhost:8000/trace', payload, {
        timeout: 2000,
        headers: { 'Content-Type': 'application/json' },
      });

      setTraceData(res.data);
      setStatusType('live');
      setStatusMessage('Live Trace Complete • Connected to FastAPI Backend (http://localhost:8000)');

      if (isDemo && res.data?.ranked?.[0]) {
        const top = res.data.ranked[0];
        setHighlightedPath(top.critical_path || [top.address]);
        setSelectedAddress(top.address);
        setActiveTab('ranked');
      }
    } catch {
      // Fallback seamlessly to local offline example
      try {
        const localRes = await fetch('/example_response.json');
        if (localRes.ok) {
          const data = await localRes.json();
          setTraceData(data);
          setStatusType('fallback');
          if (isInitial) {
            setStatusMessage('Offline Sample Scenario loaded (Ready for Demo).');
          } else {
            setStatusMessage('Backend offline at http://localhost:8000. Fallback data active — Demo fully operational.');
          }

          if (isDemo && data.ranked?.[0]) {
            const top = data.ranked[0];
            setHighlightedPath(top.critical_path || [top.address]);
            setSelectedAddress(top.address);
            setActiveTab('ranked');
          }
        }
      } catch (err) {
        console.error(err);
        setStatusType('error');
        setStatusMessage('Error loading trace dataset.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunDemo = () => {
    setInputAddress('bc1qsrc0000000000000000000000000000000000');
    setHops(4);
    setMode('sample');
    executeTrace(false, true);
  };

  const handleExportJSON = () => {
    if (!traceData) return;
    const blob = new Blob([JSON.stringify(traceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cryptotrace-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleHighlightPath = (pathNodes, targetAddress) => {
    setHighlightedPath(pathNodes || []);
    setSelectedAddress(targetAddress || null);
  };

  const handleHighlightNodes = (nodes) => {
    setHighlightedPath(nodes || []);
  };

  const handleResetHighlight = () => {
    setHighlightedPath([]);
    setSelectedAddress(null);
  };

  return (
    <div className="app-root">
      {/* Top Header Navigation */}
      <header className="top-nav">
        <div className="brand-section">
          <div className="brand-icon">₿</div>
          <div className="brand-titles">
            <h1>CryptoTrace</h1>
            <p>Blockchain Forensics &amp; End-Receiver Intelligence Engine</p>
          </div>
        </div>

        <div className="top-actions">
          <button type="button" className="btn-demo" onClick={handleRunDemo} disabled={loading}>
            ▶ Run Demo Flow
          </button>
          <button type="button" className="btn-nav-outline" onClick={handleExportJSON} disabled={!traceData}>
            📥 Export JSON
          </button>
          <button type="button" className="btn-nav-outline" onClick={handlePrintReport}>
            🖨️ Print Report
          </button>
        </div>
      </header>

      {/* Control Strip */}
      <section className="control-strip">
        <form
          className="trace-form-strip"
          onSubmit={(e) => {
            e.preventDefault();
            executeTrace(false, false);
          }}
        >
          <div className="input-group">
            <span className="input-label">Target Wallet / TXID:</span>
            <input
              type="text"
              className="text-input"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="e.g. bc1qsrc0000..."
              required
            />
          </div>

          <div className="select-group">
            <span className="input-label">Hops:</span>
            <select
              className="select-dropdown"
              value={hops}
              onChange={(e) => setHops(e.target.value)}
            >
              <option value="2">2 Hops</option>
              <option value="3">3 Hops</option>
              <option value="4">4 Hops (Recommended)</option>
              <option value="5">5 Hops</option>
              <option value="6">6 Hops</option>
            </select>
          </div>

          <div className="select-group">
            <span className="input-label">Mode:</span>
            <select
              className="select-dropdown"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="sample">Sample (Offline Synthetic)</option>
              <option value="live">Live (Blockstream API)</option>
            </select>
          </div>

          <button type="submit" className="btn-trace-main" disabled={loading}>
            {loading ? 'Analyzing Trail...' : '🔍 Trace Funds'}
          </button>
        </form>
      </section>

      {/* Status Bar */}
      {statusMessage && (
        <div className={`status-pill-banner ${statusType}`}>
          <span>{statusMessage}</span>
          <span>
            {statusType === 'live' ? '● Backend Live' : '○ Standalone Offline Mode'}
          </span>
        </div>
      )}

      {/* Main Workspace Grid */}
      <main className="dashboard-grid">
        {/* Left Column: Interactive Graph */}
        <div className="graph-column">
          <GraphView
            graphData={traceData?.graph}
            highlightedPath={highlightedPath}
            onSelectNode={(nodeId) => {
              setSelectedAddress(nodeId);
              // Find if this node is in ranked
              const rankedMatch = traceData?.ranked?.find((r) => r.address === nodeId);
              if (rankedMatch) {
                setHighlightedPath(rankedMatch.critical_path || [nodeId]);
                setActiveTab('ranked');
              } else {
                setHighlightedPath([nodeId]);
              }
            }}
            onResetHighlight={handleResetHighlight}
          />
        </div>

        {/* Right Column: Intelligence Panels */}
        <div className="sidebar-panels">
          <div className="tab-nav-strip">
            <button
              type="button"
              className={`tab-btn ${activeTab === 'ranked' ? 'active' : ''}`}
              onClick={() => setActiveTab('ranked')}
            >
              🎯 End-Receivers ({traceData?.ranked?.length || 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
              onClick={() => setActiveTab('findings')}
            >
              ⚠️ Forensic Findings ({traceData?.findings?.length || 0})
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
              onClick={() => setActiveTab('audit')}
            >
              🛡️ Audit Chain
            </button>
          </div>

          <div className="tab-content-area">
            {activeTab === 'ranked' && (
              <RankedTable
                ranked={traceData?.ranked || []}
                onHighlightPath={handleHighlightPath}
                selectedAddress={selectedAddress}
              />
            )}

            {activeTab === 'findings' && (
              <FindingsPanel
                findings={traceData?.findings || []}
                onHighlightNodes={handleHighlightNodes}
              />
            )}

            {activeTab === 'audit' && <AuditPanel />}
          </div>
        </div>
      </main>
    </div>
  );
}
