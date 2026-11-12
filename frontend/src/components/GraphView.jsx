import { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';

function shortenAddress(addr) {
  if (!addr || addr.length <= 12) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GraphView({ graphData, highlightedPath, onSelectNode, onResetHighlight }) {
  const containerRef = useRef(null);
  const networkRef = useRef(null);
  const nodesDataSetRef = useRef(null);
  const edgesDataSetRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !graphData || !graphData.nodes) return;

    const isPathActive = highlightedPath && highlightedPath.length > 0;
    const pathNodeSet = new Set(highlightedPath || []);
    
    // Check which edges belong to the highlighted path
    const pathEdgeSet = new Set();
    if (isPathActive && highlightedPath.length > 1) {
      for (let i = 0; i < highlightedPath.length - 1; i++) {
        pathEdgeSet.add(`${highlightedPath[i]}->${highlightedPath[i + 1]}`);
      }
    }

    const formattedNodes = graphData.nodes.map((node) => {
      const tags = node.tags || [];
      const isSanctioned = tags.includes('SANCTIONED');
      const isExchange = tags.includes('EXCHANGE') || (node.label && node.label.toLowerCase().includes('exchange'));
      const isMixer = tags.includes('MIXER_PATTERN') || tags.includes('FAN_OUT') || tags.includes('FAN_IN');
      const isSource = tags.includes('SOURCE') || node.id === graphData.nodes[0]?.id;

      // Color scheme: EXCHANGE blue, MIXER_PATTERN orange, SANCTIONED red, SOURCE purple, else grey
      let baseColor = '#64748b'; // default grey
      let borderColor = '#94a3b8';
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
        borderColor = '#6d28d9';
      }

      // Dim non-path nodes if path highlight is active
      const isOnPath = pathNodeSet.has(node.id);
      const opacity = isPathActive ? (isOnPath ? 1.0 : 0.25) : 1.0;

      // Node size grows with taint (0..1)
      const taint = typeof node.taint === 'number' ? node.taint : 0;
      const size = 18 + Math.round(taint * 22);

      const displayName = node.label || shortenAddress(node.id);

      return {
        id: node.id,
        label: displayName,
        title: `Address: ${node.id}\nLabel: ${node.label || 'None'}\nTaint: ${(taint * 100).toFixed(1)}%\nRisk: ${node.risk || 0}/100\nCluster: ${node.cluster || 'N/A'}\nTags: ${tags.join(', ') || 'None'}`,
        value: size,
        size: size,
        shape: isExchange ? 'box' : 'dot',
        color: {
          background: baseColor,
          border: isOnPath ? '#fbbf24' : borderColor,
          highlight: {
            background: '#f59e0b',
            border: '#ffffff',
          },
        },
        opacity: opacity,
        borderWidth: isOnPath ? 3 : 1.5,
        shadow: isOnPath
          ? { enabled: true, color: '#fbbf24', size: 14, x: 0, y: 0 }
          : { enabled: true, color: 'rgba(0,0,0,0.5)', size: 5, x: 1, y: 2 },
        font: {
          color: fontColor,
          size: 11,
          face: '-apple-system, BlinkMacSystemFont, Segoe UI, Roboto',
          strokeWidth: 2,
          strokeColor: '#0f172a',
        },
      };
    });

    const formattedEdges = (graphData.edges || []).map((edge, idx) => {
      const edgeKey = `${edge.from}->${edge.to}`;
      const isHighlightedEdge = pathEdgeSet.has(edgeKey);
      const edgeOpacity = isPathActive ? (isHighlightedEdge ? 1.0 : 0.15) : 0.85;

      const valText = typeof edge.value === 'number' ? `${edge.value.toFixed(edge.value < 0.01 ? 6 : 2)} BTC` : '';

      return {
        id: `e-${idx}-${edge.from}-${edge.to}`,
        from: edge.from,
        to: edge.to,
        label: valText,
        arrows: {
          to: {
            enabled: true,
            scaleFactor: 0.7,
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
          strokeColor: '#0b0f19',
        },
        smooth: {
          type: 'continuous',
          roundness: 0.2,
        },
      };
    });

    nodesDataSetRef.current = new DataSet(formattedNodes);
    edgesDataSetRef.current = new DataSet(formattedEdges);

    const data = {
      nodes: nodesDataSetRef.current,
      edges: edgesDataSetRef.current,
    };

    const options = {
      physics: {
        solver: 'forceAtlas2Based',
        forceAtlas2Based: {
          gravitationalConstant: -55,
          centralGravity: 0.01,
          springLength: 95,
          springConstant: 0.08,
          damping: 0.4,
        },
        stabilization: {
          iterations: 150,
          updateInterval: 25,
        },
      },
      interaction: {
        hover: true,
        tooltipDelay: 100,
        zoomView: true,
        dragView: true,
      },
    };

    const network = new Network(containerRef.current, data, options);
    networkRef.current = network;

    network.on('click', (params) => {
      if (params.nodes.length > 0) {
        const clickedNodeId = params.nodes[0];
        if (onSelectNode) onSelectNode(clickedNodeId);
      } else {
        if (onResetHighlight) onResetHighlight();
      }
    });

    return () => {
      network.destroy();
    };
  }, [graphData, highlightedPath]);

  const handleZoomIn = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale();
    networkRef.current.moveTo({ scale: scale * 1.3, animation: { duration: 250 } });
  };

  const handleZoomOut = () => {
    if (!networkRef.current) return;
    const scale = networkRef.current.getScale();
    networkRef.current.moveTo({ scale: scale / 1.3, animation: { duration: 250 } });
  };

  const handleFit = () => {
    if (!networkRef.current) return;
    networkRef.current.fit({ animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
  };

  return (
    <div className="graph-container-wrapper">
      <div className="graph-toolbar">
        <div className="legend-items">
          <span className="legend-pill" style={{ borderColor: '#8b5cf6' }}>
            <span className="legend-dot" style={{ backgroundColor: '#8b5cf6' }}></span> Source
          </span>
          <span className="legend-pill" style={{ borderColor: '#3b82f6' }}>
            <span className="legend-dot" style={{ backgroundColor: '#3b82f6' }}></span> Exchange
          </span>
          <span className="legend-pill" style={{ borderColor: '#f97316' }}>
            <span className="legend-dot" style={{ backgroundColor: '#f97316' }}></span> Mixer / Fan-Out
          </span>
          <span className="legend-pill" style={{ borderColor: '#ef4444' }}>
            <span className="legend-dot" style={{ backgroundColor: '#ef4444' }}></span> Sanctioned
          </span>
          <span className="legend-pill" style={{ borderColor: '#64748b' }}>
            <span className="legend-dot" style={{ backgroundColor: '#64748b' }}></span> Intermediary
          </span>
        </div>

        <div className="graph-actions">
          {highlightedPath && highlightedPath.length > 0 && (
            <button className="btn-small btn-highlight-active" onClick={onResetHighlight}>
              ✕ Clear Path
            </button>
          )}
          <button className="btn-small" onClick={handleZoomIn} title="Zoom In">+</button>
          <button className="btn-small" onClick={handleZoomOut} title="Zoom Out">-</button>
          <button className="btn-small" onClick={handleFit} title="Fit to Screen">Fit</button>
        </div>
      </div>

      <div ref={containerRef} className="vis-network-canvas" />
    </div>
  );
}
