import React, { useState } from 'react';
import {
  ShieldAlert,
  HelpCircle,
  Layers,
  AlertTriangle,
  Zap,
  Eye,
  GitBranch,
  ShieldCheck,
  Search,
  BookOpen,
} from 'lucide-react';
import TopHeader from '../components/TopHeader';

const HEURISTICS_KNOWLEDGE_BASE = [
  {
    id: 'peel-chain',
    name: 'Peel Chain Structuring',
    tag: 'PEEL_CHAIN',
    severity: 'High',
    shortDesc: 'A money laundering technique where a large sum is repeatedly split into one small payment and one large change output.',
    plainEnglish:
      'Imagine someone trying to break a $1,000 bill: they buy a $50 coffee, receive $950 in change, then immediately spend $50 of that change at another store, getting $900 back, repeating this step by step. On the blockchain, criminals use this "peel" structure across 3 to 10 hops to obfuscate the money trail while gradually liquidating funds.',
    detectionRule:
      'Transaction has 1 input and 2 outputs: one small output (< 15% of input) and one large output. The large output is spent in the exact same pattern for 3 or more consecutive hops.',
    mitigation: 'Flag all intermediate peel hops and track the continuation branch to its ultimate cashout deposit.',
  },
  {
    id: 'mixer-pattern',
    name: 'Mixer & Anonymity Pools',
    tag: 'MIXER_PATTERN',
    severity: 'Critical',
    shortDesc: 'Equal-value splitting of dirty cryptocurrency across multiple addresses to sever transaction graph continuity.',
    plainEnglish:
      'A digital laundry machine. Criminals deposit stolen Bitcoin into a shared pool. The software breaks the money into equal denominations (e.g. exactly 0.5 BTC each) and mixes them with other users deposits before sending them out, making it mathematically difficult to match senders with receivers without taint analysis.',
    detectionRule:
      '5 or more outputs in a single transaction whose values are within 1% of each other, or 8+ equal outputs from one source (Fan-Out).',
    mitigation: 'Apply proportional taint propagation across all outputs to measure downstream dirty satoshi exposure.',
  },
  {
    id: 'dusting-attack',
    name: 'Dusting Attack (Poisoning)',
    tag: 'DUSTING',
    severity: 'Medium',
    shortDesc: 'Adversaries send tiny micro-amounts of cryptocurrency to deanonymize or confuse forensic investigators.',
    plainEnglish:
      'An attacker sends microscopic amounts of cryptocurrency (called "dust", like $0.05) to thousands of wallets simultaneously. If an investigator blindly tracks all money transfers, their forensic graph gets flooded with thousands of fake edges. Furthermore, when the victim spends this dust, their unspent outputs get combined, revealing their identity.',
    detectionRule:
      'A single transaction sends 0.00001 BTC or less to 10 or more different addresses simultaneously.',
    mitigation: 'CryptoTrace AI automatically detects and tags dusting clusters, filtering them out of end-receiver rankings.',
  },
  {
    id: 'lookalike-poison',
    name: 'Look-Alike Address Poisoning',
    tag: 'LOOKALIKE',
    severity: 'High',
    shortDesc: 'Adversary generates vanity addresses that mimic the first and last characters of legitimate exchange deposits.',
    plainEnglish:
      'Because crypto addresses are long strings like "bc1qexch...dpst", users often only check the first 4 and last 4 characters when copying addresses. Attackers use brute-force computers to generate fake addresses with identical beginnings and endings, then send a tiny transaction so the fake address appears in the victim transaction history, hoping the victim accidentally sends money to the scammer next time.',
    detectionRule:
      'Two different addresses whose body (without bc1q prefix) share the identical first 4 and last 4 characters but differ in the middle.',
    mitigation: 'Adversarial detection flags look-alike addresses and warns investigators against false attribution.',
  },
  {
    id: 'decoy-edge',
    name: 'Micro-Value Decoy Paths',
    tag: 'DECOY',
    severity: 'Medium',
    shortDesc: 'Intentional decoy transfers designed to trigger false-positive path tracing in automated forensics tools.',
    plainEnglish:
      'A criminal purposefully sends $1.00 to an innocent third party right in the middle of a $500,000 laundering peel chain to distract investigators or trigger subpoenas against unrelated parties.',
    detectionRule:
      'Edge value is under 0.1% of the largest edge in the transaction graph and is not part of a dusting finding.',
    mitigation: 'Decoy paths are flagged and pruned from the primary end-receiver ranking formula.',
  },
  {
    id: 'common-input',
    name: 'Common-Input Ownership Clustering',
    tag: 'CLUSTER',
    severity: 'Informational',
    shortDesc: 'Heuristic grouping multiple separate Bitcoin addresses into a single controlling entity.',
    plainEnglish:
      'In Bitcoin, spending money from multiple different wallet addresses in a single transaction requires the private keys for all of them. Therefore, Satoshi Nakamoto multi-input rule proves that all input addresses belong to the same person or organization.',
    detectionRule:
      'Disjoint Set Union (Union-Find) algorithm groups all co-spent input addresses into deterministic entity clusters (e.g. c1, c2).',
    mitigation: 'Unifies scattered wallets into single threat clusters for accurate attribution.',
  },
];

