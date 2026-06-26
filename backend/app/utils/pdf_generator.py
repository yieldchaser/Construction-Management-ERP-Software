# -*- coding: utf-8 -*-
"""
Pure Python PDF Generator for Phase 11 Client Portal & Progress Reports.
Creates a valid PDF 1.4 document with title, headings, margins, and text lines.
"""

from datetime import datetime

def generate_client_report_pdf(title: str, summary: str, metrics: dict) -> bytes:
    """
    Generates a valid, readable minimal PDF 1.4 byte stream.
    Requires no external packages (pure standard library).
    """
    pdf = bytearray(b"%PDF-1.4\n")
    objects = []
    offsets = {}

    def add_object(obj_def: bytes, stream_data: bytes = None) -> int:
        obj_id = len(objects) + 1
        obj_header = f"{obj_id} 0 obj\n".encode("ascii")
        obj_body = obj_def
        if stream_data is not None:
            obj_body += f"<< /Length {len(stream_data)} >>\nstream\n".encode("ascii")
            obj_body += stream_data
            obj_body += b"\nendstream\n"
        obj_footer = b"endobj\n"
        objects.append(obj_header + obj_body + obj_footer)
        return obj_id

    # Content Stream lines
    stream_lines = [
        b"BT",
        b"/F2 20 Tf",      # Title Font (Helvetica-Bold 20pt)
        b"50 780 Td",
        f"({title.replace('(', '\\(').replace(')', '\\)')}) Tj".encode("latin1", "replace"),
        b"0 -30 Td",
        b"/F1 10 Tf",      # Regular Font (Helvetica 10pt)
        f"(Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}) Tj".encode("latin-1"),
        b"0 -30 Td"
    ]

    # Sections mapping
    sections = [
        ("PROJECT SCHEDULE & TIMELINE", [
            f"Total Tasks in WBS: {metrics.get('tasks_total', 0)}",
            f"Completed Tasks: {metrics.get('tasks_completed', 0)}",
            f"Tasks in Progress: {metrics.get('tasks_active', 0)}",
            f"Average Completion: {metrics.get('tasks_completion_pct', 0)}%"
        ]),
        ("FINANCIALS & SUBCONTRACTOR BILLING", [
            f"Total Work Orders Issued: {metrics.get('billing_wo_count', 0)}",
            f"Total RA Bills Submitted: {metrics.get('billing_ra_count', 0)}",
            f"Total Net Certified Amount: {metrics.get('billing_certified_net', '0.00')}"
        ]),
        ("MATERIAL PROCUREMENT", [
            f"Material Indents Raised: {metrics.get('procurement_indents', 0)}",
            f"Purchase Orders Issued: {metrics.get('procurement_pos', 0)}"
        ]),
        ("QUALITY CONTROL & LAB TESTS", [
            f"Total Site Inspections Run: {metrics.get('quality_inspections', 0)}",
            f"Open Non-Conformance Reports (NCRs): {metrics.get('quality_ncr_open', 0)}",
            f"Closed/Resolved NCRs: {metrics.get('quality_ncr_closed', 0)}",
            f"Material Lab Tests Pass Rate: {metrics.get('quality_tests_pass_rate', 0)}% ({metrics.get('quality_tests_pass_count', 0)} pass / {metrics.get('quality_tests_total', 0)} total)"
        ])
    ]

    # Add summary section if provided
    if summary:
        sections.insert(0, ("EXECUTIVE SUMMARY", [summary]))

    # Render sections to content stream
    for heading, lines in sections:
        # Draw heading in bold 12pt
        stream_lines.append(b"/F2 12 Tf")
        safe_heading = heading.replace('(', '\\(').replace(')', '\\)')
        stream_lines.append(f"({safe_heading}) Tj".encode("latin1", "replace"))
        stream_lines.append(b"0 -18 Td")

        # Draw details in regular 10pt
        stream_lines.append(b"/F1 10 Tf")
        for line in lines:
            safe_line = line.replace('(', '\\(').replace(')', '\\)')
            stream_lines.append(f"({safe_line}) Tj".encode("latin1", "replace"))
            stream_lines.append(b"0 -14 Td")
        stream_lines.append(b"0 -12 Td") # Spacing between sections

    stream_lines.append(b"ET")
    stream_data = b"\n".join(stream_lines)

    # 1. Catalog
    add_object(b"<< /Type /Catalog /Pages 2 0 R >>\n")
    # 2. Pages
    add_object(b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n")
    # 3. Page
    add_object(
        b"<< /Type /Page\n"
        b"   /Parent 2 0 R\n"
        b"   /Resources <<\n"
        b"     /Font << /F1 5 0 R /F2 6 0 R >>\n"
        b"   >>\n"
        b"   /MediaBox [0 0 595 842]\n"
        b"   /Contents 4 0 R\n"
        b">>\n"
    )
    # 4. Contents
    add_object(b"", stream_data)
    # 5. Font F1 (Helvetica Regular)
    add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n")
    # 6. Font F2 (Helvetica Bold)
    add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n")

    # Assemble byteoffsets
    current_offset = len(pdf)
    for i, obj in enumerate(objects):
        obj_id = i + 1
        offsets[obj_id] = current_offset
        pdf.extend(obj)
        current_offset += len(obj)

    xref_start = len(pdf)
    pdf.extend(b"xref\n")
    pdf.extend(f"0 {len(objects) + 1}\n".encode("ascii"))
    pdf.extend(b"0000000000 65535 f \n")
    for obj_id in range(1, len(objects) + 1):
        offset = offsets[obj_id]
        pdf.extend(f"{offset:010d} 00000 n \n".encode("ascii"))

    pdf.extend(b"trailer\n")
    pdf.extend(f"<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode("ascii"))
    pdf.extend(b"startxref\n")
    pdf.extend(f"{xref_start}\n".encode("ascii"))
    pdf.extend(b"%%EOF\n")

    return bytes(pdf)
