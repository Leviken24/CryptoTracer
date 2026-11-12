import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

export default function App() {
  const [inputAddress, setInputAddress] = useState('bc1qsrc0000000000000000000000000000000000');
  const [hops, setHops] = useState(4);
  const [mode, setMode] = useState('sample');
  const [loading, setLoading] = useState(false);
  const [responseJson, setResponseJson] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'live' | 'fallback' | 'error'

  // Load example response on initial load so the user sees data right away
  useEffect(() => {
    fetchFallbackData(true);
  }, []);

  const fetchFallbackData = async (isInitial = false) => {
    try {
      const res = await fetch('/example_response.json');
      if (res.ok) {
        const data = await res.json();
        setResponseJson(data);
        setStatusType('fallback');
        if (isInitial) {
          setStatusMessage('Loaded offline example_response.json as initial preview.');
        } else {
          setStatusMessage('Backend (http://localhost:8000) not responding. Automatically fell back to offline example_response.json so you are never blocked.');
        }
      } else {
        throw new Error('Failed to load local example_response.json');
      }
    } catch (err) {
      console.error(err);
      setStatusType('error');
      setStatusMessage('Could not reach backend or local example_response.json.');
    }
  };

  const handleTrace = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    const payload = {
      input: inputAddress.trim(),
      hops: Number(hops),
      mode: mode,
    };

    try {
      // 2.5s timeout for fast fallback if backend is offline
      const res = await axios.post('http://localhost:8000/trace', payload, {
        timeout: 2500,
        headers: { 'Content-Type': 'application/json' },
      });

      setResponseJson(res.data);
      setStatusType('live');
      setStatusMessage('Trace successful from live backend (http://localhost:8000).');
    } catch (error) {
      console.warn('Backend call failed, falling back to local example response:', error.message);
      await fetchFallbackData(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-section">
          <h1>CryptoTrace</h1>
          <p>Blockchain Forensics &amp; End-Receiver Intelligence Engine</p>
        </div>
        <div className="badge-tag">P4 Frontend - Step 1</div>
      </header>

      <div className="trace-form-card">
        <form onSubmit={handleTrace} className="form-grid">
          <div className="form-group">
            <label htmlFor="address-input">Target BTC Address or TXID</label>
            <input
              id="address-input"
              className="input-field"
              type="text"
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              placeholder="Enter Bitcoin address or 64-hex txid..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="hops-select">Max Hops</label>
            <select
              id="hops-select"
              className="select-field"
              value={hops}
              onChange={(e) => setHops(e.target.value)}
            >
              <option value="1">1 Hop</option>
              <option value="2">2 Hops</option>
              <option value="3">3 Hops</option>
              <option value="4">4 Hops (Recommended)</option>
              <option value="5">5 Hops</option>
              <option value="6">6 Hops</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="mode-select">Execution Mode</label>
            <select
              id="mode-select"
              className="select-field"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="sample">Sample (Offline)</option>
              <option value="live">Live (Blockstream API)</option>
            </select>
          </div>

          <button type="submit" className="btn-trace" disabled={loading}>
            {loading ? 'Tracing...' : 'Trace'}
          </button>
        </form>
      </div>

      {statusMessage && (
        <div className={`status-banner ${statusType}`}>
          <span>{statusMessage}</span>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>
            {statusType === 'live' ? '● Live API' : '○ Offline Cache Mode'}
          </span>
        </div>
      )}

      <div className="json-display-card">
        <div className="json-header">
          <span>Raw API Response (Contract: Section 5)</span>
          {responseJson && (
            <span>
              Nodes: {responseJson.graph?.nodes?.length || 0} | Edges:{' '}
              {responseJson.graph?.edges?.length || 0} | Findings:{' '}
              {responseJson.findings?.length || 0} | Ranked:{' '}
              {responseJson.ranked?.length || 0}
            </span>
          )}
        </div>
        {responseJson ? (
          <pre className="json-pre">{JSON.stringify(responseJson, null, 2)}</pre>
        ) : (
          <div className="empty-state">
            <p>Click "Trace" to inspect the raw forensic graph JSON.</p>
          </div>
        )}
      </div>
    </div>
  );
}
