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

        # Helper to safely encode text (fpdf core fonts are latin-1)
        def s(text):
            if text is None:
                return ""
            # Replace Uzbek-specific chars that latin-1 can't encode
            replacements = {
                "'": "'", "'": "'", "ʻ": "'", "ʼ": "'",
                "—": "-", "–": "-", "“": '"', "”": '"',
            }
            text = str(text)
            for k, v in replacements.items():
                text = text.replace(k, v)
            return text.encode("latin-1", "replace").decode("latin-1")

        # Header - name
        pdf.set_font("Helvetica", "B", 22)
        pdf.cell(0, 12, s(data.get("full_name", "Rezyume")), ln=True)

        # Profession
        pdf.set_font("Helvetica", "", 14)
        pdf.set_text_color(80, 80, 80)
        pdf.cell(0, 8, s(data.get("profession", "")), ln=True)
        pdf.set_text_color(0, 0, 0)
        pdf.ln(4)

        # Divider
        pdf.set_draw_color(99, 102, 241)
        pdf.set_line_width(0.6)
        pdf.line(10, pdf.get_y(), 200, pdf.get_y())
        pdf.ln(6)

        # Contact / basic info
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 8, "Shaxsiy ma'lumotlar", ln=True)
        pdf.set_font("Helvetica", "", 11)
        info_lines = []
        if data.get("age"):
            info_lines.append(f"Yosh: {data['age']}")
        if data.get("experience"):
            info_lines.append(f"Tajriba: {data['experience']} yil")
        if data.get("region"):
            info_lines.append(f"Hudud: {s(data['region'])}")
        if data.get("phone"):
            info_lines.append(f"Telefon: {s(data['phone'])}")
        if data.get("telegram"):
            info_lines.append(f"Telegram: {s(data['telegram'])}")
        for line in info_lines:
            pdf.cell(0, 7, s(line), ln=True)
        pdf.ln(4)

        # Summary / About
        if data.get("summary"):
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "O'zi haqida", ln=True)
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 6, s(data["summary"]))
            pdf.ln(3)

        # Experience details
        if data.get("experience_details"):
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Ish tajribasi", ln=True)
            pdf.set_font("Helvetica", "", 11)
            pdf.multi_cell(0, 6, s(data["experience_details"]))
            pdf.ln(3)

        # Skills
        skills = data.get("skills") or []
        if skills:
            pdf.set_font("Helvetica", "B", 12)
            pdf.cell(0, 8, "Ko'nikmalar", ln=True)
            pdf.set_font("Helvetica", "", 11)
            if isinstance(skills, list):
                skills_text = ", ".join(str(x) for x in skills)
            else:
                skills_text = str(skills)
            pdf.multi_cell(0, 6, s(skills_text))
            pdf.ln(3)

        # Footer
        pdf.set_y(-20)
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(150, 150, 150)
        pdf.cell(0, 6, "ISHKOP - O'zbekiston mehnat bozori", ln=True, align="C")

        # Output to BytesIO
        out = BytesIO()
        pdf_bytes = pdf.output()
        out.write(bytes(pdf_bytes))
        out.seek(0)
        out.name = "resume.pdf"
        return out

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        return None
