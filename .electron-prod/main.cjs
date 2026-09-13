var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/tweetnacl/nacl-fast.js
var require_nacl_fast = __commonJS({
  "node_modules/tweetnacl/nacl-fast.js"(exports2, module2) {
    (function(nacl2) {
      "use strict";
      var gf = function(init) {
        var i, r = new Float64Array(16);
        if (init) for (i = 0; i < init.length; i++) r[i] = init[i];
        return r;
      };
      var randombytes = function() {
        throw new Error("no PRNG");
      };
      var _0 = new Uint8Array(16);
      var _9 = new Uint8Array(32);
      _9[0] = 9;
      var gf0 = gf(), gf1 = gf([1]), _121665 = gf([56129, 1]), D = gf([30883, 4953, 19914, 30187, 55467, 16705, 2637, 112, 59544, 30585, 16505, 36039, 65139, 11119, 27886, 20995]), D2 = gf([61785, 9906, 39828, 60374, 45398, 33411, 5274, 224, 53552, 61171, 33010, 6542, 64743, 22239, 55772, 9222]), X = gf([54554, 36645, 11616, 51542, 42930, 38181, 51040, 26924, 56412, 64982, 57905, 49316, 21502, 52590, 14035, 8553]), Y = gf([26200, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214, 26214]), I = gf([41136, 18958, 6951, 50414, 58488, 44335, 6150, 12099, 55207, 15867, 153, 11085, 57099, 20417, 9344, 11139]);
      function ts64(x, i, h, l) {
        x[i] = h >> 24 & 255;
        x[i + 1] = h >> 16 & 255;
        x[i + 2] = h >> 8 & 255;
        x[i + 3] = h & 255;
        x[i + 4] = l >> 24 & 255;
        x[i + 5] = l >> 16 & 255;
        x[i + 6] = l >> 8 & 255;
        x[i + 7] = l & 255;
      }
      function vn(x, xi, y, yi, n) {
        var i, d = 0;
        for (i = 0; i < n; i++) d |= x[xi + i] ^ y[yi + i];
        return (1 & d - 1 >>> 8) - 1;
      }
      function crypto_verify_16(x, xi, y, yi) {
        return vn(x, xi, y, yi, 16);
      }
      function crypto_verify_32(x, xi, y, yi) {
        return vn(x, xi, y, yi, 32);
      }
      function core_salsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        x0 = x0 + j0 | 0;
        x1 = x1 + j1 | 0;
        x2 = x2 + j2 | 0;
        x3 = x3 + j3 | 0;
        x4 = x4 + j4 | 0;
        x5 = x5 + j5 | 0;
        x6 = x6 + j6 | 0;
        x7 = x7 + j7 | 0;
        x8 = x8 + j8 | 0;
        x9 = x9 + j9 | 0;
        x10 = x10 + j10 | 0;
        x11 = x11 + j11 | 0;
        x12 = x12 + j12 | 0;
        x13 = x13 + j13 | 0;
        x14 = x14 + j14 | 0;
        x15 = x15 + j15 | 0;
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x1 >>> 0 & 255;
        o[5] = x1 >>> 8 & 255;
        o[6] = x1 >>> 16 & 255;
        o[7] = x1 >>> 24 & 255;
        o[8] = x2 >>> 0 & 255;
        o[9] = x2 >>> 8 & 255;
        o[10] = x2 >>> 16 & 255;
        o[11] = x2 >>> 24 & 255;
        o[12] = x3 >>> 0 & 255;
        o[13] = x3 >>> 8 & 255;
        o[14] = x3 >>> 16 & 255;
        o[15] = x3 >>> 24 & 255;
        o[16] = x4 >>> 0 & 255;
        o[17] = x4 >>> 8 & 255;
        o[18] = x4 >>> 16 & 255;
        o[19] = x4 >>> 24 & 255;
        o[20] = x5 >>> 0 & 255;
        o[21] = x5 >>> 8 & 255;
        o[22] = x5 >>> 16 & 255;
        o[23] = x5 >>> 24 & 255;
        o[24] = x6 >>> 0 & 255;
        o[25] = x6 >>> 8 & 255;
        o[26] = x6 >>> 16 & 255;
        o[27] = x6 >>> 24 & 255;
        o[28] = x7 >>> 0 & 255;
        o[29] = x7 >>> 8 & 255;
        o[30] = x7 >>> 16 & 255;
        o[31] = x7 >>> 24 & 255;
        o[32] = x8 >>> 0 & 255;
        o[33] = x8 >>> 8 & 255;
        o[34] = x8 >>> 16 & 255;
        o[35] = x8 >>> 24 & 255;
        o[36] = x9 >>> 0 & 255;
        o[37] = x9 >>> 8 & 255;
        o[38] = x9 >>> 16 & 255;
        o[39] = x9 >>> 24 & 255;
        o[40] = x10 >>> 0 & 255;
        o[41] = x10 >>> 8 & 255;
        o[42] = x10 >>> 16 & 255;
        o[43] = x10 >>> 24 & 255;
        o[44] = x11 >>> 0 & 255;
        o[45] = x11 >>> 8 & 255;
        o[46] = x11 >>> 16 & 255;
        o[47] = x11 >>> 24 & 255;
        o[48] = x12 >>> 0 & 255;
        o[49] = x12 >>> 8 & 255;
        o[50] = x12 >>> 16 & 255;
        o[51] = x12 >>> 24 & 255;
        o[52] = x13 >>> 0 & 255;
        o[53] = x13 >>> 8 & 255;
        o[54] = x13 >>> 16 & 255;
        o[55] = x13 >>> 24 & 255;
        o[56] = x14 >>> 0 & 255;
        o[57] = x14 >>> 8 & 255;
        o[58] = x14 >>> 16 & 255;
        o[59] = x14 >>> 24 & 255;
        o[60] = x15 >>> 0 & 255;
        o[61] = x15 >>> 8 & 255;
        o[62] = x15 >>> 16 & 255;
        o[63] = x15 >>> 24 & 255;
      }
      function core_hsalsa20(o, p, k, c) {
        var j0 = c[0] & 255 | (c[1] & 255) << 8 | (c[2] & 255) << 16 | (c[3] & 255) << 24, j1 = k[0] & 255 | (k[1] & 255) << 8 | (k[2] & 255) << 16 | (k[3] & 255) << 24, j2 = k[4] & 255 | (k[5] & 255) << 8 | (k[6] & 255) << 16 | (k[7] & 255) << 24, j3 = k[8] & 255 | (k[9] & 255) << 8 | (k[10] & 255) << 16 | (k[11] & 255) << 24, j4 = k[12] & 255 | (k[13] & 255) << 8 | (k[14] & 255) << 16 | (k[15] & 255) << 24, j5 = c[4] & 255 | (c[5] & 255) << 8 | (c[6] & 255) << 16 | (c[7] & 255) << 24, j6 = p[0] & 255 | (p[1] & 255) << 8 | (p[2] & 255) << 16 | (p[3] & 255) << 24, j7 = p[4] & 255 | (p[5] & 255) << 8 | (p[6] & 255) << 16 | (p[7] & 255) << 24, j8 = p[8] & 255 | (p[9] & 255) << 8 | (p[10] & 255) << 16 | (p[11] & 255) << 24, j9 = p[12] & 255 | (p[13] & 255) << 8 | (p[14] & 255) << 16 | (p[15] & 255) << 24, j10 = c[8] & 255 | (c[9] & 255) << 8 | (c[10] & 255) << 16 | (c[11] & 255) << 24, j11 = k[16] & 255 | (k[17] & 255) << 8 | (k[18] & 255) << 16 | (k[19] & 255) << 24, j12 = k[20] & 255 | (k[21] & 255) << 8 | (k[22] & 255) << 16 | (k[23] & 255) << 24, j13 = k[24] & 255 | (k[25] & 255) << 8 | (k[26] & 255) << 16 | (k[27] & 255) << 24, j14 = k[28] & 255 | (k[29] & 255) << 8 | (k[30] & 255) << 16 | (k[31] & 255) << 24, j15 = c[12] & 255 | (c[13] & 255) << 8 | (c[14] & 255) << 16 | (c[15] & 255) << 24;
        var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
        for (var i = 0; i < 20; i += 2) {
          u = x0 + x12 | 0;
          x4 ^= u << 7 | u >>> 32 - 7;
          u = x4 + x0 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x4 | 0;
          x12 ^= u << 13 | u >>> 32 - 13;
          u = x12 + x8 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x1 | 0;
          x9 ^= u << 7 | u >>> 32 - 7;
          u = x9 + x5 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x9 | 0;
          x1 ^= u << 13 | u >>> 32 - 13;
          u = x1 + x13 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x6 | 0;
          x14 ^= u << 7 | u >>> 32 - 7;
          u = x14 + x10 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x14 | 0;
          x6 ^= u << 13 | u >>> 32 - 13;
          u = x6 + x2 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x11 | 0;
          x3 ^= u << 7 | u >>> 32 - 7;
          u = x3 + x15 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x3 | 0;
          x11 ^= u << 13 | u >>> 32 - 13;
          u = x11 + x7 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
          u = x0 + x3 | 0;
          x1 ^= u << 7 | u >>> 32 - 7;
          u = x1 + x0 | 0;
          x2 ^= u << 9 | u >>> 32 - 9;
          u = x2 + x1 | 0;
          x3 ^= u << 13 | u >>> 32 - 13;
          u = x3 + x2 | 0;
          x0 ^= u << 18 | u >>> 32 - 18;
          u = x5 + x4 | 0;
          x6 ^= u << 7 | u >>> 32 - 7;
          u = x6 + x5 | 0;
          x7 ^= u << 9 | u >>> 32 - 9;
          u = x7 + x6 | 0;
          x4 ^= u << 13 | u >>> 32 - 13;
          u = x4 + x7 | 0;
          x5 ^= u << 18 | u >>> 32 - 18;
          u = x10 + x9 | 0;
          x11 ^= u << 7 | u >>> 32 - 7;
          u = x11 + x10 | 0;
          x8 ^= u << 9 | u >>> 32 - 9;
          u = x8 + x11 | 0;
          x9 ^= u << 13 | u >>> 32 - 13;
          u = x9 + x8 | 0;
          x10 ^= u << 18 | u >>> 32 - 18;
          u = x15 + x14 | 0;
          x12 ^= u << 7 | u >>> 32 - 7;
          u = x12 + x15 | 0;
          x13 ^= u << 9 | u >>> 32 - 9;
          u = x13 + x12 | 0;
          x14 ^= u << 13 | u >>> 32 - 13;
          u = x14 + x13 | 0;
          x15 ^= u << 18 | u >>> 32 - 18;
        }
        o[0] = x0 >>> 0 & 255;
        o[1] = x0 >>> 8 & 255;
        o[2] = x0 >>> 16 & 255;
        o[3] = x0 >>> 24 & 255;
        o[4] = x5 >>> 0 & 255;
        o[5] = x5 >>> 8 & 255;
        o[6] = x5 >>> 16 & 255;
        o[7] = x5 >>> 24 & 255;
        o[8] = x10 >>> 0 & 255;
        o[9] = x10 >>> 8 & 255;
        o[10] = x10 >>> 16 & 255;
        o[11] = x10 >>> 24 & 255;
        o[12] = x15 >>> 0 & 255;
        o[13] = x15 >>> 8 & 255;
        o[14] = x15 >>> 16 & 255;
        o[15] = x15 >>> 24 & 255;
        o[16] = x6 >>> 0 & 255;
        o[17] = x6 >>> 8 & 255;
        o[18] = x6 >>> 16 & 255;
        o[19] = x6 >>> 24 & 255;
        o[20] = x7 >>> 0 & 255;
        o[21] = x7 >>> 8 & 255;
        o[22] = x7 >>> 16 & 255;
        o[23] = x7 >>> 24 & 255;
        o[24] = x8 >>> 0 & 255;
        o[25] = x8 >>> 8 & 255;
        o[26] = x8 >>> 16 & 255;
        o[27] = x8 >>> 24 & 255;
        o[28] = x9 >>> 0 & 255;
        o[29] = x9 >>> 8 & 255;
        o[30] = x9 >>> 16 & 255;
        o[31] = x9 >>> 24 & 255;
      }
      function crypto_core_salsa20(out, inp, k, c) {
        core_salsa20(out, inp, k, c);
      }
      function crypto_core_hsalsa20(out, inp, k, c) {
        core_hsalsa20(out, inp, k, c);
      }
      var sigma = new Uint8Array([101, 120, 112, 97, 110, 100, 32, 51, 50, 45, 98, 121, 116, 101, 32, 107]);
      function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = m[mpos + i] ^ x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
          mpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = m[mpos + i] ^ x[i];
        }
        return 0;
      }
      function crypto_stream_salsa20(c, cpos, b, n, k) {
        var z = new Uint8Array(16), x = new Uint8Array(64);
        var u, i;
        for (i = 0; i < 16; i++) z[i] = 0;
        for (i = 0; i < 8; i++) z[i] = n[i];
        while (b >= 64) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < 64; i++) c[cpos + i] = x[i];
          u = 1;
          for (i = 8; i < 16; i++) {
            u = u + (z[i] & 255) | 0;
            z[i] = u & 255;
            u >>>= 8;
          }
          b -= 64;
          cpos += 64;
        }
        if (b > 0) {
          crypto_core_salsa20(x, z, k, sigma);
          for (i = 0; i < b; i++) c[cpos + i] = x[i];
        }
        return 0;
      }
      function crypto_stream(c, cpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20(c, cpos, d, sn, s);
      }
      function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
        var s = new Uint8Array(32);
        crypto_core_hsalsa20(s, n, k, sigma);
        var sn = new Uint8Array(8);
        for (var i = 0; i < 8; i++) sn[i] = n[i + 16];
        return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
      }
      var poly1305 = function(key) {
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.leftover = 0;
        this.fin = 0;
        var t0, t1, t2, t3, t4, t5, t6, t7;
        t0 = key[0] & 255 | (key[1] & 255) << 8;
        this.r[0] = t0 & 8191;
        t1 = key[2] & 255 | (key[3] & 255) << 8;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
        t2 = key[4] & 255 | (key[5] & 255) << 8;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
        t3 = key[6] & 255 | (key[7] & 255) << 8;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
        t4 = key[8] & 255 | (key[9] & 255) << 8;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
        this.r[5] = t4 >>> 1 & 8190;
        t5 = key[10] & 255 | (key[11] & 255) << 8;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
        t6 = key[12] & 255 | (key[13] & 255) << 8;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
        t7 = key[14] & 255 | (key[15] & 255) << 8;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
        this.r[9] = t7 >>> 5 & 127;
        this.pad[0] = key[16] & 255 | (key[17] & 255) << 8;
        this.pad[1] = key[18] & 255 | (key[19] & 255) << 8;
        this.pad[2] = key[20] & 255 | (key[21] & 255) << 8;
        this.pad[3] = key[22] & 255 | (key[23] & 255) << 8;
        this.pad[4] = key[24] & 255 | (key[25] & 255) << 8;
        this.pad[5] = key[26] & 255 | (key[27] & 255) << 8;
        this.pad[6] = key[28] & 255 | (key[29] & 255) << 8;
        this.pad[7] = key[30] & 255 | (key[31] & 255) << 8;
      };
      poly1305.prototype.blocks = function(m, mpos, bytes) {
        var hibit = this.fin ? 0 : 1 << 11;
        var t0, t1, t2, t3, t4, t5, t6, t7, c;
        var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
        var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
        var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
        while (bytes >= 16) {
          t0 = m[mpos + 0] & 255 | (m[mpos + 1] & 255) << 8;
          h0 += t0 & 8191;
          t1 = m[mpos + 2] & 255 | (m[mpos + 3] & 255) << 8;
          h1 += (t0 >>> 13 | t1 << 3) & 8191;
          t2 = m[mpos + 4] & 255 | (m[mpos + 5] & 255) << 8;
          h2 += (t1 >>> 10 | t2 << 6) & 8191;
          t3 = m[mpos + 6] & 255 | (m[mpos + 7] & 255) << 8;
          h3 += (t2 >>> 7 | t3 << 9) & 8191;
          t4 = m[mpos + 8] & 255 | (m[mpos + 9] & 255) << 8;
          h4 += (t3 >>> 4 | t4 << 12) & 8191;
          h5 += t4 >>> 1 & 8191;
          t5 = m[mpos + 10] & 255 | (m[mpos + 11] & 255) << 8;
          h6 += (t4 >>> 14 | t5 << 2) & 8191;
          t6 = m[mpos + 12] & 255 | (m[mpos + 13] & 255) << 8;
          h7 += (t5 >>> 11 | t6 << 5) & 8191;
          t7 = m[mpos + 14] & 255 | (m[mpos + 15] & 255) << 8;
          h8 += (t6 >>> 8 | t7 << 8) & 8191;
          h9 += t7 >>> 5 | hibit;
          c = 0;
          d0 = c;
          d0 += h0 * r0;
          d0 += h1 * (5 * r9);
          d0 += h2 * (5 * r8);
          d0 += h3 * (5 * r7);
          d0 += h4 * (5 * r6);
          c = d0 >>> 13;
          d0 &= 8191;
          d0 += h5 * (5 * r5);
          d0 += h6 * (5 * r4);
          d0 += h7 * (5 * r3);
          d0 += h8 * (5 * r2);
          d0 += h9 * (5 * r1);
          c += d0 >>> 13;
          d0 &= 8191;
          d1 = c;
          d1 += h0 * r1;
          d1 += h1 * r0;
          d1 += h2 * (5 * r9);
          d1 += h3 * (5 * r8);
          d1 += h4 * (5 * r7);
          c = d1 >>> 13;
          d1 &= 8191;
          d1 += h5 * (5 * r6);
          d1 += h6 * (5 * r5);
          d1 += h7 * (5 * r4);
          d1 += h8 * (5 * r3);
          d1 += h9 * (5 * r2);
          c += d1 >>> 13;
          d1 &= 8191;
          d2 = c;
          d2 += h0 * r2;
          d2 += h1 * r1;
          d2 += h2 * r0;
          d2 += h3 * (5 * r9);
          d2 += h4 * (5 * r8);
          c = d2 >>> 13;
          d2 &= 8191;
          d2 += h5 * (5 * r7);
          d2 += h6 * (5 * r6);
          d2 += h7 * (5 * r5);
          d2 += h8 * (5 * r4);
          d2 += h9 * (5 * r3);
          c += d2 >>> 13;
          d2 &= 8191;
          d3 = c;
          d3 += h0 * r3;
          d3 += h1 * r2;
          d3 += h2 * r1;
          d3 += h3 * r0;
          d3 += h4 * (5 * r9);
          c = d3 >>> 13;
          d3 &= 8191;
          d3 += h5 * (5 * r8);
          d3 += h6 * (5 * r7);
          d3 += h7 * (5 * r6);
          d3 += h8 * (5 * r5);
          d3 += h9 * (5 * r4);
          c += d3 >>> 13;
          d3 &= 8191;
          d4 = c;
          d4 += h0 * r4;
          d4 += h1 * r3;
          d4 += h2 * r2;
          d4 += h3 * r1;
          d4 += h4 * r0;
          c = d4 >>> 13;
          d4 &= 8191;
          d4 += h5 * (5 * r9);
          d4 += h6 * (5 * r8);
          d4 += h7 * (5 * r7);
          d4 += h8 * (5 * r6);
          d4 += h9 * (5 * r5);
          c += d4 >>> 13;
          d4 &= 8191;
          d5 = c;
          d5 += h0 * r5;
          d5 += h1 * r4;
          d5 += h2 * r3;
          d5 += h3 * r2;
          d5 += h4 * r1;
          c = d5 >>> 13;
          d5 &= 8191;
          d5 += h5 * r0;
          d5 += h6 * (5 * r9);
          d5 += h7 * (5 * r8);
          d5 += h8 * (5 * r7);
          d5 += h9 * (5 * r6);
          c += d5 >>> 13;
          d5 &= 8191;
          d6 = c;
          d6 += h0 * r6;
          d6 += h1 * r5;
          d6 += h2 * r4;
          d6 += h3 * r3;
          d6 += h4 * r2;
          c = d6 >>> 13;
          d6 &= 8191;
          d6 += h5 * r1;
          d6 += h6 * r0;
          d6 += h7 * (5 * r9);
          d6 += h8 * (5 * r8);
          d6 += h9 * (5 * r7);
          c += d6 >>> 13;
          d6 &= 8191;
          d7 = c;
          d7 += h0 * r7;
          d7 += h1 * r6;
          d7 += h2 * r5;
          d7 += h3 * r4;
          d7 += h4 * r3;
          c = d7 >>> 13;
          d7 &= 8191;
          d7 += h5 * r2;
          d7 += h6 * r1;
          d7 += h7 * r0;
          d7 += h8 * (5 * r9);
          d7 += h9 * (5 * r8);
          c += d7 >>> 13;
          d7 &= 8191;
          d8 = c;
          d8 += h0 * r8;
          d8 += h1 * r7;
          d8 += h2 * r6;
          d8 += h3 * r5;
          d8 += h4 * r4;
          c = d8 >>> 13;
          d8 &= 8191;
          d8 += h5 * r3;
          d8 += h6 * r2;
          d8 += h7 * r1;
          d8 += h8 * r0;
          d8 += h9 * (5 * r9);
          c += d8 >>> 13;
          d8 &= 8191;
          d9 = c;
          d9 += h0 * r9;
          d9 += h1 * r8;
          d9 += h2 * r7;
          d9 += h3 * r6;
          d9 += h4 * r5;
          c = d9 >>> 13;
          d9 &= 8191;
          d9 += h5 * r4;
          d9 += h6 * r3;
          d9 += h7 * r2;
          d9 += h8 * r1;
          d9 += h9 * r0;
          c += d9 >>> 13;
          d9 &= 8191;
          c = (c << 2) + c | 0;
          c = c + d0 | 0;
          d0 = c & 8191;
          c = c >>> 13;
          d1 += c;
          h0 = d0;
          h1 = d1;
          h2 = d2;
          h3 = d3;
          h4 = d4;
          h5 = d5;
          h6 = d6;
          h7 = d7;
          h8 = d8;
          h9 = d9;
          mpos += 16;
          bytes -= 16;
        }
        this.h[0] = h0;
        this.h[1] = h1;
        this.h[2] = h2;
        this.h[3] = h3;
        this.h[4] = h4;
        this.h[5] = h5;
        this.h[6] = h6;
        this.h[7] = h7;
        this.h[8] = h8;
        this.h[9] = h9;
      };
      poly1305.prototype.finish = function(mac, macpos) {
        var g = new Uint16Array(10);
        var c, mask, f, i;
        if (this.leftover) {
          i = this.leftover;
          this.buffer[i++] = 1;
          for (; i < 16; i++) this.buffer[i] = 0;
          this.fin = 1;
          this.blocks(this.buffer, 0, 16);
        }
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        for (i = 2; i < 10; i++) {
          this.h[i] += c;
          c = this.h[i] >>> 13;
          this.h[i] &= 8191;
        }
        this.h[0] += c * 5;
        c = this.h[0] >>> 13;
        this.h[0] &= 8191;
        this.h[1] += c;
        c = this.h[1] >>> 13;
        this.h[1] &= 8191;
        this.h[2] += c;
        g[0] = this.h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 8191;
        for (i = 1; i < 10; i++) {
          g[i] = this.h[i] + c;
          c = g[i] >>> 13;
          g[i] &= 8191;
        }
        g[9] -= 1 << 13;
        mask = (c ^ 1) - 1;
        for (i = 0; i < 10; i++) g[i] &= mask;
        mask = ~mask;
        for (i = 0; i < 10; i++) this.h[i] = this.h[i] & mask | g[i];
        this.h[0] = (this.h[0] | this.h[1] << 13) & 65535;
        this.h[1] = (this.h[1] >>> 3 | this.h[2] << 10) & 65535;
        this.h[2] = (this.h[2] >>> 6 | this.h[3] << 7) & 65535;
        this.h[3] = (this.h[3] >>> 9 | this.h[4] << 4) & 65535;
        this.h[4] = (this.h[4] >>> 12 | this.h[5] << 1 | this.h[6] << 14) & 65535;
        this.h[5] = (this.h[6] >>> 2 | this.h[7] << 11) & 65535;
        this.h[6] = (this.h[7] >>> 5 | this.h[8] << 8) & 65535;
        this.h[7] = (this.h[8] >>> 8 | this.h[9] << 5) & 65535;
        f = this.h[0] + this.pad[0];
        this.h[0] = f & 65535;
        for (i = 1; i < 8; i++) {
          f = (this.h[i] + this.pad[i] | 0) + (f >>> 16) | 0;
          this.h[i] = f & 65535;
        }
        mac[macpos + 0] = this.h[0] >>> 0 & 255;
        mac[macpos + 1] = this.h[0] >>> 8 & 255;
        mac[macpos + 2] = this.h[1] >>> 0 & 255;
        mac[macpos + 3] = this.h[1] >>> 8 & 255;
        mac[macpos + 4] = this.h[2] >>> 0 & 255;
        mac[macpos + 5] = this.h[2] >>> 8 & 255;
        mac[macpos + 6] = this.h[3] >>> 0 & 255;
        mac[macpos + 7] = this.h[3] >>> 8 & 255;
        mac[macpos + 8] = this.h[4] >>> 0 & 255;
        mac[macpos + 9] = this.h[4] >>> 8 & 255;
        mac[macpos + 10] = this.h[5] >>> 0 & 255;
        mac[macpos + 11] = this.h[5] >>> 8 & 255;
        mac[macpos + 12] = this.h[6] >>> 0 & 255;
        mac[macpos + 13] = this.h[6] >>> 8 & 255;
        mac[macpos + 14] = this.h[7] >>> 0 & 255;
        mac[macpos + 15] = this.h[7] >>> 8 & 255;
      };
      poly1305.prototype.update = function(m, mpos, bytes) {
        var i, want;
        if (this.leftover) {
          want = 16 - this.leftover;
          if (want > bytes)
            want = bytes;
          for (i = 0; i < want; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          bytes -= want;
          mpos += want;
          this.leftover += want;
          if (this.leftover < 16)
            return;
          this.blocks(this.buffer, 0, 16);
          this.leftover = 0;
        }
        if (bytes >= 16) {
          want = bytes - bytes % 16;
          this.blocks(m, mpos, want);
          mpos += want;
          bytes -= want;
        }
        if (bytes) {
          for (i = 0; i < bytes; i++)
            this.buffer[this.leftover + i] = m[mpos + i];
          this.leftover += bytes;
        }
      };
      function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
        var s = new poly1305(k);
        s.update(m, mpos, n);
        s.finish(out, outpos);
        return 0;
      }
      function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
        var x = new Uint8Array(16);
        crypto_onetimeauth(x, 0, m, mpos, n, k);
        return crypto_verify_16(h, hpos, x, 0);
      }
      function crypto_secretbox(c, m, d, n, k) {
        var i;
        if (d < 32) return -1;
        crypto_stream_xor(c, 0, m, 0, d, n, k);
        crypto_onetimeauth(c, 16, c, 32, d - 32, c);
        for (i = 0; i < 16; i++) c[i] = 0;
        return 0;
      }
      function crypto_secretbox_open(m, c, d, n, k) {
        var i;
        var x = new Uint8Array(32);
        if (d < 32) return -1;
        crypto_stream(x, 0, 32, n, k);
        if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0) return -1;
        crypto_stream_xor(m, 0, c, 0, d, n, k);
        for (i = 0; i < 32; i++) m[i] = 0;
        return 0;
      }
      function set25519(r, a) {
        var i;
        for (i = 0; i < 16; i++) r[i] = a[i] | 0;
      }
      function car25519(o) {
        var i, v, c = 1;
        for (i = 0; i < 16; i++) {
          v = o[i] + c + 65535;
          c = Math.floor(v / 65536);
          o[i] = v - c * 65536;
        }
        o[0] += c - 1 + 37 * (c - 1);
      }
      function sel25519(p, q, b) {
        var t, c = ~(b - 1);
        for (var i = 0; i < 16; i++) {
          t = c & (p[i] ^ q[i]);
          p[i] ^= t;
          q[i] ^= t;
        }
      }
      function pack25519(o, n) {
        var i, j, b;
        var m = gf(), t = gf();
        for (i = 0; i < 16; i++) t[i] = n[i];
        car25519(t);
        car25519(t);
        car25519(t);
        for (j = 0; j < 2; j++) {
          m[0] = t[0] - 65517;
          for (i = 1; i < 15; i++) {
            m[i] = t[i] - 65535 - (m[i - 1] >> 16 & 1);
            m[i - 1] &= 65535;
          }
          m[15] = t[15] - 32767 - (m[14] >> 16 & 1);
          b = m[15] >> 16 & 1;
          m[14] &= 65535;
          sel25519(t, m, 1 - b);
        }
        for (i = 0; i < 16; i++) {
          o[2 * i] = t[i] & 255;
          o[2 * i + 1] = t[i] >> 8;
        }
      }
      function neq25519(a, b) {
        var c = new Uint8Array(32), d = new Uint8Array(32);
        pack25519(c, a);
        pack25519(d, b);
        return crypto_verify_32(c, 0, d, 0);
      }
      function par25519(a) {
        var d = new Uint8Array(32);
        pack25519(d, a);
        return d[0] & 1;
      }
      function unpack25519(o, n) {
        var i;
        for (i = 0; i < 16; i++) o[i] = n[2 * i] + (n[2 * i + 1] << 8);
        o[15] &= 32767;
      }
      function A(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] + b[i];
      }
      function Z(o, a, b) {
        for (var i = 0; i < 16; i++) o[i] = a[i] - b[i];
      }
      function M(o, a, b) {
        var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
        v = a[0];
        t0 += v * b0;
        t1 += v * b1;
        t2 += v * b2;
        t3 += v * b3;
        t4 += v * b4;
        t5 += v * b5;
        t6 += v * b6;
        t7 += v * b7;
        t8 += v * b8;
        t9 += v * b9;
        t10 += v * b10;
        t11 += v * b11;
        t12 += v * b12;
        t13 += v * b13;
        t14 += v * b14;
        t15 += v * b15;
        v = a[1];
        t1 += v * b0;
        t2 += v * b1;
        t3 += v * b2;
        t4 += v * b3;
        t5 += v * b4;
        t6 += v * b5;
        t7 += v * b6;
        t8 += v * b7;
        t9 += v * b8;
        t10 += v * b9;
        t11 += v * b10;
        t12 += v * b11;
        t13 += v * b12;
        t14 += v * b13;
        t15 += v * b14;
        t16 += v * b15;
        v = a[2];
        t2 += v * b0;
        t3 += v * b1;
        t4 += v * b2;
        t5 += v * b3;
        t6 += v * b4;
        t7 += v * b5;
        t8 += v * b6;
        t9 += v * b7;
        t10 += v * b8;
        t11 += v * b9;
        t12 += v * b10;
        t13 += v * b11;
        t14 += v * b12;
        t15 += v * b13;
        t16 += v * b14;
        t17 += v * b15;
        v = a[3];
        t3 += v * b0;
        t4 += v * b1;
        t5 += v * b2;
        t6 += v * b3;
        t7 += v * b4;
        t8 += v * b5;
        t9 += v * b6;
        t10 += v * b7;
        t11 += v * b8;
        t12 += v * b9;
        t13 += v * b10;
        t14 += v * b11;
        t15 += v * b12;
        t16 += v * b13;
        t17 += v * b14;
        t18 += v * b15;
        v = a[4];
        t4 += v * b0;
        t5 += v * b1;
        t6 += v * b2;
        t7 += v * b3;
        t8 += v * b4;
        t9 += v * b5;
        t10 += v * b6;
        t11 += v * b7;
        t12 += v * b8;
        t13 += v * b9;
        t14 += v * b10;
        t15 += v * b11;
        t16 += v * b12;
        t17 += v * b13;
        t18 += v * b14;
        t19 += v * b15;
        v = a[5];
        t5 += v * b0;
        t6 += v * b1;
        t7 += v * b2;
        t8 += v * b3;
        t9 += v * b4;
        t10 += v * b5;
        t11 += v * b6;
        t12 += v * b7;
        t13 += v * b8;
        t14 += v * b9;
        t15 += v * b10;
        t16 += v * b11;
        t17 += v * b12;
        t18 += v * b13;
        t19 += v * b14;
        t20 += v * b15;
        v = a[6];
        t6 += v * b0;
        t7 += v * b1;
        t8 += v * b2;
        t9 += v * b3;
        t10 += v * b4;
        t11 += v * b5;
        t12 += v * b6;
        t13 += v * b7;
        t14 += v * b8;
        t15 += v * b9;
        t16 += v * b10;
        t17 += v * b11;
        t18 += v * b12;
        t19 += v * b13;
        t20 += v * b14;
        t21 += v * b15;
        v = a[7];
        t7 += v * b0;
        t8 += v * b1;
        t9 += v * b2;
        t10 += v * b3;
        t11 += v * b4;
        t12 += v * b5;
        t13 += v * b6;
        t14 += v * b7;
        t15 += v * b8;
        t16 += v * b9;
        t17 += v * b10;
        t18 += v * b11;
        t19 += v * b12;
        t20 += v * b13;
        t21 += v * b14;
        t22 += v * b15;
        v = a[8];
        t8 += v * b0;
        t9 += v * b1;
        t10 += v * b2;
        t11 += v * b3;
        t12 += v * b4;
        t13 += v * b5;
        t14 += v * b6;
        t15 += v * b7;
        t16 += v * b8;
        t17 += v * b9;
        t18 += v * b10;
        t19 += v * b11;
        t20 += v * b12;
        t21 += v * b13;
        t22 += v * b14;
        t23 += v * b15;
        v = a[9];
        t9 += v * b0;
        t10 += v * b1;
        t11 += v * b2;
        t12 += v * b3;
        t13 += v * b4;
        t14 += v * b5;
        t15 += v * b6;
        t16 += v * b7;
        t17 += v * b8;
        t18 += v * b9;
        t19 += v * b10;
        t20 += v * b11;
        t21 += v * b12;
        t22 += v * b13;
        t23 += v * b14;
        t24 += v * b15;
        v = a[10];
        t10 += v * b0;
        t11 += v * b1;
        t12 += v * b2;
        t13 += v * b3;
        t14 += v * b4;
        t15 += v * b5;
        t16 += v * b6;
        t17 += v * b7;
        t18 += v * b8;
        t19 += v * b9;
        t20 += v * b10;
        t21 += v * b11;
        t22 += v * b12;
        t23 += v * b13;
        t24 += v * b14;
        t25 += v * b15;
        v = a[11];
        t11 += v * b0;
        t12 += v * b1;
        t13 += v * b2;
        t14 += v * b3;
        t15 += v * b4;
        t16 += v * b5;
        t17 += v * b6;
        t18 += v * b7;
        t19 += v * b8;
        t20 += v * b9;
        t21 += v * b10;
        t22 += v * b11;
        t23 += v * b12;
        t24 += v * b13;
        t25 += v * b14;
        t26 += v * b15;
        v = a[12];
        t12 += v * b0;
        t13 += v * b1;
        t14 += v * b2;
        t15 += v * b3;
        t16 += v * b4;
        t17 += v * b5;
        t18 += v * b6;
        t19 += v * b7;
        t20 += v * b8;
        t21 += v * b9;
        t22 += v * b10;
        t23 += v * b11;
        t24 += v * b12;
        t25 += v * b13;
        t26 += v * b14;
        t27 += v * b15;
        v = a[13];
        t13 += v * b0;
        t14 += v * b1;
        t15 += v * b2;
        t16 += v * b3;
        t17 += v * b4;
        t18 += v * b5;
        t19 += v * b6;
        t20 += v * b7;
        t21 += v * b8;
        t22 += v * b9;
        t23 += v * b10;
        t24 += v * b11;
        t25 += v * b12;
        t26 += v * b13;
        t27 += v * b14;
        t28 += v * b15;
        v = a[14];
        t14 += v * b0;
        t15 += v * b1;
        t16 += v * b2;
        t17 += v * b3;
        t18 += v * b4;
        t19 += v * b5;
        t20 += v * b6;
        t21 += v * b7;
        t22 += v * b8;
        t23 += v * b9;
        t24 += v * b10;
        t25 += v * b11;
        t26 += v * b12;
        t27 += v * b13;
        t28 += v * b14;
        t29 += v * b15;
        v = a[15];
        t15 += v * b0;
        t16 += v * b1;
        t17 += v * b2;
        t18 += v * b3;
        t19 += v * b4;
        t20 += v * b5;
        t21 += v * b6;
        t22 += v * b7;
        t23 += v * b8;
        t24 += v * b9;
        t25 += v * b10;
        t26 += v * b11;
        t27 += v * b12;
        t28 += v * b13;
        t29 += v * b14;
        t30 += v * b15;
        t0 += 38 * t16;
        t1 += 38 * t17;
        t2 += 38 * t18;
        t3 += 38 * t19;
        t4 += 38 * t20;
        t5 += 38 * t21;
        t6 += 38 * t22;
        t7 += 38 * t23;
        t8 += 38 * t24;
        t9 += 38 * t25;
        t10 += 38 * t26;
        t11 += 38 * t27;
        t12 += 38 * t28;
        t13 += 38 * t29;
        t14 += 38 * t30;
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        c = 1;
        v = t0 + c + 65535;
        c = Math.floor(v / 65536);
        t0 = v - c * 65536;
        v = t1 + c + 65535;
        c = Math.floor(v / 65536);
        t1 = v - c * 65536;
        v = t2 + c + 65535;
        c = Math.floor(v / 65536);
        t2 = v - c * 65536;
        v = t3 + c + 65535;
        c = Math.floor(v / 65536);
        t3 = v - c * 65536;
        v = t4 + c + 65535;
        c = Math.floor(v / 65536);
        t4 = v - c * 65536;
        v = t5 + c + 65535;
        c = Math.floor(v / 65536);
        t5 = v - c * 65536;
        v = t6 + c + 65535;
        c = Math.floor(v / 65536);
        t6 = v - c * 65536;
        v = t7 + c + 65535;
        c = Math.floor(v / 65536);
        t7 = v - c * 65536;
        v = t8 + c + 65535;
        c = Math.floor(v / 65536);
        t8 = v - c * 65536;
        v = t9 + c + 65535;
        c = Math.floor(v / 65536);
        t9 = v - c * 65536;
        v = t10 + c + 65535;
        c = Math.floor(v / 65536);
        t10 = v - c * 65536;
        v = t11 + c + 65535;
        c = Math.floor(v / 65536);
        t11 = v - c * 65536;
        v = t12 + c + 65535;
        c = Math.floor(v / 65536);
        t12 = v - c * 65536;
        v = t13 + c + 65535;
        c = Math.floor(v / 65536);
        t13 = v - c * 65536;
        v = t14 + c + 65535;
        c = Math.floor(v / 65536);
        t14 = v - c * 65536;
        v = t15 + c + 65535;
        c = Math.floor(v / 65536);
        t15 = v - c * 65536;
        t0 += c - 1 + 37 * (c - 1);
        o[0] = t0;
        o[1] = t1;
        o[2] = t2;
        o[3] = t3;
        o[4] = t4;
        o[5] = t5;
        o[6] = t6;
        o[7] = t7;
        o[8] = t8;
        o[9] = t9;
        o[10] = t10;
        o[11] = t11;
        o[12] = t12;
        o[13] = t13;
        o[14] = t14;
        o[15] = t15;
      }
      function S(o, a) {
        M(o, a, a);
      }
      function inv25519(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 253; a >= 0; a--) {
          S(c, c);
          if (a !== 2 && a !== 4) M(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function pow2523(o, i) {
        var c = gf();
        var a;
        for (a = 0; a < 16; a++) c[a] = i[a];
        for (a = 250; a >= 0; a--) {
          S(c, c);
          if (a !== 1) M(c, c, i);
        }
        for (a = 0; a < 16; a++) o[a] = c[a];
      }
      function crypto_scalarmult(q, n, p) {
        var z = new Uint8Array(32);
        var x = new Float64Array(80), r, i;
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
        for (i = 0; i < 31; i++) z[i] = n[i];
        z[31] = n[31] & 127 | 64;
        z[0] &= 248;
        unpack25519(x, p);
        for (i = 0; i < 16; i++) {
          b[i] = x[i];
          d[i] = a[i] = c[i] = 0;
        }
        a[0] = d[0] = 1;
        for (i = 254; i >= 0; --i) {
          r = z[i >>> 3] >>> (i & 7) & 1;
          sel25519(a, b, r);
          sel25519(c, d, r);
          A(e, a, c);
          Z(a, a, c);
          A(c, b, d);
          Z(b, b, d);
          S(d, e);
          S(f, a);
          M(a, c, a);
          M(c, b, e);
          A(e, a, c);
          Z(a, a, c);
          S(b, a);
          Z(c, d, f);
          M(a, c, _121665);
          A(a, a, d);
          M(c, c, a);
          M(a, d, f);
          M(d, b, x);
          S(b, e);
          sel25519(a, b, r);
          sel25519(c, d, r);
        }
        for (i = 0; i < 16; i++) {
          x[i + 16] = a[i];
          x[i + 32] = c[i];
          x[i + 48] = b[i];
          x[i + 64] = d[i];
        }
        var x32 = x.subarray(32);
        var x16 = x.subarray(16);
        inv25519(x32, x32);
        M(x16, x16, x32);
        pack25519(q, x16);
        return 0;
      }
      function crypto_scalarmult_base(q, n) {
        return crypto_scalarmult(q, n, _9);
      }
      function crypto_box_keypair(y, x) {
        randombytes(x, 32);
        return crypto_scalarmult_base(y, x);
      }
      function crypto_box_beforenm(k, y, x) {
        var s = new Uint8Array(32);
        crypto_scalarmult(s, x, y);
        return crypto_core_hsalsa20(k, _0, s, sigma);
      }
      var crypto_box_afternm = crypto_secretbox;
      var crypto_box_open_afternm = crypto_secretbox_open;
      function crypto_box(c, m, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_afternm(c, m, d, n, k);
      }
      function crypto_box_open(m, c, d, n, y, x) {
        var k = new Uint8Array(32);
        crypto_box_beforenm(k, y, x);
        return crypto_box_open_afternm(m, c, d, n, k);
      }
      var K = [
        1116352408,
        3609767458,
        1899447441,
        602891725,
        3049323471,
        3964484399,
        3921009573,
        2173295548,
        961987163,
        4081628472,
        1508970993,
        3053834265,
        2453635748,
        2937671579,
        2870763221,
        3664609560,
        3624381080,
        2734883394,
        310598401,
        1164996542,
        607225278,
        1323610764,
        1426881987,
        3590304994,
        1925078388,
        4068182383,
        2162078206,
        991336113,
        2614888103,
        633803317,
        3248222580,
        3479774868,
        3835390401,
        2666613458,
        4022224774,
        944711139,
        264347078,
        2341262773,
        604807628,
        2007800933,
        770255983,
        1495990901,
        1249150122,
        1856431235,
        1555081692,
        3175218132,
        1996064986,
        2198950837,
        2554220882,
        3999719339,
        2821834349,
        766784016,
        2952996808,
        2566594879,
        3210313671,
        3203337956,
        3336571891,
        1034457026,
        3584528711,
        2466948901,
        113926993,
        3758326383,
        338241895,
        168717936,
        666307205,
        1188179964,
        773529912,
        1546045734,
        1294757372,
        1522805485,
        1396182291,
        2643833823,
        1695183700,
        2343527390,
        1986661051,
        1014477480,
        2177026350,
        1206759142,
        2456956037,
        344077627,
        2730485921,
        1290863460,
        2820302411,
        3158454273,
        3259730800,
        3505952657,
        3345764771,
        106217008,
        3516065817,
        3606008344,
        3600352804,
        1432725776,
        4094571909,
        1467031594,
        275423344,
        851169720,
        430227734,
        3100823752,
        506948616,
        1363258195,
        659060556,
        3750685593,
        883997877,
        3785050280,
        958139571,
        3318307427,
        1322822218,
        3812723403,
        1537002063,
        2003034995,
        1747873779,
        3602036899,
        1955562222,
        1575990012,
        2024104815,
        1125592928,
        2227730452,
        2716904306,
        2361852424,
        442776044,
        2428436474,
        593698344,
        2756734187,
        3733110249,
        3204031479,
        2999351573,
        3329325298,
        3815920427,
        3391569614,
        3928383900,
        3515267271,
        566280711,
        3940187606,
        3454069534,
        4118630271,
        4000239992,
        116418474,
        1914138554,
        174292421,
        2731055270,
        289380356,
        3203993006,
        460393269,
        320620315,
        685471733,
        587496836,
        852142971,
        1086792851,
        1017036298,
        365543100,
        1126000580,
        2618297676,
        1288033470,
        3409855158,
        1501505948,
        4234509866,
        1607167915,
        987167468,
        1816402316,
        1246189591
      ];
      function crypto_hashblocks_hl(hh, hl, m, n) {
        var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
        var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
        var pos = 0;
        while (n >= 128) {
          for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = m[j + 0] << 24 | m[j + 1] << 16 | m[j + 2] << 8 | m[j + 3];
            wl[i] = m[j + 4] << 24 | m[j + 5] << 16 | m[j + 6] << 8 | m[j + 7];
          }
          for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            h = ah7;
            l = al7;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = (ah4 >>> 14 | al4 << 32 - 14) ^ (ah4 >>> 18 | al4 << 32 - 18) ^ (al4 >>> 41 - 32 | ah4 << 32 - (41 - 32));
            l = (al4 >>> 14 | ah4 << 32 - 14) ^ (al4 >>> 18 | ah4 << 32 - 18) ^ (ah4 >>> 41 - 32 | al4 << 32 - (41 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = ah4 & ah5 ^ ~ah4 & ah6;
            l = al4 & al5 ^ ~al4 & al6;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = wh[i % 16];
            l = wl[i % 16];
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = c & 65535 | d << 16;
            tl = a & 65535 | b << 16;
            h = th;
            l = tl;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = (ah0 >>> 28 | al0 << 32 - 28) ^ (al0 >>> 34 - 32 | ah0 << 32 - (34 - 32)) ^ (al0 >>> 39 - 32 | ah0 << 32 - (39 - 32));
            l = (al0 >>> 28 | ah0 << 32 - 28) ^ (ah0 >>> 34 - 32 | al0 << 32 - (34 - 32)) ^ (ah0 >>> 39 - 32 | al0 << 32 - (39 - 32));
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            h = ah0 & ah1 ^ ah0 & ah2 ^ ah1 & ah2;
            l = al0 & al1 ^ al0 & al2 ^ al1 & al2;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = c & 65535 | d << 16;
            bl7 = a & 65535 | b << 16;
            h = bh3;
            l = bl3;
            a = l & 65535;
            b = l >>> 16;
            c = h & 65535;
            d = h >>> 16;
            h = th;
            l = tl;
            a += l & 65535;
            b += l >>> 16;
            c += h & 65535;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = c & 65535 | d << 16;
            bl3 = a & 65535 | b << 16;
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
              for (j = 0; j < 16; j++) {
                h = wh[j];
                l = wl[j];
                a = l & 65535;
                b = l >>> 16;
                c = h & 65535;
                d = h >>> 16;
                h = wh[(j + 9) % 16];
                l = wl[(j + 9) % 16];
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                th = wh[(j + 1) % 16];
                tl = wl[(j + 1) % 16];
                h = (th >>> 1 | tl << 32 - 1) ^ (th >>> 8 | tl << 32 - 8) ^ th >>> 7;
                l = (tl >>> 1 | th << 32 - 1) ^ (tl >>> 8 | th << 32 - 8) ^ (tl >>> 7 | th << 32 - 7);
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                th = wh[(j + 14) % 16];
                tl = wl[(j + 14) % 16];
                h = (th >>> 19 | tl << 32 - 19) ^ (tl >>> 61 - 32 | th << 32 - (61 - 32)) ^ th >>> 6;
                l = (tl >>> 19 | th << 32 - 19) ^ (th >>> 61 - 32 | tl << 32 - (61 - 32)) ^ (tl >>> 6 | th << 32 - 6);
                a += l & 65535;
                b += l >>> 16;
                c += h & 65535;
                d += h >>> 16;
                b += a >>> 16;
                c += b >>> 16;
                d += c >>> 16;
                wh[j] = c & 65535 | d << 16;
                wl[j] = a & 65535 | b << 16;
              }
            }
          }
          h = ah0;
          l = al0;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[0];
          l = hl[0];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[0] = ah0 = c & 65535 | d << 16;
          hl[0] = al0 = a & 65535 | b << 16;
          h = ah1;
          l = al1;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[1];
          l = hl[1];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[1] = ah1 = c & 65535 | d << 16;
          hl[1] = al1 = a & 65535 | b << 16;
          h = ah2;
          l = al2;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[2];
          l = hl[2];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[2] = ah2 = c & 65535 | d << 16;
          hl[2] = al2 = a & 65535 | b << 16;
          h = ah3;
          l = al3;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[3];
          l = hl[3];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[3] = ah3 = c & 65535 | d << 16;
          hl[3] = al3 = a & 65535 | b << 16;
          h = ah4;
          l = al4;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[4];
          l = hl[4];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[4] = ah4 = c & 65535 | d << 16;
          hl[4] = al4 = a & 65535 | b << 16;
          h = ah5;
          l = al5;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[5];
          l = hl[5];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[5] = ah5 = c & 65535 | d << 16;
          hl[5] = al5 = a & 65535 | b << 16;
          h = ah6;
          l = al6;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[6];
          l = hl[6];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[6] = ah6 = c & 65535 | d << 16;
          hl[6] = al6 = a & 65535 | b << 16;
          h = ah7;
          l = al7;
          a = l & 65535;
          b = l >>> 16;
          c = h & 65535;
          d = h >>> 16;
          h = hh[7];
          l = hl[7];
          a += l & 65535;
          b += l >>> 16;
          c += h & 65535;
          d += h >>> 16;
          b += a >>> 16;
          c += b >>> 16;
          d += c >>> 16;
          hh[7] = ah7 = c & 65535 | d << 16;
          hl[7] = al7 = a & 65535 | b << 16;
          pos += 128;
          n -= 128;
        }
        return n;
      }
      function crypto_hash(out, m, n) {
        var hh = new Int32Array(8), hl = new Int32Array(8), x = new Uint8Array(256), i, b = n;
        hh[0] = 1779033703;
        hh[1] = 3144134277;
        hh[2] = 1013904242;
        hh[3] = 2773480762;
        hh[4] = 1359893119;
        hh[5] = 2600822924;
        hh[6] = 528734635;
        hh[7] = 1541459225;
        hl[0] = 4089235720;
        hl[1] = 2227873595;
        hl[2] = 4271175723;
        hl[3] = 1595750129;
        hl[4] = 2917565137;
        hl[5] = 725511199;
        hl[6] = 4215389547;
        hl[7] = 327033209;
        crypto_hashblocks_hl(hh, hl, m, n);
        n %= 128;
        for (i = 0; i < n; i++) x[i] = m[b - n + i];
        x[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x[n - 9] = 0;
        ts64(x, n - 8, b / 536870912 | 0, b << 3);
        crypto_hashblocks_hl(hh, hl, x, n);
        for (i = 0; i < 8; i++) ts64(out, 8 * i, hh[i], hl[i]);
        return 0;
      }
      function add(p, q) {
        var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
        Z(a, p[1], p[0]);
        Z(t, q[1], q[0]);
        M(a, a, t);
        A(b, p[0], p[1]);
        A(t, q[0], q[1]);
        M(b, b, t);
        M(c, p[3], q[3]);
        M(c, c, D2);
        M(d, p[2], q[2]);
        A(d, d, d);
        Z(e, b, a);
        Z(f, d, c);
        A(g, d, c);
        A(h, b, a);
        M(p[0], e, f);
        M(p[1], h, g);
        M(p[2], g, f);
        M(p[3], e, h);
      }
      function cswap(p, q, b) {
        var i;
        for (i = 0; i < 4; i++) {
          sel25519(p[i], q[i], b);
        }
      }
      function pack(r, p) {
        var tx = gf(), ty = gf(), zi = gf();
        inv25519(zi, p[2]);
        M(tx, p[0], zi);
        M(ty, p[1], zi);
        pack25519(r, ty);
        r[31] ^= par25519(tx) << 7;
      }
      function scalarmult(p, q, s) {
        var b, i;
        set25519(p[0], gf0);
        set25519(p[1], gf1);
        set25519(p[2], gf1);
        set25519(p[3], gf0);
        for (i = 255; i >= 0; --i) {
          b = s[i / 8 | 0] >> (i & 7) & 1;
          cswap(p, q, b);
          add(q, p);
          add(p, p);
          cswap(p, q, b);
        }
      }
      function scalarbase(p, s) {
        var q = [gf(), gf(), gf(), gf()];
        set25519(q[0], X);
        set25519(q[1], Y);
        set25519(q[2], gf1);
        M(q[3], X, Y);
        scalarmult(p, q, s);
      }
      function crypto_sign_keypair(pk, sk, seeded) {
        var d = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()];
        var i;
        if (!seeded) randombytes(sk, 32);
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        scalarbase(p, d);
        pack(pk, p);
        for (i = 0; i < 32; i++) sk[i + 32] = pk[i];
        return 0;
      }
      var L = new Float64Array([237, 211, 245, 92, 26, 99, 18, 88, 214, 156, 247, 162, 222, 249, 222, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 16]);
      function modL(r, x) {
        var carry, i, j, k;
        for (i = 63; i >= 32; --i) {
          carry = 0;
          for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = Math.floor((x[j] + 128) / 256);
            x[j] -= carry * 256;
          }
          x[j] += carry;
          x[i] = 0;
        }
        carry = 0;
        for (j = 0; j < 32; j++) {
          x[j] += carry - (x[31] >> 4) * L[j];
          carry = x[j] >> 8;
          x[j] &= 255;
        }
        for (j = 0; j < 32; j++) x[j] -= carry * L[j];
        for (i = 0; i < 32; i++) {
          x[i + 1] += x[i] >> 8;
          r[i] = x[i] & 255;
        }
      }
      function reduce(r) {
        var x = new Float64Array(64), i;
        for (i = 0; i < 64; i++) x[i] = r[i];
        for (i = 0; i < 64; i++) r[i] = 0;
        modL(r, x);
      }
      function crypto_sign(sm, m, n, sk) {
        var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
        var i, j, x = new Float64Array(64);
        var p = [gf(), gf(), gf(), gf()];
        crypto_hash(d, sk, 32);
        d[0] &= 248;
        d[31] &= 127;
        d[31] |= 64;
        var smlen = n + 64;
        for (i = 0; i < n; i++) sm[64 + i] = m[i];
        for (i = 0; i < 32; i++) sm[32 + i] = d[32 + i];
        crypto_hash(r, sm.subarray(32), n + 32);
        reduce(r);
        scalarbase(p, r);
        pack(sm, p);
        for (i = 32; i < 64; i++) sm[i] = sk[i];
        crypto_hash(h, sm, n + 64);
        reduce(h);
        for (i = 0; i < 64; i++) x[i] = 0;
        for (i = 0; i < 32; i++) x[i] = r[i];
        for (i = 0; i < 32; i++) {
          for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
          }
        }
        modL(sm.subarray(32), x);
        return smlen;
      }
      function unpackneg(r, p) {
        var t = gf(), chk = gf(), num = gf(), den = gf(), den2 = gf(), den4 = gf(), den6 = gf();
        set25519(r[2], gf1);
        unpack25519(r[1], p);
        S(num, r[1]);
        M(den, num, D);
        Z(num, num, r[2]);
        A(den, r[2], den);
        S(den2, den);
        S(den4, den2);
        M(den6, den4, den2);
        M(t, den6, num);
        M(t, t, den);
        pow2523(t, t);
        M(t, t, num);
        M(t, t, den);
        M(t, t, den);
        M(r[0], t, den);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num)) M(r[0], r[0], I);
        S(chk, r[0]);
        M(chk, chk, den);
        if (neq25519(chk, num)) return -1;
        if (par25519(r[0]) === p[31] >> 7) Z(r[0], gf0, r[0]);
        M(r[3], r[0], r[1]);
        return 0;
      }
      function crypto_sign_open(m, sm, n, pk) {
        var i;
        var t = new Uint8Array(32), h = new Uint8Array(64);
        var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
        if (n < 64) return -1;
        if (unpackneg(q, pk)) return -1;
        for (i = 0; i < n; i++) m[i] = sm[i];
        for (i = 0; i < 32; i++) m[i + 32] = pk[i];
        crypto_hash(h, m, n);
        reduce(h);
        scalarmult(p, q, h);
        scalarbase(q, sm.subarray(32));
        add(p, q);
        pack(t, p);
        n -= 64;
        if (crypto_verify_32(sm, 0, t, 0)) {
          for (i = 0; i < n; i++) m[i] = 0;
          return -1;
        }
        for (i = 0; i < n; i++) m[i] = sm[i + 64];
        return n;
      }
      var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_box_ZEROBYTES = crypto_secretbox_ZEROBYTES, crypto_box_BOXZEROBYTES = crypto_secretbox_BOXZEROBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
      nacl2.lowlevel = {
        crypto_core_hsalsa20,
        crypto_stream_xor,
        crypto_stream,
        crypto_stream_salsa20_xor,
        crypto_stream_salsa20,
        crypto_onetimeauth,
        crypto_onetimeauth_verify,
        crypto_verify_16,
        crypto_verify_32,
        crypto_secretbox,
        crypto_secretbox_open,
        crypto_scalarmult,
        crypto_scalarmult_base,
        crypto_box_beforenm,
        crypto_box_afternm,
        crypto_box,
        crypto_box_open,
        crypto_box_keypair,
        crypto_hash,
        crypto_sign,
        crypto_sign_keypair,
        crypto_sign_open,
        crypto_secretbox_KEYBYTES,
        crypto_secretbox_NONCEBYTES,
        crypto_secretbox_ZEROBYTES,
        crypto_secretbox_BOXZEROBYTES,
        crypto_scalarmult_BYTES,
        crypto_scalarmult_SCALARBYTES,
        crypto_box_PUBLICKEYBYTES,
        crypto_box_SECRETKEYBYTES,
        crypto_box_BEFORENMBYTES,
        crypto_box_NONCEBYTES,
        crypto_box_ZEROBYTES,
        crypto_box_BOXZEROBYTES,
        crypto_sign_BYTES,
        crypto_sign_PUBLICKEYBYTES,
        crypto_sign_SECRETKEYBYTES,
        crypto_sign_SEEDBYTES,
        crypto_hash_BYTES,
        gf,
        D,
        L,
        pack25519,
        unpack25519,
        M,
        A,
        S,
        Z,
        pow2523,
        add,
        set25519,
        modL,
        scalarmult,
        scalarbase
      };
      function checkLengths(k, n) {
        if (k.length !== crypto_secretbox_KEYBYTES) throw new Error("bad key size");
        if (n.length !== crypto_secretbox_NONCEBYTES) throw new Error("bad nonce size");
      }
      function checkBoxLengths(pk, sk) {
        if (pk.length !== crypto_box_PUBLICKEYBYTES) throw new Error("bad public key size");
        if (sk.length !== crypto_box_SECRETKEYBYTES) throw new Error("bad secret key size");
      }
      function checkArrayTypes() {
        for (var i = 0; i < arguments.length; i++) {
          if (!(arguments[i] instanceof Uint8Array))
            throw new TypeError("unexpected type, use Uint8Array");
        }
      }
      function cleanup(arr) {
        for (var i = 0; i < arr.length; i++) arr[i] = 0;
      }
      nacl2.randomBytes = function(n) {
        var b = new Uint8Array(n);
        randombytes(b, n);
        return b;
      };
      nacl2.secretbox = function(msg, nonce, key) {
        checkArrayTypes(msg, nonce, key);
        checkLengths(key, nonce);
        var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
        var c = new Uint8Array(m.length);
        for (var i = 0; i < msg.length; i++) m[i + crypto_secretbox_ZEROBYTES] = msg[i];
        crypto_secretbox(c, m, m.length, nonce, key);
        return c.subarray(crypto_secretbox_BOXZEROBYTES);
      };
      nacl2.secretbox.open = function(box, nonce, key) {
        checkArrayTypes(box, nonce, key);
        checkLengths(key, nonce);
        var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
        var m = new Uint8Array(c.length);
        for (var i = 0; i < box.length; i++) c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
        if (c.length < 32) return null;
        if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0) return null;
        return m.subarray(crypto_secretbox_ZEROBYTES);
      };
      nacl2.secretbox.keyLength = crypto_secretbox_KEYBYTES;
      nacl2.secretbox.nonceLength = crypto_secretbox_NONCEBYTES;
      nacl2.secretbox.overheadLength = crypto_secretbox_BOXZEROBYTES;
      nacl2.scalarMult = function(n, p) {
        checkArrayTypes(n, p);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        if (p.length !== crypto_scalarmult_BYTES) throw new Error("bad p size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult(q, n, p);
        return q;
      };
      nacl2.scalarMult.base = function(n) {
        checkArrayTypes(n);
        if (n.length !== crypto_scalarmult_SCALARBYTES) throw new Error("bad n size");
        var q = new Uint8Array(crypto_scalarmult_BYTES);
        crypto_scalarmult_base(q, n);
        return q;
      };
      nacl2.scalarMult.scalarLength = crypto_scalarmult_SCALARBYTES;
      nacl2.scalarMult.groupElementLength = crypto_scalarmult_BYTES;
      nacl2.box = function(msg, nonce, publicKey, secretKey) {
        var k = nacl2.box.before(publicKey, secretKey);
        return nacl2.secretbox(msg, nonce, k);
      };
      nacl2.box.before = function(publicKey, secretKey) {
        checkArrayTypes(publicKey, secretKey);
        checkBoxLengths(publicKey, secretKey);
        var k = new Uint8Array(crypto_box_BEFORENMBYTES);
        crypto_box_beforenm(k, publicKey, secretKey);
        return k;
      };
      nacl2.box.after = nacl2.secretbox;
      nacl2.box.open = function(msg, nonce, publicKey, secretKey) {
        var k = nacl2.box.before(publicKey, secretKey);
        return nacl2.secretbox.open(msg, nonce, k);
      };
      nacl2.box.open.after = nacl2.secretbox.open;
      nacl2.box.keyPair = function() {
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
        crypto_box_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.box.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_box_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
        crypto_scalarmult_base(pk, secretKey);
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl2.box.publicKeyLength = crypto_box_PUBLICKEYBYTES;
      nacl2.box.secretKeyLength = crypto_box_SECRETKEYBYTES;
      nacl2.box.sharedKeyLength = crypto_box_BEFORENMBYTES;
      nacl2.box.nonceLength = crypto_box_NONCEBYTES;
      nacl2.box.overheadLength = nacl2.secretbox.overheadLength;
      nacl2.sign = function(msg, secretKey) {
        checkArrayTypes(msg, secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
        crypto_sign(signedMsg, msg, msg.length, secretKey);
        return signedMsg;
      };
      nacl2.sign.open = function(signedMsg, publicKey) {
        checkArrayTypes(signedMsg, publicKey);
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var tmp = new Uint8Array(signedMsg.length);
        var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
        if (mlen < 0) return null;
        var m = new Uint8Array(mlen);
        for (var i = 0; i < m.length; i++) m[i] = tmp[i];
        return m;
      };
      nacl2.sign.detached = function(msg, secretKey) {
        var signedMsg = nacl2.sign(msg, secretKey);
        var sig = new Uint8Array(crypto_sign_BYTES);
        for (var i = 0; i < sig.length; i++) sig[i] = signedMsg[i];
        return sig;
      };
      nacl2.sign.detached.verify = function(msg, sig, publicKey) {
        checkArrayTypes(msg, sig, publicKey);
        if (sig.length !== crypto_sign_BYTES)
          throw new Error("bad signature size");
        if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
          throw new Error("bad public key size");
        var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
        var m = new Uint8Array(crypto_sign_BYTES + msg.length);
        var i;
        for (i = 0; i < crypto_sign_BYTES; i++) sm[i] = sig[i];
        for (i = 0; i < msg.length; i++) sm[i + crypto_sign_BYTES] = msg[i];
        return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
      };
      nacl2.sign.keyPair = function() {
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        crypto_sign_keypair(pk, sk);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.sign.keyPair.fromSecretKey = function(secretKey) {
        checkArrayTypes(secretKey);
        if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
          throw new Error("bad secret key size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        for (var i = 0; i < pk.length; i++) pk[i] = secretKey[32 + i];
        return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
      };
      nacl2.sign.keyPair.fromSeed = function(seed) {
        checkArrayTypes(seed);
        if (seed.length !== crypto_sign_SEEDBYTES)
          throw new Error("bad seed size");
        var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
        var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
        for (var i = 0; i < 32; i++) sk[i] = seed[i];
        crypto_sign_keypair(pk, sk, true);
        return { publicKey: pk, secretKey: sk };
      };
      nacl2.sign.publicKeyLength = crypto_sign_PUBLICKEYBYTES;
      nacl2.sign.secretKeyLength = crypto_sign_SECRETKEYBYTES;
      nacl2.sign.seedLength = crypto_sign_SEEDBYTES;
      nacl2.sign.signatureLength = crypto_sign_BYTES;
      nacl2.hash = function(msg) {
        checkArrayTypes(msg);
        var h = new Uint8Array(crypto_hash_BYTES);
        crypto_hash(h, msg, msg.length);
        return h;
      };
      nacl2.hash.hashLength = crypto_hash_BYTES;
      nacl2.verify = function(x, y) {
        checkArrayTypes(x, y);
        if (x.length === 0 || y.length === 0) return false;
        if (x.length !== y.length) return false;
        return vn(x, 0, y, 0, x.length) === 0 ? true : false;
      };
      nacl2.setPRNG = function(fn) {
        randombytes = fn;
      };
      (function() {
        var crypto2 = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
        if (crypto2 && crypto2.getRandomValues) {
          var QUOTA = 65536;
          nacl2.setPRNG(function(x, n) {
            var i, v = new Uint8Array(n);
            for (i = 0; i < n; i += QUOTA) {
              crypto2.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
            }
            for (i = 0; i < n; i++) x[i] = v[i];
            cleanup(v);
          });
        } else if (typeof require !== "undefined") {
          crypto2 = require("crypto");
          if (crypto2 && crypto2.randomBytes) {
            nacl2.setPRNG(function(x, n) {
              var i, v = crypto2.randomBytes(n);
              for (i = 0; i < n; i++) x[i] = v[i];
              cleanup(v);
            });
          }
        }
      })();
    })(typeof module2 !== "undefined" && module2.exports ? module2.exports : self.nacl = self.nacl || {});
  }
});

