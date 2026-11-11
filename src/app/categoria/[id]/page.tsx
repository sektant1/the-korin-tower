import { permanentRedirect } from "next/navigation";

// As categorias viraram um filtro da torre (/desafios?sala=...). Links antigos continuam funcionando.
export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  permanentRedirect(`/desafios?sala=${encodeURIComponent((await params).id)}`);
}
