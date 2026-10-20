// Párrafos separados por línea en blanco, con `código` en línea. Para textos de data/*.json.
export default function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className={className}>
          {paragraph.split(/(`[^`]+`)/g).map((part, j) =>
            part.startsWith("`") && part.endsWith("`") ? (
              <code key={j} className="data inline-code">
                {part.slice(1, -1)}
              </code>
            ) : (
              part
            )
          )}
        </p>
      ))}
    </>
  );
}