// electron/main.ts
var import_electron2 = require("electron");
var import_node_fs2 = __toESM(require("node:fs"), 1);
var import_node_path2 = __toESM(require("node:path"), 1);

// electron/services/storage-service.ts
var import_node_fs = __toESM(require("node:fs"), 1);
var import_node_path = __toESM(require("node:path"), 1);

// src/modules/persistence/persistence-interface.ts
var DEFAULT_OWNER_SETTINGS = {
  ownerName: "Aladzan Corpora Owner",
  defaultPlan: "pro",
  defaultLicenseType: "subscription",
  defaultSubscriptionDays: 365,
  autoSaveHistory: true,
  autoLockMinutes: 15
};

// electron/services/storage-service.ts
var ElectronFileStorageService = class {
  constructor(baseDir) {
    this.dataDir = baseDir;
    if (!import_node_fs.default.existsSync(this.dataDir)) {
      import_node_fs.default.mkdirSync(this.dataDir, { recursive: true });
    }
    this.files = {
      vault: import_node_path.default.join(this.dataDir, "vault.enc.json"),
      customers: import_node_path.default.join(this.dataDir, "customers.json"),
      history: import_node_path.default.join(this.dataDir, "history.json"),
      settings: import_node_path.default.join(this.dataDir, "settings.json"),
      customApps: import_node_path.default.join(this.dataDir, "custom-apps.json")
    };
  }
  safeReadJson(filePath, fallback) {
    try {
      if (!import_node_fs.default.existsSync(filePath)) return fallback;
      const raw = import_node_fs.default.readFileSync(filePath, "utf-8");
      if (!raw || !raw.trim()) return fallback;
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }
  safeWriteJson(filePath, data) {
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    const serialized = JSON.stringify(data, null, 2);
    import_node_fs.default.writeFileSync(tempPath, serialized, "utf-8");
    import_node_fs.default.renameSync(tempPath, filePath);
  }
  safeDelete(filePath) {
    if (import_node_fs.default.existsSync(filePath)) {
      import_node_fs.default.unlinkSync(filePath);
    }
  }
  storageDomainExists(domain) {
    return import_node_fs.default.existsSync(this.files[domain]);
  }
  async hasOwnerVault() {
    const vault = await this.getEncryptedVault();
    return !!(vault && vault.ciphertextHex && vault.publicKeyHex && vault.saltHex && vault.ivHex);
  }
  async getEncryptedVault() {
    return this.safeReadJson(this.files.vault, null);
  }
  async saveEncryptedVault(vault) {
    this.safeWriteJson(this.files.vault, vault);
  }
  async deleteEncryptedVault() {
    this.safeDelete(this.files.vault);
  }
  async getOwnerPublicMeta() {
    const vault = await this.getEncryptedVault();
    if (!vault) return null;
    return {
      publicKeyHex: vault.publicKeyHex,
      fingerprint: vault.fingerprint,
      createdAt: vault.createdAt
    };
  }
  async getCustomerRegistry() {
    const list = this.safeReadJson(this.files.customers, []);
    return Array.isArray(list) ? list : [];
  }
  async saveCustomerRegistry(customers) {
    this.safeWriteJson(this.files.customers, customers);
  }
  async deleteCustomerRegistry() {
    this.safeDelete(this.files.customers);
  }
  async getLicenseHistory() {
    const list = this.safeReadJson(this.files.history, []);
    return Array.isArray(list) ? list : [];
  }
  async saveLicenseHistory(history) {
    this.safeWriteJson(this.files.history, history);
  }
  async deleteLicenseHistory() {
    this.safeDelete(this.files.history);
  }
  async appendLicenseRecord(record) {
    const history = await this.getLicenseHistory();
    const updated = [record, ...history.filter((h) => h.id !== record.id)];
    await this.saveLicenseHistory(updated);
  }
  async updateLicenseStatus(id, status) {
    const history = await this.getLicenseHistory();
    const updated = history.map((h) => h.id === id ? { ...h, status } : h);
    await this.saveLicenseHistory(updated);
  }
  async deleteLicenseRecord(id) {
    const history = await this.getLicenseHistory();
    const updated = history.filter((h) => h.id !== id);
    await this.saveLicenseHistory(updated);
  }
  async getOwnerSettings() {
    return this.safeReadJson(this.files.settings, { ...DEFAULT_OWNER_SETTINGS });
  }
  async saveOwnerSettings(settings) {
    this.safeWriteJson(this.files.settings, settings);
  }
  async deleteOwnerSettings() {
    this.safeDelete(this.files.settings);
  }
  async getCustomApps() {
    const list = this.safeReadJson(this.files.customApps, []);
    return Array.isArray(list) ? list : [];
  }
  async saveCustomApps(apps) {
    this.safeWriteJson(this.files.customApps, apps);
  }
  async deleteCustomApps() {
    this.safeDelete(this.files.customApps);
  }
  async exportBackupPayload() {
    const vault = await this.getEncryptedVault();
    if (!vault) {
      throw new Error("Cannot export backup: Encrypted Vault is not initialized.");
    }
    const history = await this.getLicenseHistory();
    const customers = await this.getCustomerRegistry();
    const settings = await this.getOwnerSettings();
    const customApps = await this.getCustomApps();
    return {
      alcoVaultVersion: "2.0-encrypted",
      exportDate: (/* @__PURE__ */ new Date()).toISOString(),
      encryptedVault: vault,
      history,
      customers,
      settings,
      customApps
    };
  }
  async restoreFromBackupPayload(payload) {
    if (!payload.encryptedVault) {
      throw new Error("Corrupted backup: Missing encryptedVault.");
    }
    await this.saveEncryptedVault(payload.encryptedVault);
    if (Array.isArray(payload.customers)) {
      await this.saveCustomerRegistry(payload.customers);
    }
    if (Array.isArray(payload.history)) {
      await this.saveLicenseHistory(payload.history);
    }
    if (payload.settings) {
      await this.saveOwnerSettings(payload.settings);
    }
    if (Array.isArray(payload.customApps)) {
      await this.saveCustomApps(payload.customApps);
    }
  }
};

// src/modules/signing.ts
var import_tweetnacl = __toESM(require_nacl_fast(), 1);
var ED25519_SIGNATURE_HEX_LENGTH = 128;
var ED25519_PUBLIC_KEY_HEX_LENGTH = 64;
var ED25519_SECRET_KEY_HEX_LENGTH = 128;
function isStrictHex(str) {
  return /^[0-9a-fA-F]*$/.test(str);
}
function isValidSignatureHex(sigHex) {
  const trimmed = sigHex.trim();
  return trimmed.length === ED25519_SIGNATURE_HEX_LENGTH && /^[0-9a-fA-F]{128}$/.test(trimmed);
}
function isValidPublicKeyHex(pubHex) {
  const trimmed = pubHex.trim();
  return trimmed.length === ED25519_PUBLIC_KEY_HEX_LENGTH && /^[0-9a-fA-F]{64}$/.test(trimmed);
}
function isValidSecretKeyHex(secretHex) {
  const trimmed = secretHex.trim();
  return trimmed.length === ED25519_SECRET_KEY_HEX_LENGTH && /^[0-9a-fA-F]{128}$/.test(trimmed);
}
function uint8ArrayToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function hexToUint8Array(hex) {
  const trimmed = hex.trim();
  if (trimmed.length === 0) {
    return new Uint8Array(0);
  }
  if (trimmed.length % 2 !== 0) {
    throw new Error(`Invalid hex string: length must be even (got ${trimmed.length})`);
  }
  if (!isStrictHex(trimmed)) {
    throw new Error("Invalid hex string: contains non-hexadecimal characters");
  }
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let i = 0; i < trimmed.length; i += 2) {
    bytes[i / 2] = parseInt(trimmed.substring(i, i + 2), 16);
  }
  return bytes;
}
function stringToBase64Url(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateEd25519KeyPair() {
  const keyPair = import_tweetnacl.default.sign.keyPair();
  const pubHex = uint8ArrayToHex(keyPair.publicKey);
  const privHex = uint8ArrayToHex(keyPair.secretKey);
  const fingerprint = `${pubHex.slice(0, 8)}...${pubHex.slice(-8)}`.toUpperCase();
  return {
    publicKeyHex: pubHex,
    privateKeyHex: privHex,
    fingerprint
  };
}
function derivePublicKeyHexFromSecretKey(secretKeyHex) {
  if (!isValidSecretKeyHex(secretKeyHex)) {
    throw new Error(`Invalid secret key format: expected 128 hex chars, got ${secretKeyHex.trim().length}`);
  }
  const secretKeyBytes = hexToUint8Array(secretKeyHex);
  const keyPair = import_tweetnacl.default.sign.keyPair.fromSecretKey(secretKeyBytes);
  const pubHex = uint8ArrayToHex(keyPair.publicKey);
  const fingerprint = `${pubHex.slice(0, 8)}...${pubHex.slice(-8)}`.toUpperCase();
  return {
    publicKeyHex: pubHex,
    fingerprint
  };
}
function signCanonicalPayload(canonicalPayload, privateKeyHex) {
  if (!isValidSecretKeyHex(privateKeyHex)) {
    throw new Error("Invalid secret key format: expected 128 hex characters (64 bytes)");
  }
  const messageBytes = new TextEncoder().encode(canonicalPayload);
  const secretKeyBytes = hexToUint8Array(privateKeyHex);
  const signatureBytes = import_tweetnacl.default.sign.detached(messageBytes, secretKeyBytes);
  return uint8ArrayToHex(signatureBytes);
}
function packageLicenseKey(canonicalPayload, signatureHex) {
  if (!isValidSignatureHex(signatureHex)) {
    throw new Error("Cannot package license: signature is not a valid 128-char hex string");
  }
  const b64Payload = stringToBase64Url(canonicalPayload);
  return `ALCO-LIC-v1.${b64Payload}.${signatureHex.trim().toLowerCase()}`;
}

// src/modules/vault-crypto.ts
var PBKDF2_ITERATIONS = 25e4;
var SALT_BYTE_LENGTH = 16;
var IV_BYTE_LENGTH = 12;
function getCrypto() {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto;
  }
  throw new Error("Web Cryptography API is not available in this environment");
}
async function deriveAesKey(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
  const cryptoApi = getCrypto();
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  const baseKey = await cryptoApi.subtle.importKey(
    "raw",
    passwordBytes,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return cryptoApi.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256"
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    ["encrypt", "decrypt"]
  );
}
async function encryptWithPassword(plaintext, masterPassword) {
  const cryptoApi = getCrypto();
  const saltBytes = cryptoApi.getRandomValues(new Uint8Array(SALT_BYTE_LENGTH));
  const ivBytes = cryptoApi.getRandomValues(new Uint8Array(IV_BYTE_LENGTH));
  const aesKey = await deriveAesKey(masterPassword, saltBytes, PBKDF2_ITERATIONS);
  const enc = new TextEncoder();
  const plaintextBytes = enc.encode(plaintext);
  const encryptedBuffer = await cryptoApi.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBytes
    },
    aesKey,
    plaintextBytes
  );
  const ciphertextBytes = new Uint8Array(encryptedBuffer);
  return {
    ciphertextHex: uint8ArrayToHex(ciphertextBytes),
    saltHex: uint8ArrayToHex(saltBytes),
    ivHex: uint8ArrayToHex(ivBytes),
    iterations: PBKDF2_ITERATIONS,
    algorithm: "AES-256-GCM",
    kdf: "PBKDF2-SHA-256"
  };
}
async function decryptWithPassword(encryptedData, masterPassword) {
  const cryptoApi = getCrypto();
  const saltBytes = hexToUint8Array(encryptedData.saltHex);
  const ivBytes = hexToUint8Array(encryptedData.ivHex);
  const ciphertextBytes = hexToUint8Array(encryptedData.ciphertextHex);
  const iterations = encryptedData.iterations || PBKDF2_ITERATIONS;
  const aesKey = await deriveAesKey(masterPassword, saltBytes, iterations);
  try {
    const decryptedBuffer = await cryptoApi.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: ivBytes
      },
      aesKey,
      ciphertextBytes
    );
    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch {
    throw new Error("Incorrect Master Password or corrupted vault payload.");
  }
}

