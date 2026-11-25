import string
import sys


def main():
    k = int(sys.stdin.readline()) % 26
    lower, upper = string.ascii_lowercase, string.ascii_uppercase
    table = str.maketrans(lower + upper, lower[k:] + lower[:k] + upper[k:] + upper[:k])
    sys.stdout.write(sys.stdin.read().translate(table))


main()
