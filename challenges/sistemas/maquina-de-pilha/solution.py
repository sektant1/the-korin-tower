import sys

MAXS = 100_000
LIMIT = 1_000_000


def wrap(x):
    """Inteiro de 64 bits com sinal, dando a volta como em complemento de dois."""
    return (x + (1 << 63)) % (1 << 64) - (1 << 63)


def main():
    lines = sys.stdin.read().split("\n")
    n = int(lines[0])
    prog = []
    for line in lines[1 : 1 + n]:
        parts = line.split()
        prog.append((parts[0], int(parts[1]) if len(parts) > 1 else 0))

    st = []
    out = []
    pc = steps = 0

    def fail(msg):
        out.append(msg)

    while 0 <= pc < n:
        steps += 1
        if steps > LIMIT:
            fail("erro: limite de passos")
            break
        op, a = prog[pc]
        pc += 1
        if op == "push":
            st.append(a)
        elif op == "halt":
            break
        elif op == "jmp":
            if not 0 <= a < n:
                fail("erro: salto invalido")
                break
            pc = a
        elif op in ("pop", "dup", "print", "jz", "jnz"):
            if not st:
                fail("erro: pilha vazia")
                break
            if op == "pop":
                st.pop()
            elif op == "dup":
                st.append(st[-1])
            elif op == "print":
                out.append(str(st.pop()))
            elif (st.pop() == 0) == (op == "jz"):
                if not 0 <= a < n:
                    fail("erro: salto invalido")
                    break
                pc = a
        else:
            if len(st) < 2:
                fail("erro: pilha vazia")
                break
            y, x = st[-1], st[-2]
            if op == "swap":
                st[-1], st[-2] = x, y
            elif op == "over":
                st.append(x)
            else:
                if op == "add":
                    r = wrap(x + y)
                elif op == "sub":
                    r = wrap(x - y)
                elif op == "mul":
                    r = wrap(x * y)
                else:
                    if y == 0:
                        fail("erro: divisao por zero")
                        break
                    q = abs(x) // abs(y)  # trunca em direção a zero, como o C
                    q = q if (x < 0) == (y < 0) else -q
                    r = q if op == "div" else x - y * q
                del st[-2:]
                st.append(r)
        if len(st) > MAXS:
            fail("erro: pilha cheia")
            break
    if out:
        print("\n".join(out))


main()
