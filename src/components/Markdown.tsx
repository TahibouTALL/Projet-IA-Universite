import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

/** Rendu Markdown et formules. `reading` : page de manuel (cours, corrections) ; `chat` : réponse du tuteur. */
export function Markdown({ children, variant = "reading" }: { children: string; variant?: "reading" | "chat" }) {
  return (
    <div className={variant === "chat" ? "prose-reading prose-chat" : "prose-reading"}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
