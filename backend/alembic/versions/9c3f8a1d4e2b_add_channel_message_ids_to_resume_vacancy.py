"""add channel and message ids to resume and vacancy

Revision ID: 9c3f8a1d4e2b
Revises: 7b3f4a9a6f11
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "9c3f8a1d4e2b"
down_revision: Union[str, None] = "7b3f4a9a6f11"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vacancies", sa.Column("channel_id", sa.String(length=255), nullable=True))
    op.add_column("vacancies", sa.Column("message_id", sa.Integer(), nullable=True))
    op.add_column("resumes", sa.Column("channel_id", sa.String(length=255), nullable=True))
    op.add_column("resumes", sa.Column("message_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("resumes", "message_id")
    op.drop_column("resumes", "channel_id")
    op.drop_column("vacancies", "message_id")
    op.drop_column("vacancies", "channel_id")