const SANCTIONED_CLUSTERS = [
  {
    entity: 'Lazarus Group (State-Sponsored APT)',
    category: 'Cyber Warfare & Ransomware',
    jurisdiction: 'OFAC / UN Security Council',
    risk_score: 98,
    wallets: ['bc1qlazarus0000000000000000000000000000000', '0x8576aCC5C05D6Ce88f4e49bf65BdF0C62F91353C'],
    description: 'Democratic Peoples Republic of Korea military intelligence hacking division responsible for Ronin Network and Axie Infinity exploits.',
  },
  {
    entity: 'WannaCry Ransomware Operational Pool',
    category: 'Global Extortion Malware',
    jurisdiction: 'Interpol / US DOJ',
    risk_score: 95,
    wallets: ['13AM4VW2dhxYgXeQepoHkHSQuy6NgaEb94', '12t9YDPgwueZ9NyMgw519p7AA8isjr6SMw'],
    description: 'Extortion payment addresses associated with the 2017 global WannaCry ransomware outbreak infecting healthcare systems.',
  },
  {
    entity: 'ChipMixer High-Entropy Pool',
    category: 'Darknet Mixer / Money Laundering',
    jurisdiction: 'US FinCEN / BKA Germany (Seized)',
    risk_score: 92,
    wallets: ['bc1qmixpool0000000000000000000000000000000'],
    description: 'Illicit darknet tumbler seized by international law enforcement after laundering over $3B in criminal proceeds.',
  },
];

