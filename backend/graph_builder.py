import networkx as nx
from typing import Dict, List


_graph = nx.Graph()


def build_graph(records: List[Dict]) -> nx.Graph:
    """Build NetworkX patient identity graph from records."""
    global _graph
    _graph = nx.Graph()
    for rec in records:
        add_node(rec)
    return _graph


def add_node(record: Dict):
    """Add record version as node with metadata."""
    global _graph
    node_id = str(record.get("record_id") or record.get("id") or record.get("patient_id", ""))
    if not node_id:
        return
    _graph.add_node(node_id, **{
        "label": f"{record.get('first_name', '')} {record.get('last_name', '')}".strip(),
        "source": record.get("source", ""),
        "dob": record.get("dob", "") or record.get("norm_dob", ""),
        "insurance": record.get("insurance_id", "") or record.get("norm_insurance", ""),
        "type": record.get("type", "source_record"),
        "data_quality": record.get("data_quality_score", 0),
    })


def add_edge(record_id_1: str, record_id_2: str, confidence: float,
             rule_fired: str = "", decision: str = ""):
    """Add merge decision as edge with confidence score."""
    global _graph
    _graph.add_edge(str(record_id_1), str(record_id_2), **{
        "confidence": confidence,
        "rule_fired": rule_fired,
        "decision": decision,
        "label": f"{confidence * 100:.0f}%",
    })


def get_graph_json() -> Dict:
    """Convert NetworkX graph to D3.js compatible JSON format."""
    global _graph
    # Sort by degree and take top 1000 for performance
    node_list = sorted(_graph.degree, key=lambda x: x[1], reverse=True)[:1000]
    top_node_ids = set(n for n, d in node_list)
    nodes = []
    
    for node_id in top_node_ids:
        attrs = _graph.nodes[node_id]
        quality = attrs.get("data_quality", 0)
        if quality >= 90:
            color = "#10B981"
        elif quality >= 70:
            color = "#F59E0B"
        else:
            color = "#EF4444"

        degree = _graph.degree(node_id)
        nodes.append({
            "id": node_id,
            "label": attrs.get("label", node_id),
            "source": attrs.get("source", ""),
            "dob": attrs.get("dob", ""),
            "insurance": attrs.get("insurance", ""),
            "type": attrs.get("type", "source_record"),
            "data_quality": quality,
            "color": color,
            "size": max(8, 8 + degree * 3),
        })

    links = []
    for u, v, attrs in _graph.edges(data=True):
        if u in top_node_ids and v in top_node_ids:
            links.append({
                "source": u,
                "target": v,
                "confidence": attrs.get("confidence", 0),
                "label": attrs.get("label", ""),
                "rule_fired": attrs.get("rule_fired", ""),
                "decision": attrs.get("decision", ""),
            })

    return {
        "nodes": nodes,
        "links": links,
        "node_count": len(nodes),
        "edge_count": len(links),
    }


def get_graph_instance() -> nx.Graph:
    return _graph


def reset_graph():
    """Clear the global graph instance."""
    global _graph
    _graph = nx.Graph()
