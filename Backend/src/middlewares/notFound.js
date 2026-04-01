function notFound(req, res) {
    res.status(404).json({ ok: false, error: "NOT_FOUND", requestId: req.id || null });
}

module.exports = { notFound };