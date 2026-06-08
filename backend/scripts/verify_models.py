import sys
import os

# Add the project root to sys.path
sys.path.append(os.getcwd())

from sqlalchemy.schema import CreateTable
from sqlalchemy import create_mock_engine
from app.models import Base

def dump(sql, *multiparams, **params):
    print(sql.compile(dialect=engine.dialect))

engine = create_mock_engine("postgresql://", dump)

def verify_models():
    print("Verifying model schema generation...")
    for table_name, table in Base.metadata.tables.items():
        print(f"\n--- Table: {table_name} ---")
        print(CreateTable(table).compile(dialect=engine.dialect))

if __name__ == "__main__":
    verify_models()
