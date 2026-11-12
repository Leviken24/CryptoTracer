import React from 'react';
import { Plus, ShieldCheck, Wifi, WifiOff } from 'lucide-react';

export default function TopHeader({ title, subtitle, onOpenNewInvestigation, backendOnline = true }) {
  return (
    <header className="top-header">
      <div className="header-titles">
        <h1 className="page-heading">{title}</h1>
        {subtitle && <p className="page-subheading">{subtitle}</p>}
      </div>

      <div className="header-actions">
        {/* Backend Connectivity Status */}
        <div className={`connection-pill ${backendOnline ? 'online' : 'offline'}`}>
          {backendOnline ? (
            <>
              <span className="pulsing-dot" />
              <span className="status-label">Forensics API Live</span>
            </>
          ) : (
            <>
              <WifiOff size={13} />
              <span className="status-label">Offline Demo Mode</span>
            </>
          )}
        </div>

        {/* Primary New Investigation CTA */}
        {onOpenNewInvestigation && (
          <button
            type="button"
            className="btn-primary-action"
            onClick={onOpenNewInvestigation}
          >
            <Plus size={16} />
            <span>New Investigation</span>
          </button>
        )}
      </div>
    </header>
  );
}
