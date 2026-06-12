"""add parent_id to profession_categories

Revision ID: c1d2e3f4a5b6
Revises: 9c3f8a1d4e2b
Create Date: 2026-06-12 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: str = 'd53b05a7333a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'profession_categories',
        sa.Column('parent_id', sa.Integer(), nullable=True)
    )
    op.create_foreign_key(
        'fk_profession_categories_parent_id',
        'profession_categories',
        'profession_categories',
        ['parent_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(
        'ix_profession_categories_parent_id',
        'profession_categories',
        ['parent_id']
    )


def downgrade() -> None:
    op.drop_index('ix_profession_categories_parent_id', table_name='profession_categories')
    op.drop_constraint('fk_profession_categories_parent_id', 'profession_categories', type_='foreignkey')
    op.drop_column('profession_categories', 'parent_id')
