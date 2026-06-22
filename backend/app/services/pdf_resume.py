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
        pdf.set_auto_page_break(auto=True, margin=15)

        def s(text):
            if text is None:
                return ""
            replacements = {
                "'": "'", "'": "'", "ʻ": "'", "ʼ": "'",
                "—": "-", "–": "-", "“": '"', "”": '"',
            }
            text = str(text)
            for k, v in replacements.items():
                text = text.replace(k, v)
            return text.encode("latin-1", "replace").decode("latin-1")

        ACCENT = (99, 102, 241)  # indigo
        DARK = (30, 30, 40)
        GRAY = (110, 110, 120)

        # ── Colored header band ──
        pdf.set_fill_color(*ACCENT)
        pdf.rect(0, 0, 210, 42, "F")

        pdf.set_xy(12, 10)
        pdf.set_font("Helvetica", "B", 24)
        pdf.set_text_color(255, 255, 255)
        pdf.cell(0, 11, s(data.get("full_name", "Rezyume")), ln=True)

        pdf.set_x(12)
        pdf.set_font("Helvetica", "", 13)
        pdf.set_text_color(230, 230, 255)
        pdf.cell(0, 8, s(data.get("profession", "")), ln=True)

        # Contact line in header
        contact_parts = []
        if data.get("phone"):
            contact_parts.append(f"Tel: {s(data['phone'])}")
        if data.get("telegram"):
            contact_parts.append(f"TG: {s(data['telegram'])}")
        if data.get("region"):
            contact_parts.append(s(data["region"]))
        if contact_parts:
            pdf.set_x(12)
            pdf.set_font("Helvetica", "", 10)
            pdf.cell(0, 6, s("  |  ".join(contact_parts)), ln=True)

        pdf.ln(12)
        pdf.set_text_color(*DARK)

        def section_title(title):
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(*ACCENT)
            pdf.cell(0, 8, s(title), ln=True)
            pdf.set_draw_color(*ACCENT)
            pdf.set_line_width(0.4)
            y = pdf.get_y()
            pdf.line(12, y, 198, y)
            pdf.ln(3)
            pdf.set_text_color(*DARK)

        # ── Basic info ──
        section_title("Shaxsiy ma'lumotlar")
        pdf.set_font("Helvetica", "", 11)
        basics = []
        if data.get("age"):
            basics.append(f"Yosh: {data['age']}")
        if data.get("experience"):
            basics.append(f"Tajriba: {data['experience']} yil")
        if basics:
            pdf.cell(0, 7, s("   ".join(basics)), ln=True)

        # ── About (first person) ──
        if data.get("summary"):
            section_title("O'zim haqimda")
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 6, s(data["summary"]))

        # ── Experience ──
        if data.get("experience_details"):
            section_title("Ish tajribasi")
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 6, s(data["experience_details"]))

        # ── Skills as bullet chips ──
        skills = data.get("skills") or []
        if skills:
            section_title("Ko'nikmalar")
            pdf.set_font("Helvetica", "", 11)
            if isinstance(skills, list):
                for sk in skills:
                    if sk and str(sk).strip():
                        pdf.cell(5, 6, s("•"), ln=False)
                        pdf.cell(0, 6, s(str(sk).strip()), ln=True)
            else:
                pdf.multi_cell(0, 6, s(str(skills)))

        # ── Footer ──
        pdf.set_y(-18)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(*GRAY)
        pdf.cell(0, 6, s("ISHKOP - O'zbekiston mehnat bozori  |  ishkop.uz"), ln=True, align="C")

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
