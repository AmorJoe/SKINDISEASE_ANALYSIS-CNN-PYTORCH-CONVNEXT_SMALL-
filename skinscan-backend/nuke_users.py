
from django.db import connection

def nuke():
    with connection.cursor() as cursor:
        print("Dropping users table...")
        cursor.execute("DROP TABLE IF EXISTS users CASCADE;")
        print("Users table dropped.")

if __name__ == "__main__":
    nuke()
