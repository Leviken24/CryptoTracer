import React, { useState } from 'react';
import { Search, ArrowRight, ShieldCheck, ShieldAlert, Coins, ExternalLink, Plus, Clock, Copy, Check } from 'lucide-react';
import TopHeader from '../components/TopHeader';

const SAMPLE_SEARCHES = [
  { label: 'Ransomware Extortion Source', query: 'bc1qsrc0000000000000000000000000000000000', type: 'address', chain: 'bitcoin' },
  { label: 'Mixer Fan-Out Output (M1)', query: 'bc1qmix1000000000000000000000000000000000', type: 'address', chain: 'bitcoin' },
  { label: 'Peel Chain Hop (P1)', query: 'bc1qp10000000000000000000000000000000000', type: 'address', chain: 'bitcoin' },
  { label: 'ExchangeX Deposit (E1)', query: 'bc1qexch333333333333333333333333333333333', type: 'address', chain: 'bitcoin' },
  { label: 'DeFi Flash Loan Exploit (ETH)', query: '0x71C8fb9697d744876ae1529d7694901f40d226a4', type: 'address', chain: 'ethereum' },
];

export default function TransactionExplorerPage({ onOpenNewInvestigation }) {
  const [searchQuery, setSearchQuery] = useState('bc1qsrc0000000000000000000000000000000000');
  const [selectedResult, setSelectedResult] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    setHasSearched(true);
    const isEth = q.startsWith('0x');

    if (q.includes('exch') || q === 'bc1qexch333333333333333333333333333333333') {
      setSelectedResult({
        entity: q,
        type: 'address',
        blockchain: 'bitcoin',
        label: 'ExchangeX Deposit Hot Wallet',
        category: 'VASP / Centralized Exchange',
        risk_score: 91,
        risk_level: 'Critical',
        confirmed_balance: '1.90000000 BTC',
        total_received: '1.90000000 BTC',
        tx_count: 1,
        heuristic_tags: ['EXCHANGE', 'PEEL_DESTINATION', 'HIGH_TAINT'],
        recent_txs: [
          {
            txid: '4444444444444444444444444444444444444444444444444444444444444444',
            sender: 'bc1qp50000000000000000000000000000000000',
            recipient: q,
            amount: '1.90000000 BTC',
            time: '2 hours ago',
          },
        ],
      });
    } else if (isEth) {
      setSelectedResult({
        entity: q,
        type: 'address',
        blockchain: 'ethereum',
        label: 'Suspected DeFi Exploiter Wallet',
        category: 'Smart Contract Exploit',
        risk_score: 84,
        risk_level: 'High',
        confirmed_balance: '0.0000 ETH',
        total_received: '25.0000 ETH',
        tx_count: 3,
        heuristic_tags: ['FLASH_LOAN', 'TORNADO_CASH', 'UNISWAP_SWAP'],
        recent_txs: [
          {
            txid: '0xa1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1',
            sender: q,
            recipient: '0x083E8224c62257e0f5572e7A01229b294025E743',
            amount: '10.0000 ETH',
            time: '1 day ago',
          },
          {
            txid: '0xb2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2b2',
            sender: q,
            recipient: '0x43849F41E8a36Ac6B1b6fC3A7dF7B916A4Ec469b',
            amount: '14.9800 ETH',
            time: '1 day ago',
          },
        ],
      });
    } else {
      // Default Bitcoin source/node
      setSelectedResult({
        entity: q,
        type: 'address',
        blockchain: 'bitcoin',
        label: 'Reported Ransomware Ingestion Wallet',
        category: 'Cyber Extortion Campaign',
        risk_score: 75,
        risk_level: 'High',
        confirmed_balance: '0.00000000 BTC',
        total_received: '4.05000000 BTC',
        tx_count: 1,
        heuristic_tags: ['SOURCE', 'FAN_OUT', 'MIXER_PATTERN'],
        recent_txs: [
          {
            txid: '1111111111111111111111111111111111111111111111111111111111111111',
            sender: q,
            recipient: '8 Split Outputs (M1..M8)',
            amount: '4.05000000 BTC',
            time: '2 days ago',
          },
        ],
      });
    }
  };

  const handleCopy = () => {
    if (selectedResult) {
      navigator.clipboard?.writeText(selectedResult.entity);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="page-container explorer-page">
      <TopHeader
        title="Transaction &amp; Ledger Explorer"
        subtitle="Direct multi-chain lookup for wallet addresses, transaction hashes, and smart contracts"
        onOpenNewInvestigation={onOpenNewInvestigation}
      />

      <div className="explorer-content">
        {/* Search Hero Bar */}
        <div className="explorer-search-card">
          <form onSubmit={handleSearch} className="explorer-search-form">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              className="explorer-search-input code-font"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Bitcoin address, Ethereum address, or 64-char transaction hash..."
            />
            <button type="submit" className="btn-search-action">
              Explore Ledger
            </button>
          </form>

          {/* Quick preset chips */}
          <div className="quick-presets-row">
            <span className="presets-label">Quick Search Samples:</span>
            {SAMPLE_SEARCHES.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                className="chip-sample"
                onClick={() => {
                  setSearchQuery(sample.query);
                  setTimeout(() => handleSearch(), 50);
                }}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Result Inspector */}
        {selectedResult && (
          <div className="explorer-result-layout">
            {/* Overview Card */}
            <div className="panel-card explorer-overview-card">
              <div className="overview-header">
                <div className="overview-title-group">
                  <div className="overview-badges">
                    <span className={`chain-pill ${selectedResult.blockchain}`}>
                      {selectedResult.blockchain === 'ethereum' ? 'Ξ Ethereum' : '₿ Bitcoin'}
                    </span>
                    <span className="entity-category-pill">{selectedResult.category}</span>
                  </div>
                  <h2>{selectedResult.label}</h2>
                  <div className="address-bar-wrap">
                    <span className="full-address code-font">{selectedResult.entity}</span>
                    <button type="button" className="btn-copy-small" onClick={handleCopy}>
                      {copied ? <Check size={13} className="success-icon" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>

                <div className="overview-actions">
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => {
                      if (onOpenNewInvestigation) {
                        onOpenNewInvestigation(selectedResult.entity, selectedResult.blockchain);
                      }
                    }}
                  >
                    <Plus size={16} />
                    <span>Launch Forensics Investigation</span>
                  </button>
                </div>
              </div>

              {/* Stat Grid */}
              <div className="overview-stats-grid">
                <div className="overview-stat-box">
                  <span className="stat-label">Assessed Risk</span>
                  <div className="stat-value-group">
                    <span className={`risk-pill ${selectedResult.risk_score >= 80 ? 'risk-badge-critical' : 'risk-badge-high'}`}>
                      {selectedResult.risk_level} ({selectedResult.risk_score}/100)
                    </span>
                  </div>
                </div>

                <div className="overview-stat-box">
                  <span className="stat-label">Current Balance</span>
                  <span className="stat-number code-font">{selectedResult.confirmed_balance}</span>
                </div>

                <div className="overview-stat-box">
                  <span className="stat-label">Total Turnover Received</span>
                  <span className="stat-number code-font">{selectedResult.total_received}</span>
                </div>

                <div className="overview-stat-box">
                  <span className="stat-label">Total Transactions</span>
                  <span className="stat-number">{selectedResult.tx_count} Transfers</span>
                </div>
              </div>

              {/* Heuristic Tags */}
              <div className="tags-container">
                <span className="tags-label">Associated Heuristics:</span>
                <div className="tags-flex-wrap">
                  {selectedResult.heuristic_tags.map((tag, idx) => (
                    <span key={idx} className="heuristic-tag-badge">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Transactions Table Card */}
            <div className="panel-card explorer-txs-card">
              <div className="panel-header">
                <div className="panel-title-group">
                  <h3>Recent Confirmed Ledger Transactions</h3>
                  <span className="panel-subtitle">Verified on-chain transfers</span>
                </div>
              </div>

              <div className="table-wrapper">
                <table className="custom-data-table">
                  <thead>
                    <tr>
                      <th>TxID / Hash</th>
                      <th>Sender</th>
                      <th>Recipient</th>
                      <th>Value Transferred</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedResult.recent_txs.map((tx, idx) => (
                      <tr key={idx}>
                        <td className="code-font">{tx.txid ? `${tx.txid.slice(0, 12)}...` : 'N/A'}</td>
                        <td className="code-font">{tx.sender.length > 18 ? `${tx.sender.slice(0, 8)}...${tx.sender.slice(-6)}` : tx.sender}</td>
                        <td className="code-font">{tx.recipient.length > 18 ? `${tx.recipient.slice(0, 8)}...${tx.recipient.slice(-6)}` : tx.recipient}</td>
                        <td>
                          <span className="amount-badge">{tx.amount}</span>
                        </td>
                        <td>
                          <span className="time-badge">{tx.time}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
