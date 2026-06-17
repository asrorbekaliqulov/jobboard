"""Add AI feature tables

Revision ID: a1b2c3d4e5f7
Revises: 9c3f8a1d4e2b
Create Date: 2024-12-15 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f7"
down_revision: Union[str, None] = "9c3f8a1d4e2b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === AI Employer Trust Ratings ===
    op.create_table(
        "ai_employer_trust_ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employer_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("company_name", sa.String(255), nullable=False),
        sa.Column("overall_score", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("salary_punctuality_score", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("working_conditions_score", sa.Float(), server_default="0.0", nullable=False),
        sa.Column("communication_score", sa.Float(), server_default="0.0", nullable=False),
        sa.Column(
            "trust_level",
            sa.Enum("excellent", "good", "average", "poor", "dangerous", name="trustlevel"),
            server_default="average",
            nullable=False,
        ),
        sa.Column("total_reviews", sa.Integer(), server_default="0", nullable=False),
        sa.Column("total_vacancies_posted", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_verified", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_salary_complaints", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("has_condition_complaints", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === AI Employer Reviews ===
    op.create_table(
        "ai_employer_reviews",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("employer_trust_id", sa.Integer(), sa.ForeignKey("ai_employer_trust_ratings.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("reviewer_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("salary_punctuality", sa.Integer(), nullable=False),
        sa.Column("working_conditions", sa.Integer(), nullable=False),
        sa.Column("communication", sa.Integer(), nullable=False),
        sa.Column("overall", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("is_anonymous", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === AI Match Results ===
    op.create_table(
        "ai_match_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resume_id", sa.Integer(), sa.ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("overall_match", sa.Integer(), nullable=False),
        sa.Column("profession_match", sa.Integer(), nullable=False),
        sa.Column("experience_match", sa.Integer(), nullable=False),
        sa.Column("location_match", sa.Integer(), nullable=False),
        sa.Column("salary_match", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("ai_model_used", sa.String(50), server_default="gpt-4o-mini", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === AI Interview Sessions ===
    op.create_table(
        "ai_interview_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("profession_id", sa.Integer(), sa.ForeignKey("professions.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "status",
            sa.Enum("in_progress", "completed", "abandoned", name="interviewstatus"),
            server_default="in_progress",
            nullable=False,
        ),
        sa.Column("conversation", sa.JSON(), nullable=True),
        sa.Column("overall_score", sa.Integer(), nullable=True),
        sa.Column("strengths", sa.Text(), nullable=True),
        sa.Column("weaknesses", sa.Text(), nullable=True),
        sa.Column("recommendations", sa.Text(), nullable=True),
        sa.Column("questions_asked", sa.Integer(), server_default="0", nullable=False),
        sa.Column("questions_answered", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === AI Fraud Reports ===
    op.create_table(
        "ai_fraud_reports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("vacancy_id", sa.Integer(), sa.ForeignKey("vacancies.id", ondelete="SET NULL"), nullable=True, index=True),
        sa.Column("reported_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "severity",
            sa.Enum("low", "medium", "high", "critical", name="fraudseverity"),
            nullable=False,
        ),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("issues_detected", sa.JSON(), nullable=True),
        sa.Column("ai_explanation", sa.Text(), nullable=True),
        sa.Column("is_confirmed_fraud", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("is_false_positive", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("analyzed_text", sa.Text(), nullable=True),
        sa.Column("phone_number", sa.String(20), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    # === AI Salary Cache ===
    op.create_table(
        "ai_salary_cache",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("profession_id", sa.Integer(), sa.ForeignKey("professions.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("region_id", sa.Integer(), sa.ForeignKey("regions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("min_salary", sa.Integer(), server_default="0", nullable=False),
        sa.Column("max_salary", sa.Integer(), server_default="0", nullable=False),
        sa.Column("avg_salary", sa.Integer(), server_default="0", nullable=False),
        sa.Column("median_salary", sa.Integer(), server_default="0", nullable=False),
        sa.Column("sample_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("market_trend", sa.String(50), nullable=True),
        sa.Column("ai_recommendation", sa.Text(), nullable=True),
        sa.Column("last_calculated", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("ai_salary_cache")
    op.drop_table("ai_fraud_reports")
    op.drop_table("ai_interview_sessions")
    op.drop_table("ai_match_results")
    op.drop_table("ai_employer_reviews")
    op.drop_table("ai_employer_trust_ratings")
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS trustlevel")
    op.execute("DROP TYPE IF EXISTS interviewstatus")
    op.execute("DROP TYPE IF EXISTS fraudseverity")
