"""add parent_id to professions

Revision ID: d4e5f6a7b8c9
Revises: c1d2e3f4a5b6
Create Date: 2026-06-12 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: str = 'c1d2e3f4a5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'professions',
        sa.Column('parent_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_professions_parent_id',
        'professions',
        'professions',
        ['parent_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        'ix_professions_parent_id',
        'professions',
        ['parent_id']
    )


def downgrade() -> None:
    op.drop_index('ix_professions_parent_id', table_name='professions')
    op.drop_constraint('fk_professions_parent_id', 'professions', type_='foreignkey')
    op.drop_column('professions', 'parent_id')
