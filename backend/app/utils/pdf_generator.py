# -*- coding: utf-8 -*-
"""
Pure Python PDF Generator for Phase 11 Client Portal & Progress Reports.
Creates a valid PDF 1.4 document with title, headings, margins, and text lines.

Also provides `generate_document_pdf`, a sibling generator for line-item
documents (Sales Invoice / Purchase Order / BOQ) that reuses the exact same
manual PDF object construction style (no external deps).
"""

from datetime import datetime

def generate_client_report_pdf(
    title: str,
    summary: str,
    metrics: dict,
    company_name: str = "",
    custom_banner: str = None,
) -> bytes:
    """
    Generates a valid, readable minimal PDF 1.4 byte stream.
    Requires no external packages (pure standard library).

    company_name: printed as a masthead line above the title. Sourced from
        Company.document_company_name_display ("company" vs "branch") -- the
        caller resolves which name string to pass in.
    custom_banner: when the company has Company.custom_pdf_template_enabled
        set and a PdfTemplate row is configured, its `content` is passed here
        and rendered as an extra banner line beneath the masthead, giving a
        visibly different ("custom") layout vs. the default template. None /
        empty keeps the default layout unchanged.
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
    stream_lines = [b"BT"]
    cursor_placed = False  # True once the first absolute "Td" has been emitted

    # Masthead: company/branch name (Document Company Name Display setting).
    if company_name:
        safe_company = company_name.replace('(', '\\(').replace(')', '\\)')
        stream_lines += [
            b"/F2 11 Tf",  # Masthead Font (Helvetica-Bold 11pt)
            b"50 810 Td",  # absolute anchor: top of page
            f"({safe_company}) Tj".encode("latin1", "replace"),
            b"0 -18 Td",
        ]
        cursor_placed = True

    # Custom banner: only present when custom_pdf_template_enabled + a
    # PdfTemplate is configured for the company, giving the "Custom" layout
    # a visibly different look from the "Default" one.
    if custom_banner:
        # Single-line Tj with no text wrapping: collapse whitespace/newlines
        # and cap length so a long template `content` value can't overrun the
        # page margin.
        flat_banner = " ".join(custom_banner.split())[:180]
        safe_banner = flat_banner.replace('(', '\\(').replace(')', '\\)')
        stream_lines += [b"/F1 9 Tf"]  # Banner Font (Helvetica 9pt)
        if not cursor_placed:
            stream_lines += [b"50 810 Td"]  # absolute anchor: top of page
            cursor_placed = True
        stream_lines += [
            f"({safe_banner}) Tj".encode("latin1", "replace"),
            b"0 -18 Td",
        ]

    # Title (default layout: absolute-anchored at 780; custom/masthead layout:
    # continues 12pt below whatever the cursor is at after the lines above).
    stream_lines += [b"/F2 20 Tf"]  # Title Font (Helvetica-Bold 20pt)
    if not cursor_placed:
        stream_lines += [b"50 780 Td"]
    else:
        stream_lines += [b"0 -12 Td"]
    stream_lines += [
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
            f"Material Lab Tests Pass Rate: {metrics.get('quality_tests_pass_rate', 0)}% ({metrics.get('quality_tests_pass_count', 0)} passed of {metrics.get('quality_tests_total', 0) - metrics.get('quality_tests_unassessed', 0)} assessed; {metrics.get('quality_tests_unassessed', 0)} not assessed)"
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


def _esc(s: str) -> str:
    """PDF text-escape parentheses and backslashes, latin1-safe."""
    return str(s).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def _fmt_row(cells, widths):
    """Render one fixed-width row from cell strings + column widths."""
    out = []
    for cell, w in zip(cells, widths):
        s = _esc(str(cell))
        if len(s) > w:
            s = s[: max(w - 1, 1)] + " "
        out.append(s.ljust(w))
    return "".join(out)


def _wrap_text(text: str, width: int):
    """Greedy word-wrap, also splitting on explicit newlines. Returns lines."""
    lines = []
    for para in str(text).split("\n"):
        words = para.split(" ")
        cur = ""
        for w in words:
            if not cur:
                cur = w
            elif len(cur) + 1 + len(w) <= width:
                cur += " " + w
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def generate_document_pdf(
    title: str,
    party_lines=None,
    table_headers=None,
    table_rows=None,
    col_widths=None,
    totals_lines=None,
    terms=None,
    company_name: str = "",
    custom_banner: str = None,
) -> bytes:
    """
    Pure-Python PDF for a line-item business document (Invoice / PO / BOQ).

    Reuses the same content-stream construction style as
    `generate_client_report_pdf` (manual object assembly, no external libs)
    but lays out a party-info block, an optional fixed-width line-item table,
    a totals block, and a wrapped Terms & Conditions footer. Long documents
    automatically paginate so content is never clipped off the page bottom.

    company_name / custom_banner: same semantics as the report generator
    (Document Company Name Display + optional custom PDF template banner).
    """
    party_lines = party_lines or []
    table_headers = table_headers or []
    table_rows = table_rows or []
    col_widths = col_widths or []
    totals_lines = totals_lines or []

    # Build a flat list of (font_key, font_size, text, dy_after) segments.
    # F2 = Helvetica-Bold, F1 = Helvetica (match the report generator).
    segs = []

    def add(font_key, size, text, dy):
        segs.append((font_key, size, text, dy))

    if company_name:
        add("F2", 11, company_name, 18)
    if custom_banner:
        flat = " ".join(custom_banner.split())[:180]
        add("F1", 9, flat, 18)

    add("F2", 20, title, 30)
    add("F1", 10, f"Generated on: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", 30)

    for line in party_lines:
        add("F1", 10, line, 14)
    if party_lines:
        add("F1", 10, "", 8)  # spacer

    if table_headers and col_widths:
        add("F2", 12, _fmt_row(table_headers, col_widths), 16)
        for row in table_rows:
            add("F1", 9, _fmt_row(row, col_widths), 12)
        add("F1", 9, "", 10)  # spacer

    if totals_lines:
        add("F2", 12, "SUMMARY / TOTALS", 16)
        for line in totals_lines:
            add("F1", 10, line, 14)
        add("F1", 10, "", 10)  # spacer

    if terms and terms.strip():
        add("F2", 12, "TERMS & CONDITIONS", 16)
        for line in _wrap_text(terms, 100):
            add("F1", 9, line, 12)

    # Paginate: page usable band y in (BOTTOM, TOP]. Top anchor at TOP.
    TOP, BOTTOM = 800, 50
    pages = []
    cur_y = TOP
    page_segs = []
    for font_key, size, text, dy in segs:
        if cur_y - dy < BOTTOM and page_segs:
            pages.append(page_segs)
            page_segs = []
            cur_y = TOP
        page_segs.append((font_key, size, text, dy))
        cur_y -= dy
    if page_segs:
        pages.append(page_segs)

    pdf = bytearray(b"%PDF-1.4\n")
    objects = []

    def add_object(obj_def: bytes) -> int:
        obj_id = len(objects) + 1
        objects.append(f"{obj_id} 0 obj\n".encode("ascii") + obj_def + b"endobj\n")
        return obj_id

    # Content streams (one per page).
    content_ids = []
    for p_segs in pages:
        stream_lines = [b"BT"]
        first = True
        for font_key, size, text, dy in p_segs:
            if first:
                stream_lines.append(b"50 800 Td")
                first = False
            else:
                stream_lines.append(f"0 -{dy} Td".encode("ascii"))
            stream_lines.append(f"/{font_key} {size} Tf".encode("ascii"))
            stream_lines.append(f"({_esc(text)}) Tj".encode("latin1", "replace"))
        stream_lines.append(b"ET")
        stream_data = b"\n".join(stream_lines)
        cid = add_object(
            f"<< /Length {len(stream_data)} >>\nstream\n".encode("ascii")
            + stream_data
            + b"\nendstream\n"
        )
        content_ids.append(cid)

    # Fonts.
    f1 = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n")
    f2 = add_object(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\n")

    # Page objects + Pages tree.
    page_ids = []
    for cid in content_ids:
        pid = add_object(
            b"<< /Type /Page\n"
            b"   /Parent 2 0 R\n"
            b"   /Resources << /Font << /F1 "
            + str(f1).encode()
            + b" 0 R /F2 "
            + str(f2).encode()
            + b" 0 R >> >>\n"
            b"   /MediaBox [0 0 595 842]\n"
            b"   /Contents "
            + str(cid).encode()
            + b" 0 R\n"
            b">>\n"
        )
        page_ids.append(pid)

    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    catalog = add_object(b"<< /Type /Catalog /Pages 2 0 R >>\n")
    pages_tree = add_object(f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>\n".encode("ascii"))

    # Assemble byte offsets.
    current_offset = len(pdf)
    offsets = {}
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
        pdf.extend(f"{offsets[obj_id]:010d} 00000 n \n".encode("ascii"))

    pdf.extend(b"trailer\n")
    pdf.extend(f"<< /Size {len(objects) + 1} /Root {catalog} 0 R >>\n".encode("ascii"))
    pdf.extend(b"startxref\n")
    pdf.extend(f"{xref_start}\n".encode("ascii"))
    pdf.extend(b"%%EOF\n")

    return bytes(pdf)
