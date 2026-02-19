
import os

def read_last_bytes(filename, n):
    try:
        with open(filename, 'rb') as f:
            f.seek(0, os.SEEK_END)
            size = f.tell()
            f.seek(max(size - n, 0), os.SEEK_SET)
            content = f.read()
            print(content.decode('utf-8', errors='replace'))
    except FileNotFoundError:
        print("Log file not found.")

if __name__ == "__main__":
    read_last_bytes('logs/skinscan.log', 5000)
