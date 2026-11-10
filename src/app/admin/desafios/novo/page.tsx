import type { Metadata } from "next";
import Link from "next/link";
import { FlameTitle, Window } from "@/components/Retro";
import { requireAdmin } from "@/lib/auth/session";
import { listCategories } from "@/lib/challenges";
import { ChallengeForm } from "../ChallengeForm";

export const metadata: Metadata = { title: "Novo desafio", robots: { index: false } };

export default async function NewChallengePage() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <>
      <FlameTitle>NOVO DESAFIO</FlameTitle>
      <p>
        <Link href="/admin">« voltar ao painel</Link>
      </p>
      <Window title="novo.txt">
        <ChallengeForm
          categories={categories}
          initial={{
            originalSlug: null,
            slug: "",
            title: "",
            category: categories[0]?.id ?? "",
            difficulty: 1,
            kind: "stdio",
            languages: ["c"],
            tags: "",
            checker: "exact",
            tolerance: 2,
            maxBadRatio: 0.005,
            timeLimitMs: 2000,
            memoryLimitMb: 256,
            order: 0,
            statement: "",
            notes: "",
            hints: [],
            templates: { c: "#include <stdio.h>\n\nint main(void) {\n    return 0;\n}\n" },
            solutions: {},
            tests: [{ name: "01", input: "", expected: "", hidden: false }],
          }}
        />
      </Window>
    </>
  );
}