// electron/services/vault-service.ts
var MainVaultService = class {
  constructor(storage) {
    this.inMemoryPrivateKeyHex = null;
    this.inMemoryFingerprint = null;
    this.storage = storage;
  }
  validateSecretMatchesVault(secretPayload, vault) {
    const privateKeyHex = typeof secretPayload?.privateKeyHex === "string" ? secretPayload.privateKeyHex.trim() : "";
    if (!isValidSecretKeyHex(privateKeyHex)) {
      throw new Error("Corrupted vault: Invalid Ed25519 private key format.");
    }
    const derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
    if (derived.publicKeyHex.toLowerCase() !== vault.publicKeyHex.toLowerCase()) {
      throw new Error("Corrupted vault: Private key does not match stored public key.");
    }
    if (derived.fingerprint !== vault.fingerprint) {
      throw new Error("Corrupted vault: Authority fingerprint does not match derived public key.");
    }
    return privateKeyHex;
  }
  isUnlocked() {
    return !!this.inMemoryPrivateKeyHex;
  }
  async getStatus() {
    const vault = await this.storage.getEncryptedVault();
    if (!vault) {
      return { status: "uninitialized", firstRunState: "no_authority" };
    }
    const isUnlocked = this.isUnlocked();
    return {
      status: isUnlocked ? "unlocked" : "locked",
      fingerprint: vault.fingerprint,
      publicKeyHex: vault.publicKeyHex,
      createdAt: vault.createdAt,
      vaultHint: vault.vaultHint,
      firstRunState: "encrypted_v2_exists"
    };
  }
  async setupVault(masterPassword, vaultHint) {
    if (!masterPassword || masterPassword.length < 8) {
      return {
        success: false,
        status: "uninitialized",
        fingerprint: "",
        publicKeyHex: "",
        createdAt: "",
        error: "Master Password must be at least 8 characters long."
      };
    }
    const hasVault = await this.storage.hasOwnerVault();
    if (hasVault) {
      return {
        success: false,
        status: "locked",
        fingerprint: "",
        publicKeyHex: "",
        createdAt: "",
        error: "Vault already exists. Setup aborted."
      };
    }
    const authorityKeyPair = generateEd25519KeyPair();
    const secretPayload = JSON.stringify({
      privateKeyHex: authorityKeyPair.privateKeyHex,
      fingerprint: authorityKeyPair.fingerprint,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    const encrypted = await encryptWithPassword(secretPayload, masterPassword);
    const vault = {
      version: "2.0-aes-gcm",
      algorithm: "AES-256-GCM",
      kdf: "PBKDF2-SHA-256",
      iterations: encrypted.iterations,
      saltHex: encrypted.saltHex,
      ivHex: encrypted.ivHex,
      ciphertextHex: encrypted.ciphertextHex,
      publicKeyHex: authorityKeyPair.publicKeyHex,
      fingerprint: authorityKeyPair.fingerprint,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      vaultHint: vaultHint?.trim() || void 0
    };
    await this.storage.saveEncryptedVault(vault);
    this.inMemoryPrivateKeyHex = authorityKeyPair.privateKeyHex;
    this.inMemoryFingerprint = authorityKeyPair.fingerprint;
    return {
      success: true,
      status: "unlocked",
      fingerprint: authorityKeyPair.fingerprint,
      publicKeyHex: authorityKeyPair.publicKeyHex,
      createdAt: vault.createdAt
    };
  }
  async unlockVault(masterPassword) {
    const vault = await this.storage.getEncryptedVault();
    if (!vault) {
      return {
        success: false,
        status: "uninitialized",
        error: "No encrypted vault found. Setup required."
      };
    }
    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: vault.ciphertextHex,
          saltHex: vault.saltHex,
          ivHex: vault.ivHex,
          iterations: vault.iterations
        },
        masterPassword
      );
      const secretPayload = JSON.parse(decryptedJson);
      const privateKeyHex = this.validateSecretMatchesVault(secretPayload, vault);
      this.inMemoryPrivateKeyHex = privateKeyHex;
      this.inMemoryFingerprint = vault.fingerprint;
      return {
        success: true,
        status: "unlocked",
        fingerprint: vault.fingerprint,
        publicKeyHex: vault.publicKeyHex
      };
    } catch (err) {
      this.inMemoryPrivateKeyHex = null;
      this.inMemoryFingerprint = null;
      return {
        success: false,
        status: "locked",
        error: err?.message || "Incorrect Master Password."
      };
    }
  }
  async lockVault() {
    this.inMemoryPrivateKeyHex = null;
    this.inMemoryFingerprint = null;
    return { success: true };
  }
  async changePassword(currentPassword, newPassword, vaultHint) {
    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "New Master Password must be at least 8 characters long." };
    }
    const vault = await this.storage.getEncryptedVault();
    if (!vault) {
      return { success: false, error: "No encrypted vault found." };
    }
    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: vault.ciphertextHex,
          saltHex: vault.saltHex,
          ivHex: vault.ivHex,
          iterations: vault.iterations
        },
        currentPassword
      );
      const secretPayload = JSON.parse(decryptedJson);
      const privateKeyHex = this.validateSecretMatchesVault(secretPayload, vault);
      const newEncrypted = await encryptWithPassword(decryptedJson, newPassword);
      const updatedVault = {
        ...vault,
        iterations: newEncrypted.iterations,
        saltHex: newEncrypted.saltHex,
        ivHex: newEncrypted.ivHex,
        ciphertextHex: newEncrypted.ciphertextHex,
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        vaultHint: vaultHint !== void 0 ? vaultHint.trim() || void 0 : vault.vaultHint
      };
      await this.storage.saveEncryptedVault(updatedVault);
      if (this.isUnlocked()) {
        this.inMemoryPrivateKeyHex = privateKeyHex;
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || "Failed to change Master Password." };
    }
  }
  /**
   * Internal access for Main Process Signing Service ONLY.
   * This is never exposed through IPC.
   */
  getActivePrivateKeyForSigning() {
    if (!this.inMemoryPrivateKeyHex) {
      throw new Error("Authority Vault is locked. Unlock vault with Master Password first.");
    }
    return this.inMemoryPrivateKeyHex;
  }
};

