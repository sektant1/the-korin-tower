"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Menu do topo só para telas estreitas (CSS: .mobile-menu). No celular a sidebar
 * vai para o fim da página, e sem isto a navegação ficaria milhares de pixels abaixo.
 */
export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();
  // Navegação do lado do cliente não recarrega a página: fecha o menu na troca de rota.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  return (
    <details ref={ref} className="mobile-menu">
      <summary>☰ MENU</summary>
      <nav aria-label="Menu principal (celular)">
        <ul>
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  );
}
