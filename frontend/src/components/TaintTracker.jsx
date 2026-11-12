export default function TaintTracker({ sourceTaint = 100, intermediateTaint = 60, endReceiverTaint = 47 }) {
  return (
    <div className="taint-tracker-card">
      <div className="taint-tracker-header">
        <h4>Illustrative taint tracking</h4>
      </div>

      <div className="taint-bars-container">
        {/* Source Wallet */}
        <div className="taint-bar-row">
          <div className="taint-bar-meta">
            <span className="taint-wallet-name">Source wallet</span>
            <span className="taint-val taint-green">{sourceTaint}%</span>
          </div>
          <div className="taint-track-bg">
            <div
              className="taint-track-fill fill-green"
              style={{ width: `${sourceTaint}%` }}
            />
          </div>
        </div>

        {/* Intermediate Wallet */}
        <div className="taint-bar-row">
          <div className="taint-bar-meta">
            <span className="taint-wallet-name">Intermediate wallet</span>
            <span className="taint-val taint-amber">{intermediateTaint}%</span>
          </div>
          <div className="taint-track-bg">
            <div
              className="taint-track-fill fill-amber"
              style={{ width: `${intermediateTaint}%` }}
            />
          </div>
        </div>

        {/* Possible End Receiver */}
        <div className="taint-bar-row">
          <div className="taint-bar-meta">
            <span className="taint-wallet-name">Possible end receiver</span>
            <span className="taint-val taint-green">{endReceiverTaint}%</span>
          </div>
          <div className="taint-track-bg">
            <div
              className="taint-track-fill fill-green"
              style={{ width: `${endReceiverTaint}%` }}
            />
          </div>
        </div>
      </div>

      <div className="taint-disclaimer">
        Illustrative values based on the sample scenario's intended result. These percentages are not measured evidence from a live wallet.
      </div>
    </div>
  );
}
