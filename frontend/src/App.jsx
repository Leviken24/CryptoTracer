import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EvidenceProvider } from './context/EvidenceContext';
import Sidebar from './components/Sidebar';
import NewInvestigationModal from './components/NewInvestigationModal';

// Pages
import DashboardPage from './pages/DashboardPage';
import InvestigationsPage from './pages/InvestigationsPage';
import InvestigationDetailPage from './pages/InvestigationDetailPage';
import TransactionExplorerPage from './pages/TransactionExplorerPage';
import RiskIntelligencePage from './pages/RiskIntelligencePage';
import ReportsEvidencePage from './pages/ReportsEvidencePage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';

import './App.css';

function ProtectedLayout({ children, onOpenNewInvestigation }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-viewport">{children}</main>
    </div>
  );
}

export default function App() {
  const [newInvModalOpen, setNewInvModalOpen] = useState(false);
  const [presetTarget, setPresetTarget] = useState(null);

  const handleOpenNewInvestigation = (targetAddr, chain) => {
    if (targetAddr) {
      setPresetTarget({ target: targetAddr, blockchain: chain || 'bitcoin' });
    } else {
      setPresetTarget(null);
    }
    setNewInvModalOpen(true);
  };

  return (
    <AuthProvider>
      <EvidenceProvider>
        <Router>
          <Routes>
            {/* Public Login Route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Main Workspace Routes */}
            <Route
              path="/"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <DashboardPage onOpenNewInvestigation={() => handleOpenNewInvestigation()} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/investigations"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <InvestigationsPage onOpenNewInvestigation={() => handleOpenNewInvestigation()} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/investigations/:id"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <InvestigationDetailPage
                    onOpenNewInvestigation={handleOpenNewInvestigation}
                  />
                </ProtectedLayout>
              }
            />

            <Route
              path="/explorer"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <TransactionExplorerPage onOpenNewInvestigation={() => handleOpenNewInvestigation()} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/risk-intelligence"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <RiskIntelligencePage onOpenNewInvestigation={() => handleOpenNewInvestigation()} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/reports-evidence"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <ReportsEvidencePage onOpenNewInvestigation={() => handleOpenNewInvestigation()} />
                </ProtectedLayout>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedLayout onOpenNewInvestigation={handleOpenNewInvestigation}>
                  <SettingsPage onOpenNewInvestigation={() => handleOpenNewInvestigation()} />
                </ProtectedLayout>
              }
            />

            {/* Fallback to Dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Global New Investigation Modal */}
          <NewInvestigationModal
            isOpen={newInvModalOpen}
            onClose={() => setNewInvModalOpen(false)}
            presetTarget={presetTarget}
          />
        </Router>
      </EvidenceProvider>
    </AuthProvider>
  );
}
