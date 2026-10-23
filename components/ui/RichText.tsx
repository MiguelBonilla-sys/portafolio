// Texto de data/*.json con `código` en línea. RichText separa párrafos por línea en blanco.
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/g).map((part, j) =>
        part.startsWith("`") && part.endsWith("`") ? (
          <code key={j} className="data inline-code">
            {part.slice(1, -1)}
          </code>
        ) : (
          part
        )
      )}
    </>
  );
}

export default function RichText({ text, className }: { text: string; className?: string }) {
  return (
    <>
      {text.split("\n\n").map((paragraph, i) => (
        <p key={i} className={className}>
          <Inline text={paragraph} />
        </p>
      ))}
    </>
  );
}
