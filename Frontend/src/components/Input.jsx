export default function Input({ label, hint, className = "", ...props }) {
    return (
      <label className="block">
        {label ? (
          <span className="block text-sm font-semibold text-slate-900">
            {label}
          </span>
        ) : null}
  
        {hint ? <span className="mt-1 block text-xs text-slate-500">{hint}</span> : null}
  
        <input
          className={[
            "mt-2 w-full rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-900",
            "ring-1 ring-slate-200 shadow-sm transition",
            "placeholder:text-slate-400",
            "focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-50",
            className,
          ].join(" ")}
          {...props}
        />
      </label>
    );
  }