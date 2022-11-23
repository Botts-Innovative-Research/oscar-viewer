/*
 * Copyright (c) 2022.  Botts Innovative Research, Inc.
 * All Rights Reserved
 *
 * opensensorhub/osh-viewer is licensed under the
 *
 * Mozilla Public License 2.0
 * Permissions of this weak copyleft license are conditioned on making available source code of licensed
 * files and modifications of those files under the same license (or in certain cases, one of the GNU licenses).
 * Copyright and license notices must be preserved. Contributors provide an express grant of patent rights.
 * However, a larger work using the licensed work may be distributed under different terms and without
 * source code for files added in the larger work.
 *
 */

// Modified to add an alpha channel applied
export function colorHash(inputString: string, alpha: number = 1.0): any {
    let sum: number = 0;

    for (let idx: number = 0; idx < inputString.length; ++idx) {

        sum += inputString.charCodeAt(idx);
    }

    let r: number = ~~(parseFloat('0.' + Math.sin(sum + 1).toString().substr(6)) * 256);
    let g: number = ~~(parseFloat('0.' + Math.sin(sum + 2).toString().substr(6)) * 256);
    let b: number = ~~(parseFloat('0.' + Math.sin(sum + 3).toString().substr(6)) * 256);

    // Ensure colors are brighter by boosting saturation
    let hsl: any = rgb2hsl(r, g, b);
    let rgb: any = hsl2rgb(hsl.h, hsl.s, hsl.l);

    let rgba: string = "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + alpha + ")";

    let hex: string = "#";

    hex += ("00" + rgb.r.toString(16)).substr(-2, 2).toUpperCase();
    hex += ("00" + rgb.g.toString(16)).substr(-2, 2).toUpperCase();
    hex += ("00" + rgb.b.toString(16)).substr(-2, 2).toUpperCase();

    return {
        r: rgb.r,
        g: rgb.b,
        b: rgb.b,
        a: alpha,
        rgba: rgba,
        hex: hex
    };
}

// in: r,g,b in [0,1], out: h in [0,360) and s,l in [0,1]
function rgb2hsl(r: number, g: number, b: number): any {
    let v: number = Math.max(r, g, b), c = v - Math.min(r, g, b), f = (1 - Math.abs(v + v - c - 1));
    let h = c && ((v == r) ? (g - b) / c : ((v == g) ? 2 + (b - r) / c : 4 + (r - g) / c));
    let hsl: any = {
        h: 60 * (h < 0 ? h + 6 : h),
        s: f ? c / f : 0,
        l: (v + v - c) / 2
    };
    return hsl;
}

// input: h as an angle in [0,360] and s,l in [0,1] - output: r,g,b in [0,1]
// If s < 0 then ensures s > 0, and if s < .5, boosts s by .5 making the resulting color brighter
function hsl2rgb(h: number, s: number, l: number): any {
    if (s < 0) s*= -1;
    if (s < .5) s += .5;
    let a: number = s * Math.min(l, 1 - l);
    let f = (n: number, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    let rgb: any = {
        r: f(0),
        g: f(8),
        b: f(4)
    };
    return rgb;
}
