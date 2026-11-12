import { useEffect, useRef, useState } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

function shortenAddress(addr) {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GraphView({
  graphData,
  highlightedPath,
  onSelectNode,
  onResetHighlight,
}) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDataSetRef = useRef(null);
  const edgesDataSetRef = useRef(null);

  // Layout mode: 'hierarchical' (Left-to-Right like Arkham/AnChain) | 'organic' (Force-directed) | 'radial'
  const [layoutMode, setLayoutMode] = useState('hierarchical');
  const [activeStep, setActiveStep] = useState(null); // null means full trail, number means step index
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timer
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

  useEffect(() => {
    if (!containerRef.current || !graphData || !graphData.nodes) return;

    const isPathActive = highlightedPath && highlightedPath.length > 0;
    
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

    // Format Nodes
    const formattedNodes = graphData.nodes.map((node) => {
      const tags = node.tags || [];
      const isSanctioned = tags.includes('SANCTIONED');
      const isExchange = tags.includes('EXCHANGE') || (node.label && node.label.toLowerCase().includes('exchange'));
      const isMixer = tags.includes('MIXER_PATTERN') || tags.includes('FAN_OUT') || tags.includes('FAN_IN');
      const isSource = tags.includes('SOURCE') || node.id === graphData.nodes[0]?.id;
      const isDust = tags.includes('DUSTING');
      const isLookalike = tags.includes('LOOKALIKE');

      let baseColor = '#475569'; // default slate grey
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
      } else if (isDust) {
        baseColor = '#6b7280';
        borderColor = '#9ca3af';
      } else if (isLookalike) {
        baseColor = '#ec4899';
        borderColor = '#be185d';
      }

      const isOnPath = pathNodeSet.has(node.id);
      const isCurrentStepTarget = activeStep !== null && effectivePath[effectivePath.length - 1] === node.id;
      const opacity = isPathActive ? (isOnPath ? 1.0 : 0.22) : 1.0;

      const taint = typeof node.taint === 'number' ? node.taint : 0;
      const size = 18 + Math.round(taint * 22);
      const displayName = node.label || shortenAddress(node.id);

      return {
        id: node.id,
        label: displayName,
        title: `Address: ${node.id}\nOwner/Label: ${node.label || 'None'}\nTaint Volume: ${(taint * 100).toFixed(1)}%\nCyber Risk: ${node.risk || 0}/100\nCluster: ${node.cluster || 'N/A'}\nTags: ${tags.join(', ') || 'None'}`,
        value: size,
        size: isCurrentStepTarget ? size + 8 : size,
        shape: isExchange ? 'box' : isSource ? 'diamond' : 'dot',
        color: {
          background: baseColor,
          border: isCurrentStepTarget ? '#00e5ff' : isOnPath ? '#fbbf24' : borderColor,
          highlight: {
            background: '#f59e0b',
            border: '#ffffff',
          },
        },
        opacity: opacity,
        borderWidth: isCurrentStepTarget ? 4 : isOnPath ? 3 : 1.5,
        shadow: isCurrentStepTarget
          ? { enabled: true, color: '#00e5ff', size: 20, x: 0, y: 0 }
          : isOnPath
          ? { enabled: true, color: '#fbbf24', size: 14, x: 0, y: 0 }
          : { enabled: true, color: 'rgba(0,0,0,0.5)', size: 5, x: 1, y: 2 },
        font: {
          color: fontColor,
          size: 11,
          face: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto',
          strokeWidth: 2,
          strokeColor: '#070a12',
        },
      };
    });

    // Format Edges
    const formattedEdges = (graphData.edges || []).map((edge, idx) => {
      const edgeKey = `${edge.from}->${edge.to}`;
      const isHighlightedEdge = pathEdgeSet.has(edgeKey);
      const edgeOpacity = isPathActive ? (isHighlightedEdge ? 1.0 : 0.12) : 0.8;

      const valText = typeof edge.value === 'number'
        ? `${edge.value < 0.001 ? edge.value.toFixed(8) : edge.value.toFixed(2)} BTC`
        : '';

      return {
        id: `e-${idx}-${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        label: valText,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.75,
          },
        },
        color: {
          color: isHighlightedEdge ? '#fbbf24' : '#475569',
          highlight: '#38bdf8',
          opacity: edgeOpacity,
        },
        width: isHighlightedEdge ? 3.5 : 1.5,
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

    // Configuration according to selected layout
    let options = {};
    if (layoutMode === 'hierarchical') {
      // Left-to-Right layered DAG like Arkham / AnChain.ai
      options = {
        layout: {
          hierarchical: {
            enabled: true,
            direction: 'LR',
            sortMethod: 'directed',
            levelSeparation: 175,
            nodeSpacing: 85,
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
      // Organic ForceAtlas2 Physics
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
        const clickedId = params.nodes[0];
        if (onSelectNode) onSelectNode(clickedId);
      } else {
        if (onResetHighlight) onResetHighlight();
      }
    });

    return () => {
      network.destroy();
    };
  }, [graphData, highlightedPath, layoutMode, activeStep]);

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

  const totalSteps = highlightedPath?.length ? highlightedPath.length - 1 : 0;

  return (
    <div className="graph-container-wrapper">
      {/* Top Toolbar matching Images 3, 4, 11 */}
      <div className="graph-toolbar">
        <div className="graph-mode-tabs">
          <button
            type="button"
            className={`graph-tab-pill ${layoutMode === 'hierarchical' ? 'active' : ''}`}
            onClick={() => setLayoutMode('hierarchical')}
          >
            📊 Flow Trail (Left-to-Right)
          </button>
          <button
            type="button"
            className={`graph-tab-pill ${layoutMode === 'organic' ? 'active' : ''}`}
            onClick={() => setLayoutMode('organic')}
          >
            🕸️ Organic Network
          </button>
        </div>

        {/* Trail Step-by-Step Player matching Image 11 (AnChain.ai) */}
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
              ◀
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
              ▶
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
              {isPlaying ? '⏸ Pause' : '▶ Play Trail'}
            </button>
          </div>
        )}

        <div className="graph-actions">
          {highlightedPath && highlightedPath.length > 0 && (
            <button
              type="button"
              className="btn-small btn-highlight-active"
              onClick={() => {
                setActiveStep(null);
                setIsPlaying(false);
                onResetHighlight();
              }}
            >
              ✕ Clear Trail
            </button>
          )}
          <button type="button" className="btn-small" onClick={handleZoomIn} title="Zoom in">+</button>
          <button type="button" className="btn-small" onClick={handleZoomOut} title="Zoom out">-</button>
          <button type="button" className="btn-small" onClick={handleFit} title="Fit entire graph to screen">Fit</button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="vis-network-canvas" />

      {/* Legend at bottom of canvas */}
      <div className="graph-bottom-legend">
        <span className="legend-item"><span className="legend-swatch bg-source"></span> Ransom Source</span>
        <span className="legend-item"><span className="legend-swatch bg-exchange"></span> Exchange Deposit</span>
        <span className="legend-item"><span className="legend-swatch bg-mixer"></span> Mixer / Fan-Out</span>
        <span className="legend-item"><span className="legend-swatch bg-sanction"></span> Sanctioned</span>
        <span className="legend-item"><span className="legend-swatch bg-peel"></span> Peel Chain Node</span>
        <span className="legend-item"><span className="legend-swatch bg-poison"></span> Lookalike / Poison</span>
        <span className="legend-item"><span className="legend-swatch bg-dust"></span> Dust Attack</span>
      </div>
    </div>
  );
}