export default function RiskIntelligencePage({ onOpenNewInvestigation }) {
  const [selectedHeuristic, setSelectedHeuristic] = useState(HEURISTICS_KNOWLEDGE_BASE[0]);
  const [searchFilter, setSearchFilter] = useState('');

  const filteredHeuristics = HEURISTICS_KNOWLEDGE_BASE.filter(
    (h) =>
      h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.shortDesc.toLowerCase().includes(searchFilter.toLowerCase()) ||
      h.tag.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="page-container risk-intel-page">
      <TopHeader
        title="Forensic Risk Intelligence"
        subtitle="Explainable heuristic detection rules &amp; adversarial blockchain threat models"
        onOpenNewInvestigation={onOpenNewInvestigation}
      />

      <div className="risk-intel-content">
        {/* Knowledge-Base Section Header */}
        <div className="panel-card intel-header-card">
          <div className="intel-header-text">
            <h2>Explainable Forensics Knowledge-Base</h2>
            <p>
              CryptoTrace AI provides transparent, rule-based heuristics that explain exactly why a wallet
              or money trail is classified as suspicious. Non-expert investigators and compliance officers
              can understand each algorithmic pattern below.
            </p>
          </div>

          <div className="intel-search-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="intel-search-input"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter heuristics by name or tag (e.g. peel, mixer, dusting)..."
            />
          </div>
        </div>

        {/* Master-Detail Grid */}
        <div className="intel-master-detail-grid">
          {/* Left Master List */}
          <div className="intel-list-panel">
            {filteredHeuristics.map((h) => {
              const isSelected = selectedHeuristic?.id === h.id;
              return (
                <div
                  key={h.id}
                  className={`heuristic-card-item ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedHeuristic(h)}
                >
                  <div className="item-header-row">
                    <span className="item-title">{h.name}</span>
                    <span className={`severity-badge ${h.severity.toLowerCase()}`}>
                      {h.severity}
                    </span>
                  </div>
                  <span className="item-tag-code code-font">{h.tag}</span>
                  <p className="item-desc">{h.shortDesc}</p>
                </div>
              );
            })}
          </div>

          {/* Right Detail Deep Dive */}
          {selectedHeuristic && (
            <div className="panel-card intel-detail-panel">
              <div className="detail-header">
                <div className="detail-title-group">
                  <div className="detail-badges">
                    <span className="heuristic-tag-badge code-font">{selectedHeuristic.tag}</span>
                    <span className={`severity-badge ${selectedHeuristic.severity.toLowerCase()}`}>
                      Severity: {selectedHeuristic.severity}
                    </span>
                  </div>
                  <h2>{selectedHeuristic.name}</h2>
                </div>
              </div>

              <div className="detail-sections-wrap">
                {/* Plain English Explanation */}
                <div className="detail-section">
                  <div className="section-title-wrap">
                    <BookOpen size={16} className="section-icon" />
                    <h4>Plain English Explanation (For Non-Experts)</h4>
                  </div>
                  <p className="plain-english-text">{selectedHeuristic.plainEnglish}</p>
                </div>

                {/* Mathematical Detection Rule */}
                <div className="detail-section">
                  <div className="section-title-wrap">
                    <Zap size={16} className="section-icon accent" />
                    <h4>Forensic Heuristic Rule</h4>
                  </div>
                  <div className="rule-code-box code-font">
                    {selectedHeuristic.detectionRule}
                  </div>
                </div>

                {/* Mitigation & Investigation Strategy */}
                <div className="detail-section">
                  <div className="section-title-wrap">
                    <ShieldCheck size={16} className="section-icon success" />
                    <h4>Forensic Strategy &amp; Decision Support</h4>
                  </div>
                  <p className="mitigation-text">{selectedHeuristic.mitigation}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* High-Risk Sanctioned Entities Catalog */}
        <div className="panel-card sanctioned-catalog-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <h3>High-Risk &amp; OFAC Sanctioned Entity Profiles</h3>
              <span className="panel-subtitle">Known criminal and nation-state clusters indexed in labels.json</span>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="custom-data-table">
              <thead>
                <tr>
                  <th>Threat Entity</th>
                  <th>Category</th>
                  <th>Jurisdiction</th>
                  <th>Risk Rating</th>
                  <th>Associated Target Wallets</th>
                </tr>
              </thead>
              <tbody>
                {SANCTIONED_CLUSTERS.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <strong>{item.entity}</strong>
                      <p className="table-sub-desc">{item.description}</p>
                    </td>
                    <td>
                      <span className="category-pill">{item.category}</span>
                    </td>
                    <td>{item.jurisdiction}</td>
                    <td>
                      <span className="risk-pill risk-badge-critical">{item.risk_score}/100</span>
                    </td>
                    <td>
                      <div className="wallets-stack">
                        {item.wallets.map((w, wIdx) => (
                          <span key={wIdx} className="wallet-code code-font">
                            {w.slice(0, 10)}...{w.slice(-6)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
