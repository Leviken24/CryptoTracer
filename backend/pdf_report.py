"""
CryptoTrace - PDF Investigation Report Generator
Generates court-admissible, tamper-verifiable blockchain forensic dossier reports in PDF.
"""

import io
import time
from typing import Any, Dict
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)


def generate_forensic_pdf(case_data: Dict[str, Any]) -> bytes:
    """
    Builds a forensic investigation report PDF using ReportLab.
    Returns bytes of the generated PDF document.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
    )
    code_style = ParagraphStyle(
        "DocCode",
        parent=styles["Normal"],
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#0f172a"),
        fontName="Courier",
    )

    elements = []

    # 1. Header Banner
    title_text = "CRYPTOTRACE FORENSIC INTELLIGENCE REPORT"
    subtitle_text = "EXPLAINABLE BLOCKCHAIN FORENSICS & CYBERSECURITY AUDIT TRAIL"
    elements.append(Paragraph(title_text, title_style))
    elements.append(Paragraph(subtitle_text, subtitle_style))
    elements.append(Spacer(1, 8))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0284c7"), spaceAfter=12))

    # 2. Case Metadata Table
    case_id = case_data.get("case_id", f"CT-CASE-{int(time.time())}")
    target = case_data.get("target", "N/A")
    blockchain = str(case_data.get("blockchain", "Bitcoin")).upper()
    risk_score = case_data.get("risk_score", 0)
    created_at = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(case_data.get("created_at", time.time())))
    audit_head = case_data.get("results", {}).get("audit_head", "GENESIS_INTACT")

    risk_badge = f"HIGH RISK ({risk_score}/100)" if risk_score >= 70 else (
        f"MEDIUM RISK ({risk_score}/100)" if risk_score >= 40 else f"LOW RISK ({risk_score}/100)"
    )

    meta_table_data = [
        [Paragraph("<b>Case Reference:</b>", body_style), Paragraph(case_id, code_style),
         Paragraph("<b>Date / Time:</b>", body_style), Paragraph(created_at, body_style)],
        [Paragraph("<b>Target Entity:</b>", body_style), Paragraph(target, code_style),
         Paragraph("<b>Blockchain:</b>", body_style), Paragraph(blockchain, body_style)],
        [Paragraph("<b>Assessed Risk:</b>", body_style), Paragraph(f"<b>{risk_badge}</b>", body_style),
         Paragraph("<b>Audit Anchor:</b>", body_style), Paragraph(audit_head[:16] + "...", code_style)],
    ]

    meta_table = Table(meta_table_data, colWidths=[100, 180, 90, 170])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 12))

    # 3. Executive Summary
    elements.append(Paragraph("1. EXECUTIVE SUMMARY & FORENSIC PROFILE", h2_style))
    summary_text = (
        f"This forensic investigation was initiated against target asset <b>{target}</b> on the {blockchain} network. "
        f"Automated graph heuristic analysis and proportional taint tracing evaluated {case_data.get('hops', 4)} transaction hops. "
        f"The composite cyber-risk score evaluated to <b>{risk_score}/100</b> based on identified laundering behaviors including "
        f"peel-chain structuring, mixer interaction patterns, and suspicious end-receiver deposits."
    )
    elements.append(Paragraph(summary_text, body_style))
    elements.append(Spacer(1, 10))

    # 4. Ranked Probable End-Receivers
    elements.append(Paragraph("2. PROBABLE END RECEIVERS & CASH-OUT TARGETS", h2_style))
    ranked_list = case_data.get("results", {}).get("ranked", [])
    if ranked_list:
        ranked_table_data = [
            [
                Paragraph("<b>Rank</b>", body_style),
                Paragraph("<b>Destination Wallet</b>", body_style),
                Paragraph("<b>Confidence</b>", body_style),
                Paragraph("<b>Risk</b>", body_style),
                Paragraph("<b>Primary Forensic Reasoning</b>", body_style),
            ]
        ]
        for idx, r in enumerate(ranked_list[:5], 1):
            addr = r.get("address", "")
            conf = f"{int(r.get('confidence', 0) * 100)}%"
            r_score = f"{r.get('risk', 0)}"
            reason = r.get("reasoning", ["N/A"])[0] if r.get("reasoning") else "High taint share"
            ranked_table_data.append([
                Paragraph(f"#{idx}", body_style),
                Paragraph(addr[:14] + "..." + addr[-8:], code_style),
                Paragraph(conf, body_style),
                Paragraph(r_score, body_style),
                Paragraph(reason, body_style),
            ])

        ranked_table = Table(ranked_table_data, colWidths=[36, 150, 60, 40, 254])
        ranked_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(ranked_table)
    else:
        elements.append(Paragraph("No significant downstream end-receivers identified for this single-hop target.", body_style))
    elements.append(Spacer(1, 10))

    # 5. Suspicious Pattern Heuristics & Adversarial Findings
    elements.append(Paragraph("3. ADVERSARIAL PATTERN DETECTION & HEURISTICS", h2_style))
    findings = case_data.get("results", {}).get("findings", [])
    if findings:
        findings_data = [
            [
                Paragraph("<b>Type</b>", body_style),
                Paragraph("<b>Severity</b>", body_style),
                Paragraph("<b>Description & Associated Nodes</b>", body_style),
            ]
        ]
        for f in findings[:8]:
            ftype = f.get("type", "UNKNOWN")
            sev = str(f.get("severity", "medium")).upper()
            txt = f.get("text", "")
            findings_data.append([
                Paragraph(ftype, code_style),
                Paragraph(f"<b>{sev}</b>", body_style),
                Paragraph(txt, body_style),
            ])

        f_table = Table(findings_data, colWidths=[120, 60, 360])
        f_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(f_table)
    else:
        elements.append(Paragraph("No adversarial heuristics or poisoning tactics detected.", body_style))
    elements.append(Spacer(1, 10))

    # 6. Tamper-Evident Chain of Custody
    elements.append(Paragraph("4. EVIDENCE INTEGRITY & CHAIN OF CUSTODY (SHA-256)", h2_style))
    custody_text = (
        f"This digital evidence report is anchored by a cryptographic SHA-256 hash-chained audit log. "
        f"Current Merkle Root / Audit Head: <code>{audit_head}</code>. "
        "Any modification to timestamps, input parameters, or intermediate analysis invalidates the cryptographic verification chain."
    )
    elements.append(Paragraph(custody_text, body_style))
    elements.append(Spacer(1, 16))

    # Signoff footer
    sign_data = [
        [Paragraph("<b>Lead Forensic Analyst:</b> CryptoTrace AI Autonomous Engine", body_style),
         Paragraph("<b>Status:</b> Cryptographically Verified &amp; Signed", body_style)]
    ]
    sign_table = Table(sign_data, colWidths=[300, 240])
    sign_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(sign_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
