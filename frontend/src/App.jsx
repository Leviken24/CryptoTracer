import { useState, useEffect } from 'react';
import axios from 'axios';
import GraphView from './components/GraphView';
import RankedTable from './components/RankedTable';
import FindingsPanel from './components/FindingsPanel';
import AuditPanel from './components/AuditPanel';
import AddressDossier from './components/AddressDossier';
import TaintTracker from './components/TaintTracker';
import ReportView from './components/ReportView';
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
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [activeTab, setActiveTab] = useState('ranked'); // 'ranked' | 'findings' | 'audit' | 'dossier'
  const [showReport, setShowReport] = useState(false);
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('SCENARIO_01');

  // Load 75 scenarios list + initial offline scenario on mount
  useEffect(() => {
    axios
      .get('http://localhost:8000/scenarios', { timeout: 2000 })
      .then((res) => {
        if (Array.isArray(res.data)) {
          setScenarios(res.data);
        }
      })
      .catch(() => {});
    executeTrace(true, false);
  }, []);

  const executeTrace = async (isInitial = false, isDemo = false, overrideInput = null) => {
    setLoading(true);
    setStatusMessage(null);

    const targetInput = overrideInput !== null ? overrideInput : inputAddress.trim();
    const payload = {
      input: targetInput,
      hops: Number(hops),
      mode: isDemo ? 'sample' : mode,
    };

    try {
      const res = await axios.post('http://localhost:8000/trace', payload, {
        timeout: 2000,
        headers: { 'Content-Type': 'application/json' },
      });

      setTraceData(res.data);
      setStatusType('live');
      setStatusMessage('Live Trace Complete • Connected to FastAPI Backend (http://localhost:8000)');

      if (res.data?.ranked?.[0]) {
        const top = res.data.ranked[0];
        setHighlightedPath(top.critical_path || [top.address]);
        setSelectedAddress(top.address);
        const matchNode = res.data.graph?.nodes?.find((n) => n.id === top.address);
        setSelectedNodeData(matchNode || null);
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

          if (data.ranked?.[0]) {
            const top = data.ranked[0];
            setHighlightedPath(top.critical_path || [top.address]);
            setSelectedAddress(top.address);
            const matchNode = data.graph?.nodes?.find((n) => n.id === top.address);
            setSelectedNodeData(matchNode || null);
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
    setSelectedScenarioId('SCENARIO_01');
    setInputAddress('bc1qsrc0000000000000000000000000000000000');
    setHops(4);
    setMode('sample');
    executeTrace(false, true, 'bc1qsrc0000000000000000000000000000000000');
  };

  const handleSelectScenario = (scenarioId) => {
    setSelectedScenarioId(scenarioId);
    const found = scenarios.find((s) => s.id === scenarioId);
    const addr = found ? found.source : scenarioId;
    setInputAddress(addr);
    setMode('sample');
    executeTrace(false, true, addr);
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

  const handleHighlightPath = (pathNodes, targetAddress) => {
    setHighlightedPath(pathNodes || []);
    setSelectedAddress(targetAddress || null);
    const matchNode = traceData?.graph?.nodes?.find((n) => n.id === targetAddress);
    setSelectedNodeData(matchNode || null);
  };

  const handleHighlightNodes = (nodes) => {
    setHighlightedPath(nodes || []);
  };

  const handleResetHighlight = () => {
    setHighlightedPath([]);
    setSelectedAddress(null);
  };

  const currentRankedMatch = traceData?.ranked?.find((r) => r.address === selectedAddress);

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
          <button type="button" className="btn-nav-outline" onClick={() => setShowReport(true)}>
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
          {scenarios.length > 0 && (
            <div className="select-group">
              <span className="input-label">Dataset ({scenarios.length} Cases):</span>
              <select
                className="select-dropdown"
                value={selectedScenarioId}
                onChange={(e) => handleSelectScenario(e.target.value)}
                style={{ maxWidth: '280px' }}
              >
                {scenarios.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="input-group">
            <span className="input-label">Target Wallet / TXID:</span>
            <input
              type="text"
              className="text-input"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="e.g. bc1qsrc0000... or SCENARIO_05"
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
        {/* Left Column: Interactive Graph + Taint Tracker */}
        <div className="graph-column">
          <GraphView
            graphData={traceData?.graph}
            highlightedPath={highlightedPath}
            onSelectNode={(nodeId) => {
              setSelectedAddress(nodeId);
              const node = traceData?.graph?.nodes?.find((n) => n.id === nodeId);
              setSelectedNodeData(node || null);

              const rankedMatch = traceData?.ranked?.find((r) => r.address === nodeId);
              if (rankedMatch) {
                setHighlightedPath(rankedMatch.critical_path || [nodeId]);
              } else {
                setHighlightedPath([nodeId]);
              }
            }}
            onResetHighlight={handleResetHighlight}
          />

          {/* Illustrative Taint Tracking Component (Images 1 & 2) */}
          <TaintTracker sourceTaint={100} intermediateTaint={60} endReceiverTaint={47} />
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
              className={`tab-btn ${activeTab === 'dossier' ? 'active' : ''}`}
              onClick={() => setActiveTab('dossier')}
            >
              📑 Wallet Dossier
            </button>
            <button
              type="button"
              className={`tab-btn ${activeTab === 'findings' ? 'active' : ''}`}
              onClick={() => setActiveTab('findings')}
            >
              ⚠️ Findings ({traceData?.findings?.length || 0})
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

            {activeTab === 'dossier' && (
              <AddressDossier
                nodeData={selectedNodeData}
                rankedItem={currentRankedMatch}
                onHighlightTrail={() => {
                  if (currentRankedMatch?.critical_path) {
                    setHighlightedPath(currentRankedMatch.critical_path);
                  } else if (selectedAddress) {
                    setHighlightedPath([selectedAddress]);
                  }
                }}
                onPrintReport={() => setShowReport(true)}
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

      {/* Printable Report Modal View (Image 10) */}
      {showReport && (
        <ReportView traceData={traceData} onClose={() => setShowReport(false)} />
      )}
    </div>
  );
}
