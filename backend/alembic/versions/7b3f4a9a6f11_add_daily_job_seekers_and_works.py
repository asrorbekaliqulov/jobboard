"""add daily job seekers and works

Revision ID: 7b3f4a9a6f11
Revises: d61b5eb62a39
Create Date: 2026-02-26 18:30:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "7b3f4a9a6f11"
down_revision: Union[str, None] = "d61b5eb62a39"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'DAILY_JOB_SEEKER'")
    gender_enum = postgresql.ENUM(
        "male", "female", "any", name="gender", create_type=False
    )
    resume_status_enum = postgresql.ENUM(
        "active", "draft", "deleted", "archived", name="resumestatus", create_type=False
    )

    op.create_table(
        "works",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name_uz", sa.String(length=255), nullable=False),
        sa.Column("name_ru", sa.String(length=255), nullable=False),
        sa.Column("name_en", sa.String(length=255), nullable=False),
        sa.Column(
            "status", sa.Boolean(), nullable=False, server_default=sa.text("true")
        ),
    )

    op.create_table(
        "daily_job_seekers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("first_name", sa.String(length=255), nullable=False),
        sa.Column("last_name", sa.String(length=255), nullable=False),
        sa.Column("middle_name", sa.String(length=255), nullable=True),
        sa.Column("age", sa.Integer(), nullable=False),
        sa.Column(
            "profession_id",
            sa.Integer(),
            sa.ForeignKey("professions.id"),
            nullable=False,
        ),
        sa.Column(
            "region_id", sa.Integer(), sa.ForeignKey("regions.id"), nullable=False
        ),
        sa.Column("gender", gender_enum, nullable=False),
        sa.Column("experience", sa.Integer(), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("telegram", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("portfolio", sa.String(length=255), nullable=True),
        sa.Column("video", sa.String(length=255), nullable=True),
        sa.Column(
            "additional_workers", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("status", resume_status_enum, nullable=False),
        sa.Column("viewed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )

    op.create_table(
        "daily_job_seeker_works",
        sa.Column(
            "daily_job_seeker_id",
            sa.Integer(),
            sa.ForeignKey("daily_job_seekers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "work_id",
            sa.Integer(),
            sa.ForeignKey("works.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "daily_job_seeker_districts",
        sa.Column(
            "daily_job_seeker_id",
            sa.Integer(),
            sa.ForeignKey("daily_job_seekers.id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "district_id",
            sa.Integer(),
            sa.ForeignKey("districts.id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    op.create_table(
        "favourite_daily_job_seekers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "daily_job_seeker_id",
            sa.Integer(),
            sa.ForeignKey("daily_job_seekers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )


def downgrade() -> None:
    op.drop_table("favourite_daily_job_seekers")
    op.drop_table("daily_job_seeker_districts")
    op.drop_table("daily_job_seeker_works")
    op.drop_table("daily_job_seekers")
    op.drop_table("works")
