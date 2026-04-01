export default function Button({
    as: Comp = "button",
    variant = "primary",
    className = "",
    ...props
  }) {
    const base =
      "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2";
  
    const styles = {
      primary:
        "bg-cyan-400 text-slate-900 shadow-sm ring-1 ring-cyan-300 hover:bg-cyan-300",
      secondary:
        "text-blue-600 ring-1 ring-slate-200 hover:bg-slate-50 bg-white",
      ghost: "text-slate-700 hover:bg-slate-50",
    };
  
    return <Comp className={`${base} ${styles[variant]} ${className}`} {...props} />;
  }