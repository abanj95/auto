import Link from "next/link";
import Markdown, { type Components } from "react-markdown";

import { Container } from "@/components/public/container";
import { formatDay } from "@/lib/format";

// Admin-written markdown (site_settings.terms_md / privacy_md). Raw HTML is
// skipped, and react-markdown's default URL check drops javascript: and other
// unsafe links; only http(s), mailto:, tel: and internal paths are rendered as links.

const SAFE_LINK = /^(https?:|mailto:|tel:|\/(?!\/))/i;

const components: Components = {
  h1: ({ children }) => <h2 className="mt-10 text-2xl font-bold tracking-tight">{children}</h2>,
  h2: ({ children }) => <h2 className="mt-10 text-xl font-bold tracking-tight">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-6 text-lg font-semibold">{children}</h3>,
  p: ({ children }) => <p className="mt-4 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mt-4 list-disc space-y-2 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="mt-4 list-decimal space-y-2 pl-6">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  hr: () => <hr className="my-8" />,
  img: () => null, // No images in legal text.
  a: ({ href, children }) => {
    if (!href || !SAFE_LINK.test(href)) return <>{children}</>;
    const cls = "font-medium text-primary underline underline-offset-4";
    if (href.startsWith("/"))
      return (
        <Link href={href} className={cls}>
          {children}
        </Link>
      );
    const external = /^https?:/i.test(href);
    return (
      <a
        href={href}
        className={cls}
        {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
      >
        {children}
      </a>
    );
  },
};

export function LegalPage({
  title,
  markdown,
  updated,
}: {
  title: string;
  markdown: string;
  /** YYYY-MM-DD */
  updated: string;
}) {
  return (
    <Container className="max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated {formatDay(updated)}</p>
      <article className="text-[15px] text-neutral-800 sm:text-base">
        {markdown.trim() ? (
          <Markdown skipHtml components={components}>
            {markdown}
          </Markdown>
        ) : (
          <p className="mt-6 text-muted-foreground">This page is being updated.</p>
        )}
      </article>
    </Container>
  );
}
