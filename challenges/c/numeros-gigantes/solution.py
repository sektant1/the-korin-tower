import sys

# Python já tem inteiros de precisão arbitrária: a graça aqui está nas outras linguagens.


def main():
    out = []
    for line in sys.stdin:
        parts = line.split()
        if len(parts) != 3:
            continue
        a, op, b = int(parts[0]), parts[1], int(parts[2])
        out.append(str(a + b if op == "+" else a - b if op == "-" else a * b))
    print("\n".join(out))


main()
