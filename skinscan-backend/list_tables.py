
from django.db import connection
import sys

def list_tables():
    tables = connection.introspection.table_names()
    with open('tables.txt', 'w') as f:
        f.write(f"Total Count: {len(tables)}\n")
        for table in sorted(tables):
            f.write(f"- {table}\n")
    print("Tables written to tables.txt")

if __name__ == "__main__":
    list_tables()
