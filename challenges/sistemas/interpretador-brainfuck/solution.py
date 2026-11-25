import sys

TAPE = 30000
LIMIT = 1_000_000


def main():
    raw = sys.stdin.buffer.read()
    nl = raw.find(b"\n")
    prog, data = (raw, b"") if nl < 0 else (raw[:nl], raw[nl + 1 :])
    code = [c for c in prog.decode("latin-1") if c in "<>+-.,[]"]
    n = len(code)
    jump = [0] * n
    stack = []
    for i, c in enumerate(code):
        if c == "[":
            stack.append(i)
        elif c == "]":
            if not stack:
                print("erro: colchetes")
                return
            j = stack.pop()
            jump[i], jump[j] = j, i
    if stack:
        print("erro: colchetes")
        return

    tape = bytearray(TAPE)
    out = bytearray()
    ptr = pc = steps = pos = 0
    error = None
    while pc < n:
        steps += 1
        if steps > LIMIT:
            error = "erro: limite de passos"
            break
        c = code[pc]
        if c == "+":
            tape[ptr] = (tape[ptr] + 1) & 255
        elif c == "-":
            tape[ptr] = (tape[ptr] - 1) & 255
        elif c == ">":
            ptr += 1
            if ptr >= TAPE:
                error = "erro: fita"
                break
        elif c == "<":
            ptr -= 1
            if ptr < 0:
                error = "erro: fita"
                break
        elif c == "[":
            if not tape[ptr]:
                pc = jump[pc]
        elif c == "]":
            if tape[ptr]:
                pc = jump[pc]
        elif c == ".":
            out.append(tape[ptr])
        else:  # ","
            tape[ptr] = data[pos] if pos < len(data) else 0
            pos += 1
        pc += 1
    sys.stdout.buffer.write(bytes(out))
    if error:
        sys.stdout.buffer.write(error.encode() + b"\n")


main()
