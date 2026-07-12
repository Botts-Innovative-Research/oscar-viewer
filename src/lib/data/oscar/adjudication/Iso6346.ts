/*
 * Copyright (c) 2026.  Botts Innovative Research, Inc.
 * All Rights Reserved
 */

/**
 * ISO 6346 shipping container number validation, mirroring the server-side
 * Iso6346.java: 3-letter owner code, category (U/J/Z), 6-digit serial and a
 * check digit computed as sum(charValue * 2^position) mod 11 mod 10.
 */

// letter values count up from A=10 skipping multiples of 11 (11/22/33 unused)
const LETTER_VALUES = [
    10, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24,
    25, 26, 27, 28, 29, 30, 31, 32, 34, 35, 36, 37, 38,
];

const CONTAINER_PATTERN = /^[A-Z]{3}[UJZ]\d{7}$/;

export function normalizeVehicleId(raw: string | null | undefined): string {
    if (!raw) return "";
    return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidIso6346(value: string | null | undefined): boolean {
    if (!value || !CONTAINER_PATTERN.test(value)) return false;

    let sum = 0;
    for (let i = 0; i < 10; i++) {
        const c = value.charCodeAt(i);
        const charValue = c >= 65 ? LETTER_VALUES[c - 65] : c - 48;
        sum += charValue * (1 << i);
    }
    return (sum % 11) % 10 === Number(value[10]);
}
