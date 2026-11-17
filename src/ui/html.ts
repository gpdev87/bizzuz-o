const ENTIDADES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Escapa texto para inserir com segurança em HTML. Todo conteúdo da base passa por aqui. */
export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

export function mailto(email: string, assunto: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(assunto)}`;
}
