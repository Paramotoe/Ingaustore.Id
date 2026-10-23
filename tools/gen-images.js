/* Membuat aset gambar (ikon PWA + gambar Open Graph) tanpa dependensi.
   Jalankan: node tools/gen-images.js
*/
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/* ---------- PNG encoder minimal ---------- */
const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        t[n] = c;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, body, crc]);
}

function tulisPNG(file, width, height, rgba) {
    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0;
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8;
    ihdr[9] = 6;
    const png = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
        chunk('IEND', Buffer.alloc(0))
    ]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, png);
    return png.length;
}

/* ---------- Kanvas sederhana ---------- */
function kanvas(width, height) {
    const px = Buffer.alloc(width * height * 4);
    const set = (x, y, r, g, b, a = 255) => {
        if (x < 0 || y < 0 || x >= width || y >= height) return;
        const i = (y * width + x) * 4;
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
    };
    const isiPersegi = (x0, y0, x1, y1, r, g, b, a = 255) => {
        for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, r, g, b, a);
    };
    const gradient = (dari, ke) => {
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const t = (x / width * 0.55 + y / height * 0.45);
                const r = Math.round(dari[0] + (ke[0] - dari[0]) * t);
                const g = Math.round(dari[1] + (ke[1] - dari[1]) * t);
                const b = Math.round(dari[2] + (ke[2] - dari[2]) * t);
                set(x, y, r, g, b);
            }
        }
    };
    return { px, set, isiPersegi, gradient, width, height };
}

/* ---------- Font bitmap 5x7 (hanya huruf yang dipakai) ---------- */
const FONT = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01110'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
    L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
    T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
    '.': ['00000', '00000', '00000', '00000', '00000', '00110', '00110'],
    ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000']
};

function lebarTeks(teks, skala) {
    return teks.length * 6 * skala - skala;
}

function tulisTeks(k, teks, x, y, skala, warna) {
    let kursor = x;
    for (const ch of teks) {
        const glyph = FONT[ch] || FONT[' '];
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 5; c++) {
                if (glyph[r][c] === '1') {
                    k.isiPersegi(kursor + c * skala, y + r * skala, kursor + (c + 1) * skala, y + (r + 1) * skala, ...warna);
                }
            }
        }
        kursor += 6 * skala;
    }
}

/* ---------- Ikon aplikasi ---------- */
function buatIkon(ukuran, file) {
    const k = kanvas(ukuran, ukuran);
    k.gradient([249, 206, 52], [98, 40, 215]);

    // Area aman maskable: 80% di tengah
    const skala = Math.round(ukuran * 0.055);
    const lebar = lebarTeks('I', skala);
    const tinggi = 7 * skala;
    tulisTeks(k, 'I', Math.round((ukuran - lebar) / 2), Math.round((ukuran - tinggi) / 2), skala, [255, 255, 255]);

    return tulisPNG(file, ukuran, ukuran, k.px);
}

/* ---------- Gambar Open Graph ---------- */
function buatOG(file) {
    const W = 1200, H = 630;
    const k = kanvas(W, H);
    k.gradient([249, 206, 52], [98, 40, 215]);

    // Panel gelap transparan agar teks terbaca
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const i = (y * W + x) * 4;
            k.px[i] = Math.round(k.px[i] * 0.42);
            k.px[i + 1] = Math.round(k.px[i + 1] * 0.22);
            k.px[i + 2] = Math.round(k.px[i + 2] * 0.52);
        }
    }

    const skalaJudul = 15;
    const lebarJudul = lebarTeks('INGAUSTORE.ID', skalaJudul);
    tulisTeks(k, 'INGAUSTORE.ID', Math.round((W - lebarJudul) / 2), 220, skalaJudul, [255, 255, 255]);

    const skalaSub = 5;
    const lebarSub = lebarTeks('KATALOG PRODUK', skalaSub);
    tulisTeks(k, 'KATALOG PRODUK', Math.round((W - lebarSub) / 2), 360, skalaSub, [255, 214, 232]);

    // Garis aksen
    k.isiPersegi(W / 2 - 90, 320, W / 2 + 90, 326, 255, 255, 255, 200);

    return tulisPNG(file, W, H, k.px);
}

const hasil = [
    ['assets/img/icon-192.png', buatIkon(192, 'assets/img/icon-192.png')],
    ['assets/img/icon-512.png', buatIkon(512, 'assets/img/icon-512.png')],
    ['assets/img/og-image.png', buatOG('assets/img/og-image.png')]
];

for (const [nama, ukuran] of hasil) console.log(nama + ' — ' + (ukuran / 1024).toFixed(1) + ' KB');
