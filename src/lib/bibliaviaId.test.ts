import { describe, expect, it } from 'vitest';
import { playerIdFor } from './bibliaviaId';

describe('Bibliavia Player ID', () => {
  it('creates a stable, readable public ID from the private user id', () => {
    const userId = '123e4567-e89b-12d3-a456-426614174000';
    expect(playerIdFor(userId)).toBe(playerIdFor(userId));
    expect(playerIdFor(userId)).toMatch(/^BIB-[23456789A-HJ-NP-Z]{6}-[23456789A-HJ-NP-Z]{4}$/);
  });
});
