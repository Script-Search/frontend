import { describe, test, expect } from '@jest/globals';

import { timestampConversion } from '../components/card';

describe('timestampConversion', () => {
  test('converts seconds to MM:SS format', () => {
    expect(timestampConversion(90)).toBe('01:30');
  });

  test('converts seconds to HH:MM:SS format when hours are present', () => {
    expect(timestampConversion(3660)).toBe('1:01:00');
  });
});
