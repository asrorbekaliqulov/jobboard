"""Add userbot tables and vacancy source columns (merges 3 heads)

This migration is ADDITIVE ONLY and SAFE for production data:
- Creates new tables: userbot_accounts, userbot_channels
- Adds new NULLABLE columns to vacancies: source_type, source_url, source_channel
It does NOT modify or drop any existing column or table.

It also merges the three previously divergent Alembic heads
(c1d2e3f4a5b6, d4e5f6a7b8c9, d7e8f9a0b1c2) into a single head.

Revision ID: e1f2a3b4c5d6
Revises: c1d2e3f4a5b6, d4e5f6a7b8c9, d7e8f9a0b1c2
Create Date: 2026-06-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e1f2a3b4c5d6"
# Merge all three existing heads
down_revision: Union[str, Sequence[str], None] = (
    "c1d2e3f4a5b6",
    "d4e5f6a7b8c9",
    "d7e8f9a0b1c2",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(bind, table_name: str, column_name: str) -> bool:
    insp = sa.inspect(bind)
    try:
        cols = [c["name"] for c in insp.get_columns(table_name)]
        return column_name in cols
    except Exception:
        return False


def _has_table(bind, table_name: str) -> bool:
    insp = sa.inspect(bind)
    try:
        return table_name in insp.get_table_names()
    except Exception:
        return False


def upgrade() -> None:
    bind = op.get_bind()

    # --- userbot_accounts ---
    if not _has_table(bind, "userbot_accounts"):
        op.create_table(
            "userbot_accounts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("phone", sa.String(32), nullable=False),
            sa.Column("api_id", sa.Integer(), nullable=False),
            sa.Column("api_hash", sa.String(255), nullable=False),
            sa.Column("session_string", sa.Text(), nullable=True),
            sa.Column("phone_code_hash", sa.String(255), nullable=True),
            sa.Column("status", sa.String(20), nullable=False, server_default="new"),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("last_error", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # --- userbot_channels ---
    if not _has_table(bind, "userbot_channels"):
        op.create_table(
            "userbot_channels",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column(
                "account_id",
                sa.Integer(),
                sa.ForeignKey("userbot_accounts.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("channel_identifier", sa.String(255), nullable=False),
            sa.Column("channel_title", sa.String(255), nullable=True),
            sa.Column("channel_username", sa.String(255), nullable=True),
            sa.Column("channel_photo_url", sa.String(1000), nullable=True),
            sa.Column("keywords", sa.Text(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("last_message_id", sa.Integer(), nullable=True),
            sa.Column("imported_count", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )

    # --- vacancies: additive nullable source columns ---
    if not _has_column(bind, "vacancies", "source_type"):
        op.add_column("vacancies", sa.Column("source_type", sa.String(32), nullable=True))
    if not _has_column(bind, "vacancies", "source_url"):
        op.add_column("vacancies", sa.Column("source_url", sa.String(1000), nullable=True))
    if not _has_column(bind, "vacancies", "source_channel"):
        op.add_column("vacancies", sa.Column("source_channel", sa.String(255), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if _has_column(bind, "vacancies", "source_channel"):
        op.drop_column("vacancies", "source_channel")
    if _has_column(bind, "vacancies", "source_url"):
        op.drop_column("vacancies", "source_url")
    if _has_column(bind, "vacancies", "source_type"):
        op.drop_column("vacancies", "source_type")
    if _has_table(bind, "userbot_channels"):
        op.drop_table("userbot_channels")
    if _has_table(bind, "userbot_accounts"):
        op.drop_table("userbot_accounts")