// src/modules/canonical.ts
function canonicalJsonStringify(val) {
  if (val === null) {
    return "null";
  }
  const t = typeof val;
  if (t === "boolean") {
    return val ? "true" : "false";
  }
  if (t === "number") {
    if (!Number.isFinite(val)) {
      throw new TypeError("Canonical JSON: Cannot serialize non-finite numbers (NaN or Infinity)");
    }
    return JSON.stringify(val);
  }
  if (t === "string") {
    return JSON.stringify(val);
  }
  if (Array.isArray(val)) {
    const items = val.map((item) => {
      if (item === void 0 || typeof item === "symbol" || typeof item === "function") {
        return "null";
      }
      return canonicalJsonStringify(item);
    });
    return "[" + items.join(",") + "]";
  }
  if (t === "object") {
    const target = typeof val.toJSON === "function" ? val.toJSON() : val;
    if (target === null) {
      return "null";
    }
    if (typeof target !== "object" || Array.isArray(target)) {
      return canonicalJsonStringify(target);
    }
    const keys = Object.keys(target).sort();
    const pairs = [];
    for (const key of keys) {
      const v = target[key];
      if (v === void 0 || typeof v === "function" || typeof v === "symbol") {
        continue;
      }
      pairs.push(JSON.stringify(key) + ":" + canonicalJsonStringify(v));
    }
    return "{" + pairs.join(",") + "}";
  }
  throw new TypeError(`Canonical JSON: Unsupported type ${t}`);
}

