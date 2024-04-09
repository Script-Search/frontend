import { describe, test, expect, it } from '@jest/globals';
import React from 'react';
import { timestampConversion, createMarkup } from '../components/card';

describe('testing timestampConversion', () => {
    it('MM:SS format 1', () => {
        expect(timestampConversion(90)).toBe('01:30');
    });

    it('MM:SS format 2', () => {
        expect(timestampConversion(1940)).toBe('32:20');
    });

    it('HH:MM:SS format 1', () => {
        expect(timestampConversion(3660)).toBe('1:01:00');
    });

    it('HH:MM:SS format 2', () => {
        expect(timestampConversion(36000)).toBe('10:00:00');
    });
});

describe('testing createMarkup', () => {
    it('no mark tags', () => {
        const input = "This is a test.";
        const output = createMarkup(input);
        expect(output).toEqual(["This is a test."]);
    });

    it('single mark', () => {
        const input = "This is a <mark>test</mark>.";
        const output = createMarkup(input);
        // Create an expected output that includes a <b> element for comparison
        const expectedOutput = [
            "This is a ",
            React.createElement('b', { id: 'modal', key: 1 }, 'test'),
            "."
        ];
        expect(output).toEqual(expectedOutput);
    });

    it('two marks', () => {
        const input = "This <mark>is</mark> a <mark>test</mark>.";
        const output = createMarkup(input);
        const expectedOutput = [
            "This ",
            React.createElement('b', { id: 'modal', key: 1 }, 'is'),
            " a ",
            React.createElement('b', { id: 'modal', key: 3 }, 'test'),
            "."
        ];
        expect(output).toEqual(expectedOutput);
    });
});