import sys


def is_number(tok):
    digits = tok[1:] if len(tok) > 1 and tok[0] in "+-" else tok
    return digits.isdigit()


def c_div(a, b):
    """Divisão do C: trunca em direção a zero (o // do Python arredonda para baixo)."""
    q = abs(a) // abs(b)
    return q if (a < 0) == (b < 0) else -q


def evaluate(tokens):
    st = []
    for tok in tokens:
        if is_number(tok):
            st.append(int(tok))
        elif tok == "dup":
            if not st:
                return None
            st.append(st[-1])
        elif tok == "drop":
            if not st:
                return None
            st.pop()
        elif tok == "swap":
            if len(st) < 2:
                return None
            st[-1], st[-2] = st[-2], st[-1]
        elif tok in ("+", "-", "*", "/", "%"):
            if len(st) < 2:
                return None
            b = st.pop()
            a = st.pop()
            if tok in "/%" and b == 0:
                return None
            if tok == "+":
                st.append(a + b)
            elif tok == "-":
                st.append(a - b)
            elif tok == "*":
                st.append(a * b)
            elif tok == "/":
                st.append(c_div(a, b))
            else:
                st.append(a - b * c_div(a, b))
        else:
            return None
    return st[0] if len(st) == 1 else None


def main():
    out = []
    for line in sys.stdin:
        tokens = line.split()
        if not tokens:
            continue
        r = evaluate(tokens)
        out.append("erro" if r is None else str(r))
    print("\n".join(out))


main()
