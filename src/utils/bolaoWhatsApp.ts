/** Formata destino brasileiro sem duplicar o DDI; entrada inválida abre compartilhamento sem destinatário. */
export function bolaoWhatsAppUrl(phone: string | undefined, message: string): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  const national = digits.startsWith("55") && digits.length === 13 ? digits.slice(2) : digits;
  const valid = /^[1-9][0-9]{10}$/.test(national);
  const destination = valid ? `55${national}` : "";
  return `https://wa.me/${destination}?text=${encodeURIComponent(message)}`;
}
