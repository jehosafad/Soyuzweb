function toReadableStatus(status) {
    const map = {
        pending: "Pendiente",
        analysis: "Análisis",
        in_development: "En desarrollo",
        qa: "QA",
        deployed: "Desplegado",
        delivered: "Entregado",
        paused: "Pausado",
        cancelled: "Cancelado",
    };

    return map[status] || status || "Sin estado";
}

function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
}

export default function ProjectTimeline({ items = [] }) {
    if (!Array.isArray(items) || items.length === 0) {
        return (
            <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-900">Timeline no disponible</p>
                <p className="mt-1 text-sm text-slate-600">
                    Aún no hay eventos registrados para este proyecto.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tracking en vivo
            </p>

            <div className="mt-4 space-y-4">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;

                    return (
                        <div key={item.id || `${item.status}-${index}`} className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <div
                                    className={`mt-1 h-3 w-3 rounded-full ${
                                        isLast ? "bg-cyan-500" : "bg-slate-300"
                                    }`}
                                />
                                {!isLast ? <div className="mt-2 h-full w-px bg-slate-200" /> : null}
                            </div>

                            <div className="min-w-0 flex-1 pb-1">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {toReadableStatus(item.status)}
                                    </p>
                                    <span className="text-xs text-slate-500">
                    {formatDate(item.changed_at)}
                  </span>
                                </div>

                                <p className="mt-1 text-sm text-slate-600">
                                    {item.note || "Sin nota operativa."}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}