// src/modules/device-fingerprint.ts
function isValidDeviceId(deviceId) {
  return /^ALCO-DEV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/i.test(deviceId.trim());
}
var ELECTRON_DEVICE_FINGERPRINT_SNIPPET = `
// ALCO Electron Client Hardware Fingerprint Snippet
// Place in your Electron main process (preload or main.ts):
import crypto from 'crypto';
import os from 'os';
import { execSync } from 'child_process';

export function getHardwareFingerprint(): string {
  let hardwareId = '';
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const reg = execSync('REG QUERY HKEY_LOCAL_MACHINE\\\\SOFTWARE\\\\Microsoft\\\\Cryptography /v MachineGuid').toString();
      const match = reg.match(/MachineGuid\\s+REG_SZ\\s+(.+)/i);
      hardwareId = match ? match[1].trim() : os.hostname();
    } else if (platform === 'darwin') {
      const ioreg = execSync('ioreg -rd1 -c IOPlatformExpertDevice').toString();
      const match = ioreg.match(/"IOPlatformUUID"\\s*=\\s*"([^"]+)"/i);
      hardwareId = match ? match[1].trim() : os.hostname();
    } else {
      hardwareId = execSync('cat /etc/machine-id 2>/dev/null || cat /var/lib/dbus/machine-id').toString().trim();
    }
  } catch {
    hardwareId = \`\${os.hostname()}-\${os.arch()}-\${os.cpus()[0]?.model || 'cpu'}\`;
  }

  const hash = crypto.createHash('sha256').update(\`ALCO-HW:\${hardwareId}:\${os.arch()}\`).digest('hex').toUpperCase();
  return \`ALCO-DEV-\${hash.slice(0, 4)}-\${hash.slice(4, 8)}-\${hash.slice(8, 12)}\`;
}
`.trim();

