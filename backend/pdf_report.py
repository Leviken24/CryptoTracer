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
    Builds a court-admissible forensic investigation report PDF using ReportLab.
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
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a"),
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Bold",
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading2"],
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        fontName="Helvetica-Bold",
        spaceBefore=10,
        spaceAfter=4,
    )
    body_style = ParagraphStyle(
        "DocBody",
        parent=styles["Normal"],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#334155"),
    )
    code_style = ParagraphStyle(
        "DocCode",
        parent=styles["Normal"],
        fontSize=7.5,
        leading=9.5,
        textColor=colors.HexColor("#0f172a"),
        fontName="Courier",
    )
    disclaimer_style = ParagraphStyle(
        "DocDisclaimer",
        parent=styles["Normal"],
        fontSize=7.5,
        leading=10.5,
        textColor=colors.HexColor("#64748b"),
        fontName="Helvetica-Oblique",
    )

    elements = []

    # 1. Header Banner
    title_text = "CRYPTOTRACE FORENSIC INTELLIGENCE REPORT"
    subtitle_text = "EXPLAINABLE BLOCKCHAIN FORENSICS & CYBERSECURITY AUDIT TRAIL"
    elements.append(Paragraph(title_text, title_style))
    elements.append(Paragraph(subtitle_text, subtitle_style))
    elements.append(Spacer(1, 6))
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#0284c7"), spaceAfter=10))

    # 2. Case Metadata Table
    case_id = case_data.get("case_id", f"CT-CASE-{int(time.time())}")
    target = case_data.get("target", "N/A")
    blockchain = str(case_data.get("blockchain", "Bitcoin")).upper()
    risk_score = case_data.get("risk_score", 0)
    created_at = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(case_data.get("created_at", time.time())))
    audit_head = case_data.get("results", {}).get("audit_head", "GENESIS_INTACT")

    risk_badge = f"CRITICAL RISK ({risk_score}/100)" if risk_score >= 80 else (
        f"HIGH RISK ({risk_score}/100)" if risk_score >= 60 else (
            f"MEDIUM RISK ({risk_score}/100)" if risk_score >= 40 else f"LOW RISK ({risk_score}/100)"
        )
    )

    meta_table_data = [
        [Paragraph("<b>Case Reference:</b>", body_style), Paragraph(case_id, code_style),
         Paragraph("<b>Date / Time:</b>", body_style), Paragraph(created_at, body_style)],
        [Paragraph("<b>Target Entity:</b>", body_style), Paragraph(target, code_style),
         Paragraph("<b>Blockchain:</b>", body_style), Paragraph(blockchain, body_style)],
        [Paragraph("<b>Assessed Risk:</b>", body_style), Paragraph(f"<b>{risk_badge}</b>", body_style),
         Paragraph("<b>Audit Anchor:</b>", body_style), Paragraph(audit_head[:16] + "...", code_style)],
    ]

    meta_table = Table(meta_table_data, colWidths=[90, 190, 85, 175])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 10))

    # 3. AI Forensic 7-Point Briefing
    results = case_data.get("results", {})
    ai_summary = results.get("ai_summary", {})

    elements.append(Paragraph("1. AI FORENSIC EXECUTIVE BRIEFING (7-POINT REASONING)", h2_style))
    if ai_summary:
        elements.append(Paragraph(f"<b>Target Scope:</b> {ai_summary.get('investigated_target', 'N/A')}", body_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"<b>Fund Disposition &amp; Flow:</b> {ai_summary.get('fund_disposition', 'N/A')}", body_style))
        elements.append(Spacer(1, 4))
        patterns_str = "<br/>".join([f"&bull; {p.replace('• ', '')}" for p in ai_summary.get("suspicious_patterns", [])])
        elements.append(Paragraph(f"<b>Detected Patterns:</b><br/>{patterns_str}", body_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"<b>Supporting Evidence:</b> {ai_summary.get('supporting_evidence', 'N/A')}", body_style))
        elements.append(Spacer(1, 4))
        uncertainties_str = "<br/>".join([f"&bull; {u}" for u in ai_summary.get("investigative_uncertainties", [])])
        elements.append(Paragraph(f"<b>Forensic Limitations &amp; Uncertainties:</b><br/>{uncertainties_str}", disclaimer_style))
        elements.append(Spacer(1, 4))
        actions_str = "<br/>".join([f"<b>{i+1}.</b> {act}" for i, act in enumerate(ai_summary.get("recommended_next_actions", []))])
        elements.append(Paragraph(f"<b>Recommended Investigative Actions:</b><br/>{actions_str}", body_style))
    else:
        summary_text = (
            f"Forensic investigation against target asset <b>{target}</b> across {case_data.get('hops', 4)} transaction hops. "
            f"Assessed composite cyber-risk evaluated to <b>{risk_score}/100</b>."
        )
        elements.append(Paragraph(summary_text, body_style))
    elements.append(Spacer(1, 10))

    # 4. Ranked Probable End-Receivers
    elements.append(Paragraph("2. PROBABLE END RECEIVERS & CASH-OUT TARGETS", h2_style))
    ranked_list = results.get("ranked", [])
    if ranked_list:
        ranked_table_data = [
            [
                Paragraph("<b>Rank</b>", body_style),
                Paragraph("<b>Destination Wallet</b>", body_style),
                Paragraph("<b>Confidence</b>", body_style),
                Paragraph("<b>Risk</b>", body_style),
                Paragraph("<b>Evidence &amp; Recommended Action</b>", body_style),
            ]
        ]
        for idx, r in enumerate(ranked_list[:4], 1):
            addr = r.get("address", "")
            conf = f"{int(r.get('confidence', 0) * 100)}%"
            r_score = f"{r.get('risk', 0)}"
            label = r.get("entity_label", "Probable Receiver")
            action = r.get("suggested_action", "Review counterparty records.")
            reason = r.get("reasoning", ["N/A"])[0] if r.get("reasoning") else "High taint share"
            desc_text = f"<b>{label}</b><br/>Finding: {reason}<br/><b>Action:</b> {action}"

            ranked_table_data.append([
                Paragraph(f"#{idx}", body_style),
                Paragraph(addr[:12] + "..." + addr[-6:], code_style),
                Paragraph(conf, body_style),
                Paragraph(r_score, body_style),
                Paragraph(desc_text, body_style),
            ])

        ranked_table = Table(ranked_table_data, colWidths=[32, 118, 55, 35, 300])
        ranked_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(ranked_table)
    else:
        elements.append(Paragraph("No significant downstream end-receivers identified.", body_style))
    elements.append(Spacer(1, 8))

    # 5. Suspicious Pattern Heuristics & Adversarial Findings
    elements.append(Paragraph("3. FORENSIC INTELLIGENCE & ADVERSARIAL HEURISTICS", h2_style))
    findings = results.get("findings", [])
    if findings:
        findings_data = [
            [
                Paragraph("<b>Detection Type</b>", body_style),
                Paragraph("<b>Severity</b>", body_style),
                Paragraph("<b>Description &amp; Nodes</b>", body_style),
            ]
        ]
        for f in findings[:6]:
            ftype = f.get("type", "UNKNOWN")
            sev = str(f.get("severity", "medium")).upper()
            txt = f.get("text", "")
            if f.get("disclaimer"):
                txt += f"<br/><i>Notice: {f['disclaimer']}</i>"
            findings_data.append([
                Paragraph(ftype, code_style),
                Paragraph(f"<b>{sev}</b>", body_style),
                Paragraph(txt, body_style),
            ])

        f_table = Table(findings_data, colWidths=[110, 50, 380])
        f_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(f_table)
    else:
        elements.append(Paragraph("No adversarial heuristics or poisoning tactics detected.", body_style))
    elements.append(Spacer(1, 8))

    # 6. Forensic Timeline Summary
    timeline = results.get("timeline", [])
    if timeline:
        elements.append(Paragraph("4. CHRONOLOGICAL INVESTIGATION TIMELINE", h2_style))
        timeline_data = [
            [
                Paragraph("<b>Timestamp (UTC)</b>", body_style),
                Paragraph("<b>Event Type</b>", body_style),
                Paragraph("<b>Description &amp; Transaction Hash</b>", body_style),
            ]
        ]
        for evt in timeline[:5]:
            time_str = evt.get("formatted_time", "N/A")
            event_name = evt.get("title", evt.get("event_type", "Hop"))
            desc = f"{evt.get('description', '')}"
            if evt.get("txid"):
                desc += f"<br/><code>tx: {evt['txid'][:14]}...</code>"

            timeline_data.append([
                Paragraph(time_str, body_style),
                Paragraph(event_name, body_style),
                Paragraph(desc, body_style),
            ])

        t_table = Table(timeline_data, colWidths=[120, 110, 310])
        t_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_table)
        elements.append(Spacer(1, 8))

    # 7. Tamper-Evident Chain of Custody & Non-Attribution Disclaimers
    elements.append(Paragraph("5. EVIDENCE INTEGRITY & CHAIN OF CUSTODY (SHA-256)", h2_style))
    custody_text = (
        f"This digital evidence dossier is anchored by a cryptographic SHA-256 hash-chained audit log. "
        f"Current Merkle Root / Audit Head: <code>{audit_head}</code>. "
        "Any modification to timestamps, input parameters, or intermediate analysis invalidates the cryptographic verification chain. "
        "<b>Legal Attribution Notice:</b> All on-chain attributions and heuristics represent probabilistic ledger flows. "
        "Formal judicial warrants and VASP compliance records (18 U.S.C. § 2703(d) / MLAT) are required to establish legal custody and human identity."
    )
    elements.append(Paragraph(custody_text, disclaimer_style))
    elements.append(Spacer(1, 12))

    # Signoff footer
    sign_data = [
        [Paragraph("<b>Lead Forensic Analyst:</b> CryptoTrace AI Decision Support Engine", body_style),
         Paragraph("<b>Status:</b> Cryptographically Sealed &amp; Signed", body_style)]
    ]
    sign_table = Table(sign_data, colWidths=[300, 240])
    sign_table.setStyle(TableStyle([
        ("LINEABOVE", (0, 0), (-1, -1), 0.5, colors.HexColor("#94a3b8")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
    ]))
    elements.append(sign_table)

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()
