"""category not need in profession, it's nullable

Revision ID: 1db9f80618ed
Revises: 48269e5f4707
Create Date: 2026-01-26 15:34:05.781304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1db9f80618ed'
down_revision: Union[str, None] = '48269e5f4707'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
