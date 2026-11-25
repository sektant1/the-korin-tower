import sys

PAIRS = {")": "(", "]": "[", "}": "{"}


def valid(s):
    stack = []
    for ch in s:
        if ch in PAIRS:
            if not stack or stack.pop() != PAIRS[ch]:
                return False
        else:
            stack.append(ch)
    return not stack


def main():
    data = sys.stdin.read().split()
    t = int(data[0])
    print("\n".join("sim" if valid(s) else "nao" for s in data[1 : 1 + t]))


main()
