export default function BentoCard({
    title,
    description,
    icon,
    highlight = false,
    children,
  }) {
    return (
      <div
        className={[
          "rounded-3xl p-6 shadow-sm ring-1 transition",
          highlight
            ? "bg-white ring-slate-200"
            : "bg-white ring-slate-200 hover:shadow-md",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            <span className="text-xl" aria-hidden="true">
              {icon}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">{title}</p>
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          </div>
        </div>
  
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    );
  }