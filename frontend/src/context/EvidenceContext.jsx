import React, { createContext, useContext, useState, useEffect } from 'react';

const EvidenceContext = createContext(null);

const STORAGE_KEY = 'cryptotrace_evidence_board_items';

const INITIAL_DEMO_ITEMS = [
  {
    id: 'EVD-001',
    type: 'WALLET',
    title: 'Root Inflow / Extortion Deposit Address',
    reference: 'bc1qsrc0000000000000000000000000000000000',
    details: 'Initial extortion payment received (4.05 BTC). Immediate equal-denomination fan-out observed.',
    timestamp: '2026-11-12 04:26:40 UTC',
    source: 'On-chain Blockstream / Mempool verification (Simulated Demo)',
    tags: ['EXTORTION', 'SOURCE', 'HIGH_RISK'],
  },
  {
    id: 'EVD-002',
    type: 'TRANSACTION',
    title: 'High-Entropy Mixer Ingress Transfer',
    reference: 'txfanout00000000000000000000000000000000000000000000000000000001',
    details: 'Split 4.05 BTC into 8 equal outputs (0.5062 BTC each) across intermediate unlinked wallets.',
    timestamp: '2026-11-12 04:30:00 UTC',
    source: 'Ledger Block 824102 / Transaction Graph Reconstruction',
    tags: ['MIXER_FAN_OUT', 'OBFUSCATION'],
  },
  {
    id: 'EVD-003',
    type: 'FINDING',
    title: '5-Hop Peel-Chain Structuring Alert',
    reference: 'Rule: PEEL_CHAIN_DEPTH >= 3',
    details: 'Detected sequential asymmetric peeling where 85%+ continued downstream while <15% peeled to change wallets.',
    timestamp: '2026-11-12 04:45:00 UTC',
    source: 'CryptoTrace Heuristic Detector Engine v1.0',
    tags: ['PEEL_CHAIN', 'STRUCTURING'],
  },
  {
    id: 'EVD-004',
    type: 'WALLET',
    title: 'Liquidated Centralized Exchange Deposit Cluster',
    reference: 'bc1qexch333333333333333333333333333333333',
    details: 'Consolidated 47% of initial tainted outflow. Identified as Binance Deposit Cluster.',
    timestamp: '2026-11-12 05:10:00 UTC',
    source: 'Intelligence Entity Registry (Source: WalletExplorer / CISA Advisory)',
    tags: ['EXCHANGE_DEPOSIT', 'SUBPOENA_TARGET'],
  },
];

export function EvidenceProvider({ children }) {
  const [evidenceItems, setEvidenceItems] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to parse evidence items from storage:', e);
    }
    return INITIAL_DEMO_ITEMS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(evidenceItems));
    } catch (e) {
      console.warn('Failed to save evidence items to storage:', e);
    }
  }, [evidenceItems]);

  const addEvidenceItem = (item) => {
    const newItem = {
      id: item.id || `EVD-${Date.now().toString().slice(-4)}`,
      type: item.type || 'NOTE',
      title: item.title || 'Forensic Evidence Item',
      reference: item.reference || 'N/A',
      details: item.details || '',
      timestamp: item.timestamp || new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
      source: item.source || 'CryptoTrace Forensics Suite',
      tags: item.tags || [],
    };

    setEvidenceItems((prev) => [newItem, ...prev]);
    return newItem;
  };

  const removeEvidenceItem = (id) => {
    setEvidenceItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearEvidence = () => {
    setEvidenceItems([]);
  };

  const resetToDemoEvidence = () => {
    setEvidenceItems(INITIAL_DEMO_ITEMS);
  };

  const isItemPinned = (reference) => {
    if (!reference) return false;
    return evidenceItems.some((i) => i.reference === reference);
  };

  return (
    <EvidenceContext.Provider
      value={{
        evidenceItems,
        addEvidenceItem,
        removeEvidenceItem,
        clearEvidence,
        resetToDemoEvidence,
        isItemPinned,
        pinnedCount: evidenceItems.length,
      }}
    >
      {children}
    </EvidenceContext.Provider>
  );
}

export function useEvidence() {
  const ctx = useContext(EvidenceContext);
  if (!ctx) {
    throw new Error('useEvidence must be used within an EvidenceProvider');
  }
  return ctx;
}
