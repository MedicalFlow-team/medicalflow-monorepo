export function formatPhoneWithAreaCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length < 2) return `(${digits}`;

  const areaCode = digits.slice(0, 2);
  const number = digits.slice(2);
  if (number.length <= 4) return `(${areaCode}) ${number}`;

  const prefixLength = number.length === 9 ? 5 : 4;
  return `(${areaCode}) ${number.slice(0, prefixLength)}-${number.slice(prefixLength)}`;
}
