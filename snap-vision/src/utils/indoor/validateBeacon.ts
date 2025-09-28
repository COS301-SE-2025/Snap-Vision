export type BeaconInput = {
  uuid: string;
  major: string | number;
  minor: string | number;
  x: number; // normalized 0..1
  y: number; // normalized 0..1
  txPowerAt1m?: string | number; // optional; default -59
  label?: string;
};

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

export function validateBeacon(input: BeaconInput) {
  const errors: string[] = [];
  const uuid = (input.uuid || '').trim();
  if (!UUID_RE.test(uuid))
    errors.push('UUID must be a valid v1–v5 UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx).');

  const toInt = (v: any) => {
    const n = Number(v);
    return Number.isInteger(n) ? n : NaN;
  };
  const major = toInt(input.major);
  const minor = toInt(input.minor);
  if (!Number.isInteger(major) || major < 0 || major > 65535)
    errors.push('Major must be an integer 0–65535.');
  if (!Number.isInteger(minor) || minor < 0 || minor > 65535)
    errors.push('Minor must be an integer 0–65535.');

  const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
  const x = clamp01(Number(input.x));
  const y = clamp01(Number(input.y));
  if (x !== input.x) errors.push('x must be normalized between 0 and 1.');
  if (y !== input.y) errors.push('y must be normalized between 0 and 1.');

  const tx =
    input.txPowerAt1m === undefined || input.txPowerAt1m === '' ? -59 : Number(input.txPowerAt1m);
  if (!Number.isFinite(tx) || tx < -100 || tx > -30)
    errors.push('txPowerAt1m must be between -100 and -30 dBm (or leave blank).');

  if (input.label && input.label.length > 100) errors.push('Label must be 100 chars or fewer.');

  return {
    ok: errors.length === 0,
    errors,
    value: { uuid, major, minor, x, y, txPowerAt1m: tx, label: (input.label || '').trim() },
  };
}