// src/modules/license-payload.ts
function generateLicenseId(appId) {
  const year = (/* @__PURE__ */ new Date()).getFullYear();
  const rand1 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const rand2 = Math.random().toString(36).substring(2, 6).toUpperCase();
  const appCode = appId.replace(/^alco-/, "").slice(0, 4).toUpperCase();
  return `LIC-${appCode}-${year}-${rand1}-${rand2}`;
}
function validateLicensePayloadSchema(raw) {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, error: "License payload must be a non-null JSON object" };
  }
  const obj = raw;
  if (typeof obj.licenseVersion !== "string" || !obj.licenseVersion.trim()) {
    return { valid: false, error: 'Missing or invalid "licenseVersion" (must be non-empty string)' };
  }
  if (obj.licenseVersion !== "1.0") {
    return { valid: false, error: `Unsupported license version "${obj.licenseVersion}" (expected "1.0")` };
  }
  if (typeof obj.licenseId !== "string" || !obj.licenseId.trim() || obj.licenseId.length > 100) {
    return { valid: false, error: 'Missing or invalid "licenseId" (must be 1-100 characters)' };
  }
  if (typeof obj.appId !== "string" || !obj.appId.trim() || obj.appId.length > 100) {
    return { valid: false, error: 'Missing or invalid "appId" (must be 1-100 characters)' };
  }
  if (typeof obj.deviceId !== "string" || !obj.deviceId.trim()) {
    return { valid: false, error: 'Missing "deviceId" string' };
  }
  if (!isValidDeviceId(obj.deviceId)) {
    return { valid: false, error: `Invalid hardware device ID format: "${obj.deviceId}". Expected format "ALCO-DEV-XXXX-XXXX-XXXX"` };
  }
  if (typeof obj.customerId !== "string" || !obj.customerId.trim() || obj.customerId.length > 100) {
    return { valid: false, error: 'Missing or invalid "customerId" (must be 1-100 characters)' };
  }
  const validPlans = ["starter", "pro", "enterprise", "custom"];
  if (typeof obj.plan !== "string" || !validPlans.includes(obj.plan)) {
    return { valid: false, error: `Invalid plan "${obj.plan}". Expected one of: ${validPlans.join(", ")}` };
  }
  if (!Array.isArray(obj.features)) {
    return { valid: false, error: 'Invalid "features" attribute (must be an array of feature flags)' };
  }
  for (let i = 0; i < obj.features.length; i++) {
    if (typeof obj.features[i] !== "string") {
      return { valid: false, error: `Invalid feature item at index ${i} (must be string)` };
    }
  }
  if (obj.licenseType !== "lifetime" && obj.licenseType !== "subscription") {
    return { valid: false, error: `Invalid licenseType "${obj.licenseType}". Must be either "lifetime" or "subscription"` };
  }
  if (typeof obj.issuedAt !== "string" || !obj.issuedAt.trim()) {
    return { valid: false, error: 'Missing "issuedAt" timestamp' };
  }
  const issuedTime = Date.parse(obj.issuedAt);
  if (isNaN(issuedTime)) {
    return { valid: false, error: 'Invalid "issuedAt" format: must be valid ISO 8601 date string' };
  }
  if (obj.licenseType === "lifetime") {
    if (obj.expiresAt !== null) {
      return {
        valid: false,
        error: 'Schema violation: Lifetime licenses MUST have "expiresAt" set strictly to null'
      };
    }
  } else if (obj.licenseType === "subscription") {
    if (obj.expiresAt === null || typeof obj.expiresAt !== "string" || !obj.expiresAt.trim()) {
      return {
        valid: false,
        error: 'Schema violation: Subscription licenses MUST have a non-null ISO "expiresAt" date'
      };
    }
    const expireTime = Date.parse(obj.expiresAt);
    if (isNaN(expireTime)) {
      return {
        valid: false,
        error: 'Invalid "expiresAt" format: must be valid ISO 8601 date string'
      };
    }
  }
  let customerName = void 0;
  if (obj.customerName !== void 0) {
    if (typeof obj.customerName !== "string") {
      return { valid: false, error: 'Invalid "customerName" (must be string if provided)' };
    }
    customerName = obj.customerName.trim() || void 0;
  }
  let metadata = void 0;
  if (obj.metadata !== void 0) {
    if (typeof obj.metadata !== "object" || obj.metadata === null || Array.isArray(obj.metadata)) {
      return { valid: false, error: 'Invalid "metadata" (must be an object if provided)' };
    }
    const meta = obj.metadata;
    metadata = {
      issuedBy: typeof meta.issuedBy === "string" ? meta.issuedBy : void 0,
      appName: typeof meta.appName === "string" ? meta.appName : void 0,
      notes: typeof meta.notes === "string" ? meta.notes : void 0
    };
  }
  const validatedPayload = {
    licenseVersion: obj.licenseVersion,
    licenseId: obj.licenseId,
    appId: obj.appId,
    deviceId: obj.deviceId,
    customerId: obj.customerId,
    customerName,
    plan: obj.plan,
    licenseType: obj.licenseType,
    features: obj.features,
    issuedAt: obj.issuedAt,
    expiresAt: obj.expiresAt,
    metadata
  };
  return {
    valid: true,
    payload: validatedPayload
  };
}
function createLicensePayload(options) {
  const licenseId = generateLicenseId(options.appId);
  const issuedAt = options.issuedAt || (/* @__PURE__ */ new Date()).toISOString();
  const sortedFeatures = Array.from(new Set(options.features)).sort();
  const payload = {
    licenseVersion: "1.0",
    licenseId,
    appId: options.appId.trim(),
    deviceId: options.deviceId.trim(),
    customerId: options.customerId.trim(),
    customerName: options.customerName?.trim() || void 0,
    plan: options.plan,
    licenseType: options.licenseType,
    features: sortedFeatures,
    issuedAt,
    expiresAt: options.licenseType === "lifetime" ? null : options.expiresAt ? new Date(options.expiresAt).toISOString() : null,
    metadata: options.metadata
  };
  const validation = validateLicensePayloadSchema(payload);
  if (!validation.valid) {
    throw new Error(`Failed to create license payload: ${validation.error}`);
  }
  const canonicalPayload = canonicalJsonStringify(payload);
  return {
    payload,
    canonicalPayload
  };
}

// electron/services/signing-service.ts
var MainSigningService = class {
  constructor(vaultService2, storage) {
    this.vaultService = vaultService2;
    this.storage = storage;
  }
  async generateLicense(input) {
    try {
      if (!this.vaultService.isUnlocked()) {
        return {
          success: false,
          error: "Authority Vault is locked. Master Password unlock required."
        };
      }
      if (!input.appId || !input.deviceId || !input.customerId) {
        return {
          success: false,
          error: "Missing required parameters: appId, deviceId, customerId."
        };
      }
      const privateKeyHex = this.vaultService.getActivePrivateKeyForSigning();
      const { payload, canonicalPayload } = createLicensePayload({
        appId: input.appId,
        deviceId: input.deviceId,
        customerId: input.customerId,
        customerName: input.customerName?.trim() || void 0,
        plan: input.plan,
        licenseType: input.licenseType,
        features: input.features || [],
        expiresAt: input.licenseType === "lifetime" ? null : input.expiresAt,
        metadata: input.metadata
      });
      const signatureHex = signCanonicalPayload(canonicalPayload, privateKeyHex);
      const licenseKey = packageLicenseKey(canonicalPayload, signatureHex);
      const record = {
        id: payload.licenseId,
        licenseKey,
        payload,
        signature: signatureHex,
        createdAt: payload.issuedAt,
        status: "active"
      };
      const settings = await this.storage.getOwnerSettings();
      if (settings.autoSaveHistory) {
        await this.storage.appendLicenseRecord(record);
      }
      return {
        success: true,
        licenseKey,
        payload,
        signature: signatureHex,
        canonicalString: canonicalPayload
      };
    } catch (err) {
      return {
        success: false,
        error: err?.message || "Failed to sign license payload."
      };
    }
  }
};

