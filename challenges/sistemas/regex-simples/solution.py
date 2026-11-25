import sys


def match_here(re, i, text, j):
    """O matcher de Rob Pike, com laço nos literais: recursão só no '*'."""
    while True:
        if i == len(re):
            return True
        if i + 1 < len(re) and re[i + 1] == "*":
            c = re[i]
            while True:  # zero ou mais c, recuando
                if match_here(re, i + 2, text, j):
                    return True
                if j < len(text) and (text[j] == c or c == "."):
                    j += 1
                else:
                    return False
        if re[i] == "$" and i + 1 == len(re):
            return j == len(text)
        if j < len(text) and (re[i] == "." or re[i] == text[j]):
            i += 1
            j += 1
            continue
        return False


def match(re, text):
    if re.startswith("^"):
        return match_here(re, 1, text, 0)
    return any(match_here(re, 0, text, j) for j in range(len(text) + 1))


def main():
    lines = sys.stdin.read().split("\n")
    re = lines[0].rstrip("\r")
    texts = lines[1:]
    if texts and texts[-1] == "":
        texts.pop()  # o \n final não é um texto vazio a mais
    print("\n".join("sim" if match(re, t.rstrip("\r")) else "nao" for t in texts))


main()
