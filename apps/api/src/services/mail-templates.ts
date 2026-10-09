function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character] ?? character,
  );
}

export function actionEmailHtml(options: {
  title: string;
  description: string;
  action: string;
  url: string;
  expiry: string;
}): string {
  const title = escapeHtml(options.title);
  const description = escapeHtml(options.description);
  const action = escapeHtml(options.action);
  const url = escapeHtml(options.url);
  const expiry = escapeHtml(options.expiry);
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;background:#f5f8fc;font-family:Arial,sans-serif;color:#14263d"><main style="max-width:560px;margin:0 auto;padding:32px;background:#fff;border-radius:12px"><h1 style="font-size:24px">${title}</h1><p>${description}</p><p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#0263b5;color:#fff;text-decoration:none;border-radius:6px">${action}</a></p><p>${expiry}</p><p style="overflow-wrap:anywhere;font-size:12px">Se o botão não funcionar, abra: <a href="${url}">${url}</a></p></main></body></html>`;
}
