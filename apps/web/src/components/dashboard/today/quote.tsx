export function Quote({ text }: { text: string }) {
  return (
    <p className="border-primary/30 border-l-2 py-1 pl-3.5 font-serif text-sm leading-relaxed text-white/40 italic">
      {text}
    </p>
  )
}
