"""add parent_id to professions and works

Revision ID: d4e5f6a7b8c9
Revises: d53b05a7333a
Create Date: 2026-06-12 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: str = 'd53b05a7333a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add parent_id to professions table
    op.add_column('professions', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_professions_parent_id', 'professions', 'professions',
        ['parent_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('ix_professions_parent_id', 'professions', ['parent_id'])

    # Add parent_id to works table
    op.add_column('works', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_foreign_key(
        'fk_works_parent_id', 'works', 'works',
        ['parent_id'], ['id'], ondelete='SET NULL'
    )
    op.create_index('ix_works_parent_id', 'works', ['parent_id'])


def downgrade() -> None:
    # Remove from works
    op.drop_index('ix_works_parent_id', table_name='works')
    op.drop_constraint('fk_works_parent_id', 'works', type_='foreignkey')
    op.drop_column('works', 'parent_id')

    # Remove from professions
    op.drop_index('ix_professions_parent_id', table_name='professions')
    op.drop_constraint('fk_professions_parent_id', 'professions', type_='foreignkey')
    op.drop_column('professions', 'parent_id')
