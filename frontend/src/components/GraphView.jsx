import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Filter, Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';

function shortenAddress(addr) {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GraphView({
  graphData,
  highlightedPath,
  onSelectNode,
  onSelectEdge,
  onResetHighlight,
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDataSetRef = useRef(null);
  const edgesDataSetRef = useRef(null);

  // Layout mode: 'hierarchical' (Left-to-Right) | 'organic' (Force-directed)
  const [layoutMode, setLayoutMode] = useState('hierarchical');
  const [riskFilter, setRiskFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'
  const [activeStep, setActiveStep] = useState(null); // null means full trail, number means step index
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timer for multi-hop money trail
  useEffect(() => {
    let timer;
    if (isPlaying && highlightedPath && highlightedPath.length > 0) {
      timer = setInterval(() => {
        setActiveStep((prev) => {
          if (prev === null || prev >= highlightedPath.length - 1) {
            setIsPlaying(false);
            return highlightedPath.length - 1;
          }
          return prev + 1;
        });
      }, 900);
    }
    return () => clearInterval(timer);
  }, [isPlaying, highlightedPath]);

  // Synchronize active stepper hop with selected node
  useEffect(() => {
    if (activeStep !== null && highlightedPath && highlightedPath[activeStep]) {
      const currentHopNodeId = highlightedPath[activeStep];
      if (onSelectNode) {
        onSelectNode(currentHopNodeId);
      }
    }
  }, [activeStep]);

  useEffect(() => {
    if (!containerRef.current || !graphData || !graphData.nodes) return;

    // Filter nodes by risk if selected
    let filteredNodes = graphData.nodes;
    if (riskFilter === 'HIGH') {
      filteredNodes = graphData.nodes.filter((n) => (n.risk || 0) >= 60 || (n.tags || []).includes('SOURCE'));
    } else if (riskFilter === 'MEDIUM') {
      filteredNodes = graphData.nodes.filter((n) => (n.risk || 0) >= 40 || (n.tags || []).includes('SOURCE'));
    } else if (riskFilter === 'LOW') {
      filteredNodes = graphData.nodes.filter((n) => (n.risk || 0) < 40 || (n.tags || []).includes('SOURCE'));
    }

    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));

    // Filter edges to only those connecting visible nodes
    const filteredEdges = (graphData.edges || []).filter(
      (e) => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to)
    );

    // Determine which subset of path is active if in step-by-step mode
    let effectivePath = highlightedPath || [];
    if (activeStep !== null && effectivePath.length > 0) {
      effectivePath = effectivePath.slice(0, activeStep + 1);
    }

    const pathNodeSet = new Set(effectivePath);
    const pathEdgeSet = new Set();
    if (effectivePath.length > 1) {
      for (let i = 0; i < effectivePath.length - 1; i++) {
        pathEdgeSet.add(`${effectivePath[i]}->${effectivePath[i + 1]}`);
      }
    }

    const isPathActive = effectivePath.length > 0;

    // Format Nodes
    const formattedNodes = filteredNodes.map((node) => {
      const tags = node.tags || [];
      const isSanctioned = tags.includes('SANCTIONED');
      const isExchange = tags.includes('EXCHANGE') || (node.label && node.label.toLowerCase().includes('exchange'));
      const isMixer = tags.includes('MIXER_PATTERN') || tags.includes('FAN_OUT') || tags.includes('FAN_IN');
      const isSource = tags.includes('SOURCE') || node.id === graphData.nodes[0]?.id;
      const isDust = tags.includes('DUSTING');
      const isLookalike = tags.includes('LOOKALIKE');
      const isPeel = tags.includes('PEEL_CHAIN') || (node.label && node.label.toLowerCase().includes('peel'));

      let baseColor = '#334155'; // default slate grey
      let borderColor = '#64748b';
      let fontColor = '#f8fafc';

      if (isSanctioned) {
        baseColor = '#ef4444';
        borderColor = '#b91c1c';
      } else if (isExchange) {
        baseColor = '#3b82f6';
        borderColor = '#1d4ed8';
      } else if (isMixer) {
        baseColor = '#f97316';
        borderColor = '#c2410c';
      } else if (isSource) {
        baseColor = '#8b5cf6';
        borderColor = '#7c3aed';
      } else if (isLookalike) {
        baseColor = '#ec4899';
        borderColor = '#be185d';
      } else if (isDust) {
        baseColor = '#475569';
        borderColor = '#94a3b8';
      } else if (isPeel) {
        baseColor = '#eab308';
        borderColor = '#a16207';
      }

      const isNodeInPath = pathNodeSet.has(node.id);
      const nodeOpacity = isPathActive ? (isNodeInPath ? 1.0 : 0.25) : 1.0;

      let displayLabel = shortenAddress(node.id);
      if (node.label) {
        displayLabel = `${node.label}\n${shortenAddress(node.id)}`;
      } else if (isSource) {
        displayLabel = `Source Ransom\n${shortenAddress(node.id)}`;
      }

      return {
        id: node.id,
        label: displayLabel,
        title: `Address: ${node.id}\nRisk: ${node.risk || 0}/100\nEntity: ${node.label || 'None'}\nCluster: ${node.cluster || 'c1'}\nHeld Taint: ${Math.round((node.taint || 0) * 100)}%`,
        color: {
          background: baseColor,
          border: isNodeInPath ? '#38bdf8' : borderColor,
          highlight: {
            background: '#0284c7',
            border: '#38bdf8',
          },
          opacity: nodeOpacity,
        },
        borderWidth: isNodeInPath ? 4 : 2,
        shadow: isNodeInPath
          ? { enabled: true, color: '#38bdf8', size: 14, x: 0, y: 0 }
          : { enabled: true, color: 'rgba(0,0,0,0.4)', size: 4, x: 1, y: 2 },
        shape: isExchange || isSource ? 'box' : 'ellipse',
        margin: 10,
        font: {
          color: fontColor,
          size: 11,
          face: 'ui-sans-serif, system-ui, sans-serif',
          multi: true,
        },
      };
    });

    // Format Edges
    const formattedEdges = filteredEdges.map((edge, idx) => {
      const edgeKey = `${edge.from}->${edge.to}`;
      const isHighlightedEdge = pathEdgeSet.has(edgeKey);
      const edgeOpacity = isPathActive ? (isHighlightedEdge ? 1.0 : 0.15) : 0.85;

      const sym = edge.blockchain === 'ethereum' ? 'ETH' : 'BTC';
      const edgeLabel = `${edge.value} ${sym}`;

      return {
        id: `e_${idx}_${edgeKey}`,
        from: edge.from,
        to: edge.to,
        label: edgeLabel,
        title: `TxID: ${edge.txid || 'Direct Split'}\nValue: ${edge.value} ${sym}\nTags: ${(edge.tags || []).join(', ') || 'Transfer'}`,
        rawEdge: edge,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.9,
          },
        },
        color: {
          color: isHighlightedEdge ? '#facc15' : '#475569',
          highlight: '#38bdf8',
          hover: '#0ea5e9',
          opacity: edgeOpacity,
        },
        width: isHighlightedEdge ? 4 : 1.8,
        font: {
          color: isHighlightedEdge ? '#fef08a' : '#94a3b8',
          size: 10,
          align: 'middle',
          strokeWidth: 2,
          strokeColor: '#070a12',
        },
        smooth: {
          type: layoutMode === 'hierarchical' ? 'cubicBezier' : 'continuous',
          roundness: 0.35,
        },
      };
    });

    nodesDataSetRef.current = new DataSet(formattedNodes);
    edgesDataSetRef.current = new DataSet(formattedEdges);

    const data = {
      nodes: nodesDataSetRef.current,
      edges: edgesDataSetRef.current,
    };

    let options = {};
    if (layoutMode === 'hierarchical') {
      options = {
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'LR',
            sortMethod: 'directed',
            levelSeparation: 180,
            nodeSpacing: 90,
            treeSpacing: 100,
          },
        },
        physics: {
          hierarchicalRepulsion: {
            nodeDistance: 110,
            centralGravity: 0.0,
            springLength: 100,
            springConstant: 0.01,
            damping: 0.09,
          },
          stabilization: { iterations: 120 },
        },
        interaction: { hover: true, tooltipDelay: 100, zoomView: true, dragView: true },
      };
    } else {
      options = {
        physics: {
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -55,
            centralGravity: 0.01,
            springLength: 95,
            springConstant: 0.08,
            damping: 0.4,
          },
          stabilization: { iterations: 120 },
        },
        interaction: { hover: true, tooltipDelay: 100, zoomView: true, dragView: true },
      };
    }

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        if (onSelectNode) onSelectNode(clickedNodeId);
      } else if (params.edges.length > 0) {
        const clickedEdgeId = params.edges[0];
        const edgeObj = formattedEdges.find((e) => e.id === clickedEdgeId);
        if (edgeObj && edgeObj.rawEdge && onSelectEdge) {
          onSelectEdge(edgeObj.rawEdge);
        }
      } else {
        if (onResetHighlight) onResetHighlight();
      }
    });

    return () => {
      network.destroy();
    };
  }, [graphData, highlightedPath, layoutMode, activeStep, riskFilter]);

  const handleZoomIn = () => {
    if (!networkRef.current) return;
    const s = networkRef.current.getScale();
    networkRef.current.moveTo({ scale: s * 1.3, animation: { duration: 200 } });
  };

  const handleZoomOut = () => {
    if (!networkRef.current) return;
    const s = networkRef.current.getScale();
    networkRef.current.moveTo({ scale: s / 1.3, animation: { duration: 200 } });
  };

  const handleFit = () => {
    if (!networkRef.current) return;
    networkRef.current.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
  };

  const handleReset = () => {
    setActiveStep(null);
    setIsPlaying(false);
    setRiskFilter('ALL');
    if (onResetHighlight) onResetHighlight();
    handleFit();
  };

  const totalSteps = highlightedPath?.length ? highlightedPath.length - 1 : 0;

  return (
    <div className="graph-container-wrapper">
      {/* Top Toolbar */}
      <div className="graph-toolbar">
        <div className="graph-mode-tabs">
          <button
            type="button"
            className={`graph-tab-pill ${layoutMode === 'hierarchical' ? 'active' : ''}`}
            onClick={() => setLayoutMode('hierarchical')}
          >
            Flow Trail (Layered)
          </button>
          <button
            type="button"
            className={`graph-tab-pill ${layoutMode === 'organic' ? 'active' : ''}`}
            onClick={() => setLayoutMode('organic')}
          >
            Organic Network
          </button>
        </div>

        {/* Trail Step-by-Step Player */}
        {highlightedPath && highlightedPath.length > 1 && (
          <div className="trail-stepper-box">
            <span className="stepper-label">Trail Hop:</span>
            <button
              type="button"
              className="btn-step"
              onClick={() => {
                setActiveStep((prev) => (prev === null || prev <= 0 ? 0 : prev - 1));
                setIsPlaying(false);
              }}
              disabled={activeStep === 0}
              title="Previous hop"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="step-counter-text">
              {activeStep === null ? `All (${totalSteps} hops)` : `Hop ${activeStep} of ${totalSteps}`}
            </span>
            <button
              type="button"
              className="btn-step"
              onClick={() => {
                setActiveStep((prev) => (prev === null ? 1 : Math.min(totalSteps, prev + 1)));
                setIsPlaying(false);
              }}
              disabled={activeStep === totalSteps}
              title="Next hop"
            >
              <ChevronRight size={14} />
            </button>
            <button
              type="button"
              className={`btn-step btn-play ${isPlaying ? 'playing' : ''}`}
              onClick={() => {
                if (isPlaying) {
                  setIsPlaying(false);
                } else {
                  if (activeStep === null || activeStep >= totalSteps) setActiveStep(0);
                  setIsPlaying(true);
                }
              }}
            >
              {isPlaying ? <><Pause size={12} /> Pause</> : <><Play size={12} /> Play</>}
            </button>
          </div>
        )}

        {/* Risk Filter & Zoom Controls */}
        <div className="graph-actions">
          {/* Risk Filter Dropdown */}
          <div className="filter-dropdown-wrap">
            <Filter size={13} className="filter-icon" />
            <select
              className="graph-risk-select"
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              title="Filter graph nodes by risk level"
            >
              <option value="ALL">All Risk Levels</option>
              <option value="HIGH">High Risk (≥60)</option>
              <option value="MEDIUM">Medium+ Risk (≥40)</option>
              <option value="LOW">Low Risk (&lt;40)</option>
            </select>
          </div>

          {highlightedPath && highlightedPath.length > 0 && (
            <button
              type="button"
              className="btn-graph-tool active-trail"
              onClick={() => {
                setActiveStep(null);
                setIsPlaying(false);
                if (onResetHighlight) onResetHighlight();
              }}
              title="Clear Highlighted Trail"
            >
              Clear Trail
            </button>
          )}

          <button type="button" className="btn-graph-tool" onClick={handleZoomIn} title="Zoom in">
            <ZoomIn size={14} />
          </button>
          <button type="button" className="btn-graph-tool" onClick={handleZoomOut} title="Zoom out">
            <ZoomOut size={14} />
          </button>
          <button type="button" className="btn-graph-tool" onClick={handleFit} title="Fit graph to view">
            <Maximize2 size={14} />
          </button>
          <button type="button" className="btn-graph-tool" onClick={handleReset} title="Reset graph &amp; filters">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Network Canvas */}
      <div ref={containerRef} className="vis-network-canvas" />

      {/* Legend */}
      <div className="graph-bottom-legend">
        <span className="legend-item"><span className="legend-swatch bg-source"></span> Source Wallet</span>
        <span className="legend-item"><span className="legend-swatch bg-exchange"></span> Exchange Deposit</span>
        <span className="legend-item"><span className="legend-swatch bg-mixer"></span> Mixer / Fan-Out</span>
        <span className="legend-item"><span className="legend-swatch bg-peel"></span> Peel Chain Node</span>
        <span className="legend-item"><span className="legend-swatch bg-sanction"></span> Sanctioned</span>
        <span className="legend-item"><span className="legend-swatch bg-poison"></span> Look-alike Poison</span>
        <span className="legend-item"><span className="legend-swatch bg-dust"></span> Dust Attack</span>
      </div>
    </div>
  );
}
