const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function playerIdFor(userId: string): string {
  const hex = userId
    .replace(/[^a-f\d]/gi, '')
    .padEnd(16, '0')
    .slice(0, 16);
  let value = BigInt(`0x${hex}`);
  let code = '';
  for (let index = 0; index < 10; index += 1) {
    code = alphabet[Number(value % BigInt(alphabet.length))]! + code;
    value /= BigInt(alphabet.length);
  }
  return `BIB-${code.slice(0, 6)}-${code.slice(6)}`;
}
