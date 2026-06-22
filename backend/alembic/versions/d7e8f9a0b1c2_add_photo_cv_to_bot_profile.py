"""Add photo_file_id and cv_url to bot_user_profiles

Revision ID: d7e8f9a0b1c2
Revises: c5d6e7f8a9b0
Create Date: 2025-01-22 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, None] = "c5d6e7f8a9b0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("bot_user_profiles", sa.Column("photo_file_id", sa.String(512), nullable=True))
    op.add_column("bot_user_profiles", sa.Column("cv_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("bot_user_profiles", "cv_url")
    op.drop_column("bot_user_profiles", "photo_file_id")
