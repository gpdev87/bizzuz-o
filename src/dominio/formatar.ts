export function formatarValor(centavos: number): string {
  const reais = Math.floor(centavos / 100);
  const resto = String(centavos % 100).padStart(2, '0');
  const milhar = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${milhar},${resto}`;
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