// src/modules/customer-registry-validation.ts
var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidDateString(value) {
  return typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value));
}
function validateCustomerRegistryPayload(customers) {
  if (customers === void 0) return { valid: true };
  if (!Array.isArray(customers)) {
    return { valid: false, error: "Customer registry must be an array." };
  }
  if (customers.length > 1e4) {
    return { valid: false, error: "Customer registry exceeds maximum allowed records." };
  }
  const seenCustomerIds = /* @__PURE__ */ new Set();
  const seenEmails = /* @__PURE__ */ new Set();
  for (let i = 0; i < customers.length; i += 1) {
    const customer = customers[i];
    if (!customer || typeof customer !== "object") {
      return { valid: false, error: `Invalid customer registry item at index ${i}.` };
    }
    const c = customer;
    const customerId = typeof c.customerId === "string" ? c.customerId.trim() : "";
    const name = typeof c.name === "string" ? c.name.trim() : "";
    const email = typeof c.email === "string" ? c.email : "";
    const emailNormalized = typeof c.emailNormalized === "string" ? c.emailNormalized : "";
    const expectedNormalized = email.trim().toLowerCase();
    if (!customerId || customerId.length > 100) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: customerId must be non-empty and <= 100 characters.` };
    }
    if (seenCustomerIds.has(customerId)) {
      return { valid: false, error: `Duplicate customerId in customer registry: ${customerId}.` };
    }
    seenCustomerIds.add(customerId);
    if (!name || name.length > 200) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: name must be non-empty and <= 200 characters.` };
    }
    if (email.length > 254 || !EMAIL_PATTERN.test(email.trim())) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: email must be valid and <= 254 characters.` };
    }
    if (emailNormalized !== expectedNormalized) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: emailNormalized must equal email.trim().toLowerCase().` };
    }
    if (seenEmails.has(emailNormalized)) {
      return { valid: false, error: `Duplicate emailNormalized in customer registry: ${emailNormalized}.` };
    }
    seenEmails.add(emailNormalized);
    if (!isValidDateString(c.createdAt) || !isValidDateString(c.updatedAt)) {
      return { valid: false, error: `Invalid customer registry item at index ${i}: createdAt and updatedAt must be valid date strings.` };
    }
    if (c.whatsapp !== void 0 && typeof c.whatsapp !== "string") {
      return { valid: false, error: `Invalid customer registry item at index ${i}: whatsapp must be a string.` };
    }
    if (c.segment !== void 0 && typeof c.segment !== "string") {
      return { valid: false, error: `Invalid customer registry item at index ${i}: segment must be a string.` };
    }
    if (c.acquisitionSource !== void 0 && typeof c.acquisitionSource !== "string") {
      return { valid: false, error: `Invalid customer registry item at index ${i}: acquisitionSource must be a string.` };
    }
    if (c.marketingConsent !== void 0 && typeof c.marketingConsent !== "boolean") {
      return { valid: false, error: `Invalid customer registry item at index ${i}: marketingConsent must be a boolean.` };
    }
  }
  return { valid: true };
}

// electron/services/backup-service.ts
var import_node_crypto = require("node:crypto");
var MAX_BACKUP_JSON_LENGTH = 5 * 1024 * 1024;
function isStrictHexLength(value, length) {
  return typeof value === "string" && value.length === length && isStrictHex(value);
}
function createProofId() {
  return `proof-${Date.now()}-${(0, import_node_crypto.randomBytes)(12).toString("hex")}`;
}
var MainBackupService = class {
  constructor(storage, vaultService2) {
    this.stagedBackup = null;
    this.stagedProof = null;
    this.storage = storage;
    this.vaultService = vaultService2;
  }
  async exportBackup() {
    const payload = await this.storage.exportBackupPayload();
    return JSON.stringify(payload, null, 2);
  }
  validateBackup(rawJson) {
    try {
      if (!rawJson || !rawJson.trim()) {
        return { valid: false, error: "Empty backup content." };
      }
      if (rawJson.length > MAX_BACKUP_JSON_LENGTH) {
        return { valid: false, error: "Backup content is too large." };
      }
      const parsed = JSON.parse(rawJson);
      if (parsed.alcoVaultVersion !== "2.0-encrypted") {
        return { valid: false, error: "Incompatible backup format. Expected alcoVaultVersion 2.0-encrypted." };
      }
      if (!parsed.encryptedVault) {
        return { valid: false, error: "Missing encryptedVault field in backup file." };
      }
      const v = parsed.encryptedVault;
      if (v.version !== "2.0-aes-gcm" || v.algorithm !== "AES-256-GCM") {
        return {
          valid: false,
          error: `Incompatible vault encryption: ${v.version || "legacy"}. Only 2.0-aes-gcm supported.`
        };
      }
      if (!v.ciphertextHex || !v.saltHex || !v.ivHex || !v.publicKeyHex || !v.fingerprint) {
        return { valid: false, error: "Incomplete vault encryption parameters." };
      }
      if (v.kdf !== "PBKDF2-SHA-256") {
        return { valid: false, error: "Incompatible vault KDF." };
      }
      if (!Number.isInteger(v.iterations) || v.iterations < 1e5) {
        return { valid: false, error: "Invalid vault KDF iterations." };
      }
      if (!isStrictHexLength(v.saltHex, 32) || !isStrictHexLength(v.ivHex, 24) || !isStrictHex(v.ciphertextHex)) {
        return { valid: false, error: "Invalid vault encryption encoding." };
      }
      if (!isValidPublicKeyHex(v.publicKeyHex) || typeof v.fingerprint !== "string" || v.fingerprint.length > 80) {
        return { valid: false, error: "Invalid authority public identity in backup." };
      }
      const customerValidation = validateCustomerRegistryPayload(parsed.customers);
      if (!customerValidation.valid) {
        return { valid: false, error: customerValidation.error || "Invalid customer registry in backup." };
      }
      return { valid: true, backup: parsed };
    } catch (err) {
      return { valid: false, error: `Invalid JSON structure: ${err?.message}` };
    }
  }
  async verifyBackupDecryption(backup, password) {
    const valResult = this.validateBackup(JSON.stringify(backup));
    if (!valResult.valid || !valResult.backup) {
      return { success: false, error: valResult.error || "Invalid backup structure." };
    }
    const v = backup.encryptedVault;
    try {
      const decryptedJson = await decryptWithPassword(
        {
          ciphertextHex: v.ciphertextHex,
          saltHex: v.saltHex,
          ivHex: v.ivHex,
          iterations: v.iterations
        },
        password
      );
      const parsed = JSON.parse(decryptedJson);
      const privateKeyHex = typeof parsed?.privateKeyHex === "string" ? parsed.privateKeyHex.trim() : "";
      if (!isValidSecretKeyHex(privateKeyHex)) {
        return { success: false, error: "Corrupted backup: Invalid Ed25519 private key format." };
      }
      const derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
      if (derived.publicKeyHex.toLowerCase() !== v.publicKeyHex.toLowerCase()) {
        return { success: false, error: "Corrupted backup: Decrypted private key does not match backup public key." };
      }
      if (derived.fingerprint !== v.fingerprint) {
        return { success: false, error: "Corrupted backup: Fingerprint does not match decrypted private key." };
      }
      const recordCount = Array.isArray(backup.history) ? backup.history.length : 0;
      const customerCount = Array.isArray(backup.customers) ? backup.customers.length : 0;
      const currentVault = await this.storage.getEncryptedVault();
      const isDifferentAuthority = !!currentVault && currentVault.fingerprint !== v.fingerprint;
      const proof = {
        proofId: createProofId(),
        backupFingerprint: v.fingerprint,
        backupPublicKeyHex: v.publicKeyHex,
        recordCount,
        customerCount,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1e3
        // 5 minutes TTL
      };
      this.stagedBackup = backup;
      this.stagedProof = proof;
      return {
        success: true,
        proof,
        backupFingerprint: v.fingerprint,
        backupPublicKeyHex: v.publicKeyHex,
        isDifferentAuthority,
        recordCount,
        customerCount
      };
    } catch (err) {
      this.stagedBackup = null;
      this.stagedProof = null;
      return {
        success: false,
        error: err?.message || "Decryption failed: Incorrect Master Password for this backup."
      };
    }
  }
  async commitRestore(proof) {
    if (!this.stagedBackup || !this.stagedProof) {
      return {
        success: false,
        error: "No verified backup staged. You must verify decryption first."
      };
    }
    if (this.stagedProof.proofId !== proof.proofId) {
      return {
        success: false,
        error: "Invalid restoration proof. Staged proof ID mismatch."
      };
    }
    if (this.stagedProof.backupFingerprint !== proof.backupFingerprint || this.stagedProof.backupPublicKeyHex !== proof.backupPublicKeyHex) {
      return {
        success: false,
        error: "Invalid restoration proof. Authority identity mismatch."
      };
    }
    if (Date.now() > this.stagedProof.expiresAt) {
      this.cancelStagedRestore();
      return {
        success: false,
        error: "Restoration proof expired (5-minute TTL exceeded). Please re-verify."
      };
    }
    try {
      await this.storage.restoreFromBackupPayload(this.stagedBackup);
      await this.vaultService.lockVault();
      this.stagedBackup = null;
      this.stagedProof = null;
      return {
        success: true,
        message: "Encrypted vault and licensing data restored successfully."
      };
    } catch (err) {
      return {
        success: false,
        error: err?.message || "Failed to restore backup payload."
      };
    }
  }
  cancelStagedRestore() {
    this.stagedBackup = null;
    this.stagedProof = null;
  }
};

// electron/services/migration-service.ts
var import_node_crypto2 = require("node:crypto");
var MAX_BACKUP_JSON_LENGTH2 = 5 * 1024 * 1024;
function isStrictHexLength2(value, length) {
  return typeof value === "string" && value.length === length && isStrictHex(value);
}
function createMigrationProofId() {
  return `mig_${Date.now()}_${(0, import_node_crypto2.randomBytes)(16).toString("hex")}`;
}
var MainMigrationService = class {
  constructor(storage, vaultService2) {
    this.stagedBackup = null;
    this.stagedPassword = null;
    this.stagedProof = null;
    this.storage = storage;
    this.vaultService = vaultService2;
  }
  domainExists(domain, value) {
    const storageWithExistence = this.storage;
    if (typeof storageWithExistence.storageDomainExists === "function") {
      return storageWithExistence.storageDomainExists(domain);
    }
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== void 0;
  }
  async captureRollbackSnapshot() {
    const vault = await this.storage.getEncryptedVault();
    const customers = await this.storage.getCustomerRegistry();
    const history = await this.storage.getLicenseHistory();
    const settings = await this.storage.getOwnerSettings();
    const customApps = await this.storage.getCustomApps();
    return {
      existed: {
        vault: this.domainExists("vault", vault),
        customers: this.domainExists("customers", customers),
        history: this.domainExists("history", history),
        settings: this.domainExists("settings", settings),
        customApps: this.domainExists("customApps", customApps)
      },
      vault,
      customers,
      history,
      settings,
      customApps
    };
  }
  async rollbackToSnapshot(snapshot) {
    const storageWithDeletes = this.storage;
    if (snapshot.existed.vault && snapshot.vault) {
      await this.storage.saveEncryptedVault(snapshot.vault);
    } else {
      await storageWithDeletes.deleteEncryptedVault?.();
    }
    if (snapshot.existed.customers) {
      await this.storage.saveCustomerRegistry(snapshot.customers);
    } else {
      await storageWithDeletes.deleteCustomerRegistry?.();
    }
    if (snapshot.existed.history) {
      await this.storage.saveLicenseHistory(snapshot.history);
    } else {
      await storageWithDeletes.deleteLicenseHistory?.();
    }
    if (snapshot.existed.settings) {
      await this.storage.saveOwnerSettings(snapshot.settings);
    } else {
      await storageWithDeletes.deleteOwnerSettings?.();
    }
    if (snapshot.existed.customApps) {
      await this.storage.saveCustomApps(snapshot.customApps);
    } else {
      await storageWithDeletes.deleteCustomApps?.();
    }
  }
  /**
   * Stages an existing ALCO backup for migration.
   * Performs schema validation, password decryption, Ed25519 key derivation,
   * and pre-migration identity parity checking.
   * 
   * NEVER returns privateKeyHex.
   */
  async stageMigration(rawJson, masterPassword) {
    if (!rawJson || typeof rawJson !== "string" || !rawJson.trim()) {
      return { success: false, error: "Backup content is empty." };
    }
    if (rawJson.length > MAX_BACKUP_JSON_LENGTH2) {
      return { success: false, error: "Backup exceeds maximum allowed file size of 5MB." };
    }
    if (!masterPassword || typeof masterPassword !== "string" || masterPassword.length < 8) {
      return { success: false, error: "Master Password must be at least 8 characters long." };
    }
    let parsed;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return { success: false, error: "Backup is not a valid JSON document." };
    }
    if (parsed?.alcoVaultVersion !== "2.0-encrypted") {
      return {
        success: false,
        error: 'Unsupported backup version. Migration requires an ALCO encrypted v2 backup (alcoVaultVersion: "2.0-encrypted").'
      };
    }
    const v = parsed?.encryptedVault;
    if (!v || typeof v !== "object") {
      return { success: false, error: "Corrupted backup: Missing encryptedVault container." };
    }
    if (v.version !== "2.0-aes-gcm" || v.algorithm !== "AES-256-GCM" || v.kdf !== "PBKDF2-SHA-256") {
      return { success: false, error: "Unsupported vault cryptographic parameters." };
    }
    if (typeof v.iterations !== "number" || v.iterations < 1e5) {
      return { success: false, error: "Inadequate PBKDF2 iteration count in backup." };
    }
    if (!isStrictHexLength2(v.saltHex, 32) || !isStrictHexLength2(v.ivHex, 24) || !isStrictHex(v.ciphertextHex)) {
      return { success: false, error: "Corrupted hex encryption vectors in backup vault." };
    }
    if (!isValidPublicKeyHex(v.publicKeyHex)) {
      return { success: false, error: "Invalid Ed25519 public key format in backup vault." };
    }
    if (typeof v.fingerprint !== "string" || !v.fingerprint.trim() || v.fingerprint.length > 80) {
      return { success: false, error: "Invalid authority fingerprint in backup vault." };
    }
    const customerValidation = validateCustomerRegistryPayload(parsed.customers);
    if (!customerValidation.valid) {
      return { success: false, error: customerValidation.error || "Corrupted customer registry in backup payload." };
    }
    let decryptedJson;
    try {
      decryptedJson = await decryptWithPassword(v, masterPassword);
    } catch {
      return { success: false, error: "Decryption failed: Incorrect Master Password for this backup." };
    }
    let secretPayload;
    try {
      secretPayload = JSON.parse(decryptedJson);
    } catch {
      return { success: false, error: "Corrupted vault payload: decrypted content is not valid JSON." };
    }
    const privateKeyHex = typeof secretPayload?.privateKeyHex === "string" ? secretPayload.privateKeyHex.trim() : "";
    if (!isValidSecretKeyHex(privateKeyHex)) {
      return {
        success: false,
        error: "Corrupted backup: Invalid Ed25519 private key format (expected 128 hex characters / 64 bytes)."
      };
    }
    let derived;
    try {
      derived = derivePublicKeyHexFromSecretKey(privateKeyHex);
    } catch (err) {
      return {
        success: false,
        error: `Cryptographic derivation failure: ${err?.message || "Cannot derive public key from secret key."}`
      };
    }
    if (derived.publicKeyHex.toLowerCase() !== v.publicKeyHex.toLowerCase()) {
      return {
        success: false,
        error: "SECURITY VIOLATION: Decrypted private key does not correspond to the backup public key."
      };
    }
    if (derived.fingerprint !== v.fingerprint) {
      return {
        success: false,
        error: "SECURITY VIOLATION: Authority fingerprint does not match decrypted private key."
      };
    }
    const existingVault = await this.storage.getEncryptedVault();
    const proof = {
      proofId: createMigrationProofId(),
      backupFingerprint: v.fingerprint,
      backupPublicKeyHex: v.publicKeyHex,
      recordCount: Array.isArray(parsed.history) ? parsed.history.length : 0,
      customerCount: Array.isArray(parsed.customers) ? parsed.customers.length : 0,
      customAppsCount: Array.isArray(parsed.customApps) ? parsed.customApps.length : 0,
      hasSettings: !!parsed.settings,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1e3
      // 5-minute validity window
    };
    this.stagedBackup = parsed;
    this.stagedPassword = masterPassword;
    this.stagedProof = proof;
    return {
      success: true,
      proof,
      backupFingerprint: v.fingerprint,
      backupPublicKeyHex: v.publicKeyHex,
      customerCount: proof.customerCount,
      historyCount: proof.recordCount,
      customAppsCount: proof.customAppsCount,
      hasSettings: proof.hasSettings,
      hasExistingVault: !!existingVault,
      existingFingerprint: existingVault?.fingerprint
    };
  }
  /**
   * Commits the staged migration to Electron userData storage.
   * Enforces double read-back verification and pre/post fingerprint equality check.
   * If any step fails, automatically rolls back to previous state.
   */
  async commitMigration(input) {
    if (!this.stagedBackup || !this.stagedPassword || !this.stagedProof) {
      return {
        success: false,
        error: "No verified migration staged. You must verify backup and password first."
      };
    }
    if (!input.proof || this.stagedProof.proofId !== input.proof.proofId) {
      return {
        success: false,
        error: "Invalid migration proof: proof ID mismatch."
      };
    }
    if (this.stagedProof.backupFingerprint !== input.proof.backupFingerprint || this.stagedProof.backupPublicKeyHex !== input.proof.backupPublicKeyHex) {
      return {
        success: false,
        error: "SECURITY VIOLATION: Authority identity mismatch in migration proof."
      };
    }
    if (Date.now() > this.stagedProof.expiresAt || Date.now() > input.proof.expiresAt) {
      this.cancelMigration();
      return {
        success: false,
        error: "Migration proof expired (5-minute TTL exceeded). Please re-verify backup."
      };
    }
    const existingVault = await this.storage.getEncryptedVault();
    if (existingVault && !input.overwriteExisting) {
      return {
        success: false,
        error: "An existing authority vault is already present in this desktop app. Explicit overwrite confirmation is required."
      };
    }
    const rollbackSnapshot = await this.captureRollbackSnapshot();
    const targetFingerprint = this.stagedProof.backupFingerprint;
    const targetPublicKeyHex = this.stagedProof.backupPublicKeyHex;
    const password = this.stagedPassword;
    const backupPayload = this.stagedBackup;
    try {
      await this.storage.restoreFromBackupPayload(backupPayload);
      const storedVault = await this.storage.getEncryptedVault();
      if (!storedVault) {
        throw new Error("Post-migration read verification failed: Vault not found on disk after write.");
      }
      if (storedVault.fingerprint !== targetFingerprint) {
        throw new Error("Post-migration verification failed: Stored fingerprint does not match target backup fingerprint.");
      }
      if (storedVault.publicKeyHex.toLowerCase() !== targetPublicKeyHex.toLowerCase()) {
        throw new Error("Post-migration verification failed: Stored public key does not match target backup public key.");
      }
      const decryptedJson = await decryptWithPassword(storedVault, password);
      const secretPayload = JSON.parse(decryptedJson);
      const secretKeyHex = typeof secretPayload?.privateKeyHex === "string" ? secretPayload.privateKeyHex.trim() : "";
      if (!isValidSecretKeyHex(secretKeyHex)) {
        throw new Error("Post-migration verification failed: Invalid secret key format on disk read-back.");
      }
      const postDerived = derivePublicKeyHexFromSecretKey(secretKeyHex);
      if (postDerived.fingerprint !== targetFingerprint) {
        throw new Error("SECURITY VIOLATION: Post-migration derived fingerprint does not match pre-migration fingerprint!");
      }
      if (postDerived.publicKeyHex.toLowerCase() !== targetPublicKeyHex.toLowerCase()) {
        throw new Error("SECURITY VIOLATION: Post-migration derived public key does not match pre-migration public key!");
      }
      await this.vaultService.unlockVault(password);
      const diagnostics = {
        storageLocation: "Electron userData (Local Disk)",
        status: "unlocked",
        fingerprint: targetFingerprint,
        publicKeyHex: targetPublicKeyHex,
        customersCount: (await this.storage.getCustomerRegistry()).length,
        historyCount: (await this.storage.getLicenseHistory()).length,
        customAppsCount: (await this.storage.getCustomApps()).length
      };
      this.cancelMigration();
      return {
        success: true,
        message: "Existing ALCO Authority successfully migrated with 100% cryptographic parity.",
        diagnostics
      };
    } catch (err) {
      try {
        await this.vaultService.lockVault();
        await this.rollbackToSnapshot(rollbackSnapshot);
      } catch (rollbackErr) {
        console.error("Critical rollback failure:", rollbackErr);
      }
      this.cancelMigration();
      return {
        success: false,
        error: `Migration failed and was rolled back: ${err?.message || "Verification check failed."}`
      };
    }
  }
  cancelMigration() {
    this.stagedBackup = null;
    this.stagedPassword = null;
    this.stagedProof = null;
  }
  async getRuntimeDiagnostics() {
    const status = await this.vaultService.getStatus();
    const customers = await this.storage.getCustomerRegistry();
    const history = await this.storage.getLicenseHistory();
    const customApps = await this.storage.getCustomApps();
    return {
      storageLocation: "Electron userData (Local Disk)",
      status: status.status,
      fingerprint: status.fingerprint,
      publicKeyHex: status.publicKeyHex,
      customersCount: customers.length,
      historyCount: history.length,
      customAppsCount: customApps.length
    };
  }
};

