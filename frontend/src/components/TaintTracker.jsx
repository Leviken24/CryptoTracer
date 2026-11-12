function shortenAddress(addr) {
  if (!addr || addr.length <= 14) return addr || '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function TaintTracker({
  source = { label: 'Source wallet', taint: 100, address: '' },
  intermediate = { label: 'Intermediate wallet', taint: 60, address: '' },
  endReceiver = { label: 'Possible end receiver', taint: 47, address: '' },
}) {
  const srcTaint = Math.min(100, Math.max(0, Math.round(source?.taint ?? 100)));
  const midTaint = Math.min(100, Math.max(0, Math.round(intermediate?.taint ?? 60)));
  const endTaint = Math.min(100, Math.max(0, Math.round(endReceiver?.taint ?? 47)));

  return (
    <div className="taint-tracker-card">
      <div className="taint-tracker-header">
        <h4>Illustrative taint tracking</h4>
        <span className="taint-active-hint">
          {endReceiver.address ? `Tracking: ${shortenAddress(endReceiver.address)}` : 'Live Trail Attribution'}
        </span>
      </div>

      <div className="taint-bars-container">
        {/* Source Wallet */}
        <div className="taint-bar-row">
          <div className="taint-bar-meta">
            <span className="taint-wallet-name">
              {source.label || 'Source wallet'}{' '}
              {source.address && <span className="wallet-sub-hash">({shortenAddress(source.address)})</span>}
            </span>
            <span className="taint-val taint-green">{srcTaint}%</span>
          </div>
          <div className="taint-track-bg">
            <div
              className="taint-track-fill fill-green"
              style={{ width: `${srcTaint}%` }}
            />
          </div>
        </div>

        {/* Intermediate Wallet */}
        <div className="taint-bar-row">
          <div className="taint-bar-meta">
            <span className="taint-wallet-name">
              {intermediate.label || 'Intermediate wallet'}{' '}
              {intermediate.address && (
                <span className="wallet-sub-hash">({shortenAddress(intermediate.address)})</span>
              )}
            </span>
            <span className="taint-val taint-amber">{midTaint}%</span>
          </div>
          <div className="taint-track-bg">
            <div
              className="taint-track-fill fill-amber"
              style={{ width: `${midTaint}%` }}
            />
          </div>
        </div>

        {/* Possible End Receiver */}
        <div className="taint-bar-row">
          <div className="taint-bar-meta">
            <span className="taint-wallet-name">
              {endReceiver.label || 'Possible end receiver'}{' '}
              {endReceiver.address && (
                <span className="wallet-sub-hash">({shortenAddress(endReceiver.address)})</span>
              )}
            </span>
            <span className="taint-val taint-green">{endTaint}%</span>
          </div>
          <div className="taint-track-bg">
            <div
              className="taint-track-fill fill-green"
              style={{ width: `${endTaint}%` }}
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
