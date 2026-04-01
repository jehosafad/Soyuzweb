export default function SectionHeading({ eyebrow, title, description }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wide text-cyan-600">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-3 text-sm sm:text-base text-slate-600">
          {description}
        </p>
      )}
    </div>
  );
}