// electron/ipc/handlers.ts
var import_electron = require("electron");

// electron/ipc/channels.ts
var ALCO_IPC_CHANNELS = {
  // Vault
  VAULT_GET_STATUS: "alco:vault:getStatus",
  VAULT_SETUP: "alco:vault:setup",
  VAULT_UNLOCK: "alco:vault:unlock",
  VAULT_LOCK: "alco:vault:lock",
  VAULT_CHANGE_PASSWORD: "alco:vault:changePassword",
  // Signing
  LICENSE_GENERATE: "alco:license:generate",
  // Customers
  CUSTOMERS_GET_ALL: "alco:customers:getAll",
  CUSTOMERS_UPSERT: "alco:customers:upsert",
  // History
  HISTORY_GET_ALL: "alco:history:getAll",
  HISTORY_SAVE: "alco:history:save",
  HISTORY_UPDATE_STATUS: "alco:history:updateStatus",
  HISTORY_DELETE: "alco:history:delete",
  // Apps
  APPS_GET_CUSTOM: "alco:apps:getCustom",
  APPS_SAVE_CUSTOM: "alco:apps:saveCustom",
  // Settings
  SETTINGS_GET: "alco:settings:get",
  SETTINGS_SAVE: "alco:settings:save",
  // Backup
  BACKUP_EXPORT: "alco:backup:export",
  BACKUP_VALIDATE: "alco:backup:validate",
  BACKUP_VERIFY: "alco:backup:verify",
  BACKUP_COMMIT: "alco:backup:commit",
  BACKUP_CANCEL: "alco:backup:cancel",
  // Migration & Diagnostics (Phase 4)
  MIGRATION_STAGE: "alco:migration:stage",
  MIGRATION_COMMIT: "alco:migration:commit",
  MIGRATION_CANCEL: "alco:migration:cancel",
  DIAGNOSTICS_GET: "alco:diagnostics:get"
};

// src/modules/storage.ts
var STORAGE_KEYS = {
  VAULT: "alco_encrypted_owner_vault_v2",
  HISTORY: "alco_license_history_v1",
  CUSTOMERS: "alco_customer_registry_v1",
  SETTINGS: "alco_owner_settings_v1",
  CUSTOM_APPS: "alco_custom_apps_registry_v1",
  LEGACY_KEYPAIR: "alco_owner_keypair_v1"
};

// src/modules/customer-registry.ts
function normalizeCustomerEmail(email) {
  return email.trim().toLowerCase();
}
function shortName(name) {
  const clean = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "").toUpperCase();
  return (clean || "CUSTOMER").slice(0, 10);
}
function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
function generateCustomerId(name, existing = getCustomerRegistry()) {
  let id = "";
  do {
    id = `CUS-${shortName(name)}-${randomCode()}`;
  } while (existing.some((c) => c.customerId === id));
  return id;
}
function getCustomerRegistry() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function resolveOrCreateCustomerRecord(existingCustomers, input) {
  const emailNormalized = normalizeCustomerEmail(input.email);
  if (!input.name.trim()) throw new Error("Customer name is required");
  if (!emailNormalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
    throw new Error("Valid customer email is required");
  }
  const existing = existingCustomers.find((c) => c.emailNormalized === emailNormalized);
  if (existing) {
    return { customer: existing, created: false, updatedRegistry: existingCustomers };
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const customer = {
    customerId: generateCustomerId(input.name, existingCustomers),
    name: input.name.trim(),
    email: input.email.trim(),
    emailNormalized,
    whatsapp: input.whatsapp?.trim() || void 0,
    segment: input.segment?.trim() || void 0,
    acquisitionSource: input.acquisitionSource?.trim() || void 0,
    marketingConsent: input.marketingConsent,
    createdAt: now,
    updatedAt: now
  };
  return {
    customer,
    created: true,
    updatedRegistry: [customer, ...existingCustomers]
  };
}

// electron/ipc/handlers.ts
function registerIpcHandlers(vaultService2, signingService, storageService, backupService, migrationService) {
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_GET_STATUS, async () => {
    return await vaultService2.getStatus();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_SETUP, async (_event, input) => {
    return await vaultService2.setupVault(input.masterPassword, input.vaultHint);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_UNLOCK, async (_event, input) => {
    const result = await vaultService2.unlockVault(input.masterPassword);
    if (result.privateKeyHex) {
      delete result.privateKeyHex;
    }
    return result;
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_LOCK, async () => {
    return await vaultService2.lockVault();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.VAULT_CHANGE_PASSWORD, async (_event, input) => {
    return await vaultService2.changePassword(input.currentPassword, input.newPassword, input.vaultHint);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.LICENSE_GENERATE, async (_event, input) => {
    return await signingService.generateLicense(input);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.CUSTOMERS_GET_ALL, async () => {
    return await storageService.getCustomerRegistry();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.CUSTOMERS_UPSERT, async (_event, input) => {
    const registry = await storageService.getCustomerRegistry();
    const resolution = resolveOrCreateCustomerRecord(registry, {
      name: input.name,
      email: input.email,
      whatsapp: input.whatsapp,
      segment: input.segment,
      acquisitionSource: input.acquisitionSource,
      marketingConsent: input.marketingConsent
    });
    if (resolution.created || resolution.updatedRegistry.length !== registry.length) {
      await storageService.saveCustomerRegistry(resolution.updatedRegistry);
    }
    return {
      customer: resolution.customer,
      created: resolution.created
    };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_GET_ALL, async () => {
    return await storageService.getLicenseHistory();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_SAVE, async (_event, record) => {
    await storageService.appendLicenseRecord(record);
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_UPDATE_STATUS, async (_event, { id, status }) => {
    await storageService.updateLicenseStatus(id, status);
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.HISTORY_DELETE, async (_event, { id }) => {
    await storageService.deleteLicenseRecord(id);
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.APPS_GET_CUSTOM, async () => {
    return await storageService.getCustomApps();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.APPS_SAVE_CUSTOM, async (_event, apps) => {
    await storageService.saveCustomApps(apps);
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.SETTINGS_GET, async () => {
    return await storageService.getOwnerSettings();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.SETTINGS_SAVE, async (_event, settings) => {
    await storageService.saveOwnerSettings(settings);
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_EXPORT, async () => {
    return await backupService.exportBackup();
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_VALIDATE, async (_event, rawJson) => {
    return backupService.validateBackup(rawJson);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_VERIFY, async (_event, { backup, password }) => {
    return await backupService.verifyBackupDecryption(backup, password);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_COMMIT, async (_event, proof) => {
    return await backupService.commitRestore(proof);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.BACKUP_CANCEL, async () => {
    backupService.cancelStagedRestore();
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.MIGRATION_STAGE, async (_event, { rawJson, password }) => {
    if (!migrationService) {
      return { success: false, error: "Migration service not initialized on Main process." };
    }
    return await migrationService.stageMigration(rawJson, password);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.MIGRATION_COMMIT, async (_event, input) => {
    if (!migrationService) {
      return { success: false, error: "Migration service not initialized on Main process." };
    }
    return await migrationService.commitMigration(input);
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.MIGRATION_CANCEL, async () => {
    if (migrationService) {
      migrationService.cancelMigration();
    }
    return { success: true };
  });
  import_electron.ipcMain.handle(ALCO_IPC_CHANNELS.DIAGNOSTICS_GET, async () => {
    if (!migrationService) {
      const status = await vaultService2.getStatus();
      const customers = await storageService.getCustomerRegistry();
      const history = await storageService.getLicenseHistory();
      const customApps = await storageService.getCustomApps();
      return {
        storageLocation: "Electron userData (Local Disk)",
        status: status.status,
        fingerprint: status.fingerprint,
        publicKeyHex: status.publicKeyHex,
        customersCount: customers.length,
        historyCount: history.length,
        customAppsCount: customApps.length
      };
    }
    return await migrationService.getRuntimeDiagnostics();
  });
}

// electron/navigation-security.ts
var APPROVED_DEV_HOSTNAMES = /* @__PURE__ */ new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
function isAllowedAppNavigation(rawUrl, isDev) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol === "file:") {
      return true;
    }
    if (!isDev) {
      return false;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    return APPROVED_DEV_HOSTNAMES.has(parsed.hostname);
  } catch {
    return false;
  }
}

// electron/main.ts
var mainWindow = null;
var vaultService = null;
function createWindow() {
  const preloadCandidates = [
    import_node_path2.default.join(__dirname, "preload.cjs"),
    import_node_path2.default.join(__dirname, "preload.js"),
    import_node_path2.default.join(import_electron2.app.getAppPath(), ".electron-prod/preload.cjs"),
    import_node_path2.default.join(import_electron2.app.getAppPath(), ".electron-dev/preload.cjs")
  ];
  const preloadPath = preloadCandidates.find((p) => import_node_fs2.default.existsSync(p)) || import_node_path2.default.join(__dirname, "preload.cjs");
  mainWindow = new import_electron2.BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    title: "ALCO License Generator \u2014 Owner Licensing Authority",
    backgroundColor: "#020617",
    // slate-950
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: preloadPath
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, navigationUrl) => {
    if (!isAllowedAppNavigation(navigationUrl, !!process.env.VITE_DEV_SERVER_URL)) {
      event.preventDefault();
    }
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    if (!isAllowedAppNavigation(process.env.VITE_DEV_SERVER_URL, true)) {
      throw new Error("Refusing to load unapproved development origin.");
    }
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    const indexCandidates = [
      import_node_path2.default.join(__dirname, "../dist/index.html"),
      import_node_path2.default.join(import_electron2.app.getAppPath(), "dist/index.html"),
      import_node_path2.default.join(__dirname, "dist/index.html")
    ];
    const indexPath = indexCandidates.find((p) => import_node_fs2.default.existsSync(p)) || import_node_path2.default.join(__dirname, "../dist/index.html");
    mainWindow.loadFile(indexPath);
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
    if (process.env.VITE_DEV_SERVER_URL) {
      import_electron2.app.quit();
    }
  });
}
import_electron2.app.whenReady().then(() => {
  const userDataDir = import_electron2.app.getPath("userData");
  const storageService = new ElectronFileStorageService(userDataDir);
  vaultService = new MainVaultService(storageService);
  const signingService = new MainSigningService(vaultService, storageService);
  const backupService = new MainBackupService(storageService, vaultService);
  const migrationService = new MainMigrationService(storageService, vaultService);
  registerIpcHandlers(vaultService, signingService, storageService, backupService, migrationService);
  createWindow();
  import_electron2.app.on("activate", () => {
    if (import_electron2.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron2.app.on("window-all-closed", () => {
  if (vaultService) {
    vaultService.lockVault();
  }
  if (process.platform !== "darwin") {
    import_electron2.app.quit();
  }
});
import_electron2.app.on("before-quit", () => {
  if (vaultService) {
    vaultService.lockVault();
  }
});
//# sourceMappingURL=main.cjs.map
