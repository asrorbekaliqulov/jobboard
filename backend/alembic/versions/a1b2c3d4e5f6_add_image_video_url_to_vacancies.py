"""add image_url and video_url to vacancies

Revision ID: a1b2c3d4e5f6
Revises: 7b3f4a9a6f11
Create Date: 2026-04-01 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "3a4539b50c9d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vacancies", sa.Column("image_url", sa.String(1000), nullable=True))
    op.add_column("vacancies", sa.Column("video_url", sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column("vacancies", "video_url")
    op.drop_column("vacancies", "image_url")
