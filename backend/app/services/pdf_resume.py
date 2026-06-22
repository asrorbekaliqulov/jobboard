"""
PDF Resume Generator
Generates a professional PDF resume from structured data using fpdf2.
Used by the bot to create downloadable CV files.
"""
import logging
from io import BytesIO
from typing import Optional

logger = logging.getLogger(__name__)


def generate_resume_pdf(data: dict) -> Optional[BytesIO]:
    """
    Generate a PDF resume from data dict.
    Expected keys: full_name, profession, age, experience, phone, telegram,
                   region, skills (list), summary, experience_details
    Returns BytesIO of PDF or None on failure.
    """
    try:
        from fpdf import FPDF
    except ImportError:
        logger.error("fpdf2 not installed")
        return None

    try:
        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=False)

        def s(text):
            if text is None:
                return ""
            replacements = {
                "'": "'", "'": "'", "ʻ": "'", "ʼ": "'",
                "—": "-", "–": "-", "“": '"', "”": '"', "•": "-",
            }
            text = str(text)
            for k, v in replacements.items():
                text = text.replace(k, v)
            return text.encode("latin-1", "replace").decode("latin-1")

        # ── Palette ──
        SIDEBAR = (37, 42, 69)      # dark navy
        ACCENT = (99, 102, 241)     # indigo
        LIGHT = (240, 241, 250)
        WHITE = (255, 255, 255)
        DARK = (40, 42, 54)
        GRAY = (120, 122, 135)

        PAGE_W, PAGE_H = 210, 297
        SIDEBAR_W = 68

        # ════════ LEFT SIDEBAR ════════
        pdf.set_fill_color(*SIDEBAR)
        pdf.rect(0, 0, SIDEBAR_W, PAGE_H, "F")

        full_name = (data.get("full_name") or "Nomzod").strip()
        # Initials circle
        initials = "".join([w[0] for w in full_name.split()[:2]]).upper() or "?"
        pdf.set_fill_color(*ACCENT)
        pdf.ellipse(SIDEBAR_W / 2 - 17, 18, 34, 34, "F")
        pdf.set_font("Helvetica", "B", 24)
        pdf.set_text_color(*WHITE)
        pdf.set_xy(SIDEBAR_W / 2 - 17, 27)
        pdf.cell(34, 16, s(initials), align="C")

        def sidebar_title(title, y):
            pdf.set_xy(8, y)
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(*ACCENT)
            pdf.cell(SIDEBAR_W - 16, 6, s(title.upper()), ln=True)
            pdf.set_draw_color(*ACCENT)
            pdf.set_line_width(0.3)
            pdf.line(8, y + 7, SIDEBAR_W - 8, y + 7)
            return y + 11

        # Contact section
        y = sidebar_title("Aloqa", 62)
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(220, 221, 230)
        contacts = []
        if data.get("phone"):
            contacts.append(("Tel", str(data["phone"])))
        if data.get("telegram"):
            contacts.append(("TG", str(data["telegram"])))
        if data.get("region"):
            contacts.append(("Hudud", str(data["region"])))
        if data.get("age"):
            contacts.append(("Yosh", str(data["age"])))
        for label, val in contacts:
            pdf.set_xy(8, y)
            pdf.set_font("Helvetica", "B", 8)
            pdf.set_text_color(*ACCENT)
            pdf.cell(SIDEBAR_W - 16, 4, s(label.upper()), ln=True)
            pdf.set_xy(8, y + 4)
            pdf.set_font("Helvetica", "", 9)
            pdf.set_text_color(225, 226, 235)
            pdf.multi_cell(SIDEBAR_W - 16, 4.5, s(val))
            y = pdf.get_y() + 3

        # Skills section
        skills = data.get("skills") or []
        if isinstance(skills, str):
            skills = [x.strip() for x in skills.split(",") if x.strip()]
        if skills:
            y = sidebar_title("Ko'nikmalar", max(y + 2, 120))
            pdf.set_font("Helvetica", "", 9)
            for sk in skills[:12]:
                if not str(sk).strip():
                    continue
                pdf.set_xy(8, y)
                pdf.set_fill_color(*ACCENT)
                pdf.ellipse(9, y + 1.6, 1.8, 1.8, "F")
                pdf.set_xy(13, y)
                pdf.set_text_color(225, 226, 235)
                pdf.multi_cell(SIDEBAR_W - 21, 4.5, s(str(sk).strip()))
                y = pdf.get_y() + 1.5

        # ════════ RIGHT MAIN AREA ════════
        MX = SIDEBAR_W + 10  # left margin of main area
        MW = PAGE_W - MX - 12  # main content width

        # Name + profession
        pdf.set_xy(MX, 22)
        pdf.set_font("Helvetica", "B", 26)
        pdf.set_text_color(*DARK)
        pdf.multi_cell(MW, 11, s(full_name.upper()))

        pdf.set_x(MX)
        pdf.set_font("Helvetica", "", 14)
        pdf.set_text_color(*ACCENT)
        pdf.cell(MW, 9, s(data.get("profession", "")), ln=True)

        my = pdf.get_y() + 6

        def main_section(title, y):
            pdf.set_xy(MX, y)
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(*DARK)
            # accent square
            pdf.set_fill_color(*ACCENT)
            pdf.rect(MX, y + 1, 3, 5, "F")
            pdf.set_xy(MX + 6, y)
            pdf.cell(MW - 6, 7, s(title), ln=True)
            pdf.set_draw_color(220, 221, 230)
            pdf.set_line_width(0.3)
            pdf.line(MX, y + 9, MX + MW, y + 9)
            return y + 13

        # About
        if data.get("summary"):
            my = main_section("Men haqimda", my)
            pdf.set_xy(MX, my)
            pdf.set_font("Helvetica", "", 10.5)
            pdf.set_text_color(*GRAY)
            pdf.multi_cell(MW, 5.5, s(data["summary"]))
            my = pdf.get_y() + 6

        # Experience
        if data.get("experience_details"):
            my = main_section("Ish tajribasi", my)
            if data.get("experience"):
                pdf.set_xy(MX, my)
                pdf.set_font("Helvetica", "B", 10.5)
                pdf.set_text_color(*ACCENT)
                pdf.cell(MW, 5.5, s(f"Umumiy tajriba: {data['experience']} yil"), ln=True)
                my = pdf.get_y() + 1
            pdf.set_xy(MX, my)
            pdf.set_font("Helvetica", "", 10.5)
            pdf.set_text_color(*GRAY)
            pdf.multi_cell(MW, 5.5, s(data["experience_details"]))
            my = pdf.get_y() + 6

        # ── Footer ──
        pdf.set_xy(MX, PAGE_H - 14)
        pdf.set_font("Helvetica", "I", 8.5)
        pdf.set_text_color(*GRAY)
        pdf.cell(MW, 5, s("ISHKOP - O'zbekiston mehnat bozori  |  ishkop.uz"), align="L")

        out = BytesIO()
        pdf_bytes = pdf.output()
        out.write(bytes(pdf_bytes))
        out.seek(0)
        out.name = "resume.pdf"
        return out

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        return None



def extract_pdf_text(file_bytes: bytes) -> str:
    """Extract text content from a PDF file."""
    try:
        from pypdf import PdfReader
        from io import BytesIO as _BytesIO
        reader = PdfReader(_BytesIO(file_bytes))
        text_parts = []
        for page in reader.pages[:5]:  # max 5 pages
            text_parts.append(page.extract_text() or "")
        return "\n".join(text_parts).strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        return ""
