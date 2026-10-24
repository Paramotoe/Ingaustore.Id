'use strict';

/* ==========================================================================
   Ingaustore.id — logika aplikasi
   Sumber data: Supabase (Postgres + Storage + Auth)
   ========================================================================== */

const CFG = window.INGAU_CONFIG || {};
const BUCKET = 'media';
const MAX_IMG = 5 * 1024 * 1024;
const MAX_FOTO = 4;
const ALLOWED_IMG = ['image/png', 'image/jpeg', 'image/webp'];
const PRODUCT_SIZE = 800;
const LOGO_SIZE = 400;
const BG_MAX_SIDE = 1920;
const ATT_KEY = 'ingau.attempts';
const LOCK_KEY = 'ingau.lock_until';
const MAX_ATTEMPTS = 5;
const LOCK_MS = 60 * 1000;
const SEMUA_KATEGORI = 'Semua';

let daftarFoto = [];
let urlPreviewFoto = [];
let fotoUbah = [];
let fotoUbahAsal = [];
let urlPreviewUbah = [];

let sb = null;
let isAdmin = false;
let products = [];
let dataLoaded = false;
let settingsPaths = { logo: null, bg: null };
let kategoriAktif = SEMUA_KATEGORI;
let kategoriSignature = '';
let searchTimer = null;
let toastTimer = null;
let galeri = { images: [], index: 0, judul: '' };

/* --------------------------------------------------------------------------
   Utilitas
   -------------------------------------------------------------------------- */

function terkonfigurasi() {
    return typeof CFG.supabaseUrl === 'string'
        && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CFG.supabaseUrl.trim())
        && typeof CFG.supabaseAnonKey === 'string'
        && CFG.supabaseAnonKey.trim().length > 40;
}

const sanitizeUrl = (u) => {
    try {
        const x = new URL(u);
        return (x.protocol === 'http:' || x.protocol === 'https:') ? x.href : null;
    } catch { return null; }
};

const sanitizeCode = (c) => {
    const v = String(c).trim().toUpperCase();
    return /^[A-Z0-9-]{1,32}$/.test(v) ? v : null;
};

const acak = () => Array.from(crypto.getRandomValues(new Uint8Array(4)))
    .map(x => x.toString(16).padStart(2, '0')).join('');

const formatRupiah = (nilai) => 'Rp ' + Number(nilai).toLocaleString('id-ID', { maximumFractionDigits: 0 });

const namaProduk = (p) => (p.name && p.name.trim()) ? p.name.trim() : p.code;

const angkaHarga = (p) => (p.price === null || p.price === undefined || p.price === '') ? null : Number(p.price);

function pesanKesalahan(err) {
    const m = (err && err.message) ? err.message : 'Terjadi kesalahan. Silakan coba lagi.';
    if (/Invalid login credentials/i.test(m)) return 'Email atau password salah.';
    if (/Email not confirmed/i.test(m)) return 'Email admin belum dikonfirmasi.';
    if (/Password should be at least|weak_password|Password is too weak/i.test(m)) return 'Password terlalu lemah. Gunakan minimal 8 karakter.';
    if (/should be different from the old password/i.test(m)) return 'Password baru harus berbeda dari yang lama.';
    if (/duplicate key|already exists/i.test(m)) return 'Kode produk tersebut sudah dipakai.';
    if (/row-level security|JWT|not authenticated/i.test(m)) return 'Akun ini tidak memiliki hak admin.';
    if (/Failed to fetch|NetworkError|Load failed|Failed to send a request/i.test(m)) return 'Tidak dapat menghubungi server. Periksa koneksi internet.';
    if (/maximum allowed size|Payload too large|exceeded/i.test(m)) return 'Ukuran berkas melebihi batas penyimpanan.';
    return m;
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    document.getElementById('toast-icon').className = type === 'success'
        ? 'fa-solid fa-circle-check text-green-400 text-lg'
        : type === 'error'
            ? 'fa-solid fa-circle-exclamation text-red-400 text-lg'
            : 'fa-solid fa-circle-info text-blue-400 text-lg';
    t.classList.remove('hide');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove('show'); t.classList.add('hide'); }, 3200);
}

/* --------------------------------------------------------------------------
   Modal
   -------------------------------------------------------------------------- */

function openModal(id) {
    const m = document.getElementById(id);
    const c = document.getElementById(id + '-content');
    m.classList.remove('hidden');
    c.classList.remove('modal-leave');
    c.classList.add('modal-enter');
    const f = m.querySelector('input:not([type=hidden]), button');
    if (f) setTimeout(() => f.focus(), 50);
}

function closeModal(id) {
    const m = document.getElementById(id);
    const c = document.getElementById(id + '-content');
    c.classList.remove('modal-enter');
    c.classList.add('modal-leave');
    setTimeout(() => m.classList.add('hidden'), 220);
}

/* --------------------------------------------------------------------------
   Galeri foto
   -------------------------------------------------------------------------- */

function bukaGaleri(images, index, judul) {
    if (!images || !images.length) return;
    galeri = { images, index: Math.max(0, Math.min(index, images.length - 1)), judul };
    document.getElementById('lightbox-img').src = images[galeri.index];
    document.getElementById('lightbox-img').alt = judul;
    document.getElementById('lb-caption').textContent = judul;
    document.getElementById('lb-counter').textContent = images.length > 1
        ? (galeri.index + 1) + ' / ' + images.length : '';
    const banyak = images.length > 1;
    document.getElementById('lb-prev').classList.toggle('hidden', !banyak);
    document.getElementById('lb-next').classList.toggle('hidden', !banyak);

    const lb = document.getElementById('lightbox');
    lb.classList.remove('hidden');
    setTimeout(() => lb.classList.remove('opacity-0'), 10);
    document.body.style.overflow = 'hidden';
}

function geserGaleri(langkah) {
    if (galeri.images.length < 2) return;
    galeri.index = (galeri.index + langkah + galeri.images.length) % galeri.images.length;
    const img = document.getElementById('lightbox-img');
    img.src = galeri.images[galeri.index];
    document.getElementById('lb-counter').textContent = (galeri.index + 1) + ' / ' + galeri.images.length;
}

function closeLightbox() {
    const lb = document.getElementById('lightbox');
    lb.classList.add('opacity-0');
    setTimeout(() => { lb.classList.add('hidden'); document.body.style.overflow = ''; }, 220);
}

/* --------------------------------------------------------------------------
   Gambar: validasi, kompresi, unggah
   -------------------------------------------------------------------------- */

function optimizeImage(file, maxSide, square = false) {
    return new Promise((resolve, reject) => {
        if (!file) return reject(new Error('Berkas gambar tidak ditemukan.'));
        if (!ALLOWED_IMG.includes(file.type)) return reject(new Error('Format gambar harus PNG, JPG, atau WEBP.'));
        if (file.size > MAX_IMG) return reject(new Error('Ukuran gambar maksimal 5 MB.'));

        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Gagal membaca berkas gambar.'));
        reader.onload = () => {
            const img = new Image();
            img.onerror = () => reject(new Error('Gagal memuat gambar.'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (square) {
                    const s = Math.min(img.width, img.height);
                    canvas.width = canvas.height = maxSide;
                    ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, maxSide, maxSide);
                } else {
                    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
                    canvas.width = Math.round(img.width * scale);
                    canvas.height = Math.round(img.height * scale);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
                canvas.toBlob(
                    (blob) => blob ? resolve(blob) : reject(new Error('Gagal memproses gambar.')),
                    'image/jpeg',
                    0.85
                );
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function urlGambar(path) {
    if (!path) return '';
    return sb.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

async function unggah(path, blob, upsert = false) {
    const { error } = await sb.storage.from(BUCKET).upload(path, blob, {
        contentType: 'image/jpeg',
        cacheControl: '3600',
        upsert
    });
    if (error) throw error;
}

async function hapusBerkas(paths) {
    const daftar = (paths || []).filter(Boolean);
    if (!daftar.length) return;
    try { await sb.storage.from(BUCKET).remove(daftar); } catch { /* berkas yatim tidak menghalangi */ }
}

/* --------------------------------------------------------------------------
   Sesi admin
   -------------------------------------------------------------------------- */

let sudahIngatkanBukanAdmin = false;

async function terapkanSesi(sesi) {
    const email = (sesi && sesi.user) ? (sesi.user.email || '') : '';
    let admin = false;
    let pesanSekali = '';

    if (sesi && sesi.user) {
        try {
            const { data, error } = await sb.rpc('is_admin');
            if (error) {
                console.error(error);
                pesanSekali = 'Konfigurasi keamanan belum lengkap. Jalankan supabase/migrate-keamanan-admin.sql di SQL Editor Supabase.';
            } else {
                admin = data === true;
            }
        } catch (err) {
            console.error(err);
            admin = false;
            pesanSekali = 'Tidak dapat memverifikasi hak admin. Periksa koneksi lalu muat ulang.';
        }
    }

    isAdmin = admin;
    const panel = document.getElementById('admin-panel');
    document.getElementById('admin-email').textContent = admin ? email : '';
    panel.classList.toggle('hidden', !admin);

    const logo = document.getElementById('logo');
    const logoImg = document.getElementById('logo-img');
    const logoIcon = document.getElementById('logo-icon');
    if (admin) {
        logo.classList.remove('ig-gradient');
        logo.classList.add('bg-white');
        logoImg.classList.remove('hidden');
        logoIcon.classList.add('hidden');
        muatStatistik();
    } else {
        logo.classList.add('ig-gradient');
        logo.classList.remove('bg-white');
        logoImg.classList.add('hidden');
        logoIcon.classList.remove('hidden');
        if (sesi && sesi.user && !sudahIngatkanBukanAdmin) {
            sudahIngatkanBukanAdmin = true;
            showToast(pesanSekali || 'Akun ini bukan admin toko. Hubungi pemilik untuk didaftarkan.', 'error');
        }
    }

}

function bukaLogin() {
    openModal('login-modal');
    document.getElementById('login-password').value = '';
}

function bacaLock() {
    return {
        until: parseInt(sessionStorage.getItem(LOCK_KEY) || '0', 10) || 0,
        attempts: parseInt(sessionStorage.getItem(ATT_KEY) || '0', 10) || 0
    };
}

function simpanLock(attempts, until) {
    sessionStorage.setItem(ATT_KEY, String(attempts));
    sessionStorage.setItem(LOCK_KEY, String(until));
}

async function prosesLogin(e) {
    e.preventDefault();
    if (!sb) {
        showToast('Sistem belum siap. Muat ulang halaman.', 'error');
        return;
    }
    const now = Date.now();
    if (now < until) {
        showToast('Terlalu banyak percobaan. Coba lagi dalam ' + Math.ceil((until - now) / 1000) + ' detik.', 'error');
        return;
    }

    const btn = document.getElementById('btn-login');
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Memeriksa...';
    try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) {
            const gagal = attempts + 1;
            if (gagal >= MAX_ATTEMPTS) {
                simpanLock(0, Date.now() + LOCK_MS);
                showToast('Terlalu banyak percobaan. Dikunci selama 60 detik.', 'error');
            } else {
                simpanLock(gagal, 0);
                showToast(pesanKesalahan(error) + ' Sisa percobaan: ' + (MAX_ATTEMPTS - gagal) + '.', 'error');
            }
        } else {
            simpanLock(0, 0);
            document.getElementById('login-password').value = '';
            closeModal('login-modal');
            showToast('Berhasil masuk.');
        }
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>Masuk</span> <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>';
    }
}

async function prosesLogout() {
    try {
        await sb.auth.signOut();
        showToast('Anda telah keluar.');
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
    }
}

async function cekPenyediaMasuk() {
    try {
        const res = await fetch(CFG.supabaseUrl.trim() + '/auth/v1/settings', {
            headers: { apikey: CFG.supabaseAnonKey.trim() }
        });
        if (!res.ok) return;
        const s = await res.json();
        const eksternal = s.external || {};
        if (!eksternal.google) return;
        document.getElementById('wrap-provider').classList.remove('hidden');
        document.getElementById('btn-google').classList.remove('hidden');
    } catch (err) {
        console.error(err);
    }
}

async function masukGoogle() {
    const btn = document.getElementById('btn-google');
    btn.disabled = true;
    try {
        const { error } = await sb.auth.signInWithProvider({
            provider: 'google',
            options: { redirectTo: location.origin + '/' }
        });
        if (error) throw error;
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        btn.disabled = false;
    }
}

async function ubahPassword(e) {
    e.preventDefault();
    if (!isAdmin) {
        showToast('Sesi berakhir. Silakan masuk ulang sebagai admin.', 'error');
        return;
    }
    const baru = document.getElementById('pass-baru').value;
    const ulang = document.getElementById('pass-ulang').value;
    if (baru.length < 8) { showToast('Password minimal 8 karakter.', 'error'); return; }
    if (baru !== ulang) { showToast('Konfirmasi password tidak sama.', 'error'); return; }

    const btn = document.getElementById('btn-password');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Memproses...';
    try {
        const { error } = await sb.auth.updateUser({ password: baru });
        if (error) throw error;
        document.getElementById('password-form').reset();
        closeModal('settings-modal');
        showToast('Password berhasil diperbarui.');
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-key" aria-hidden="true"></i> Perbarui Password';
    }
}

async function muatStatistik() {
    const target = document.getElementById('stat-klik');
    try {
        const sejak = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count, error } = await sb
            .from('buy_clicks')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', sejak);
        if (error) throw error;
        target.textContent = (count || 0) + ' klik "Beli" dalam 7 hari terakhir.';
    } catch {
        target.textContent = 'Statistik klik belum tersedia.';
    }
}

async function catatKlik(productId) {
    try { await sb.from('buy_clicks').insert({ product_id: productId }); } catch { /* statistik bersifat opsional */ }
}

/* --------------------------------------------------------------------------
   Produk
   -------------------------------------------------------------------------- */

async function muatProduk() {
    const skeleton = document.getElementById('skeleton');
    skeleton.classList.remove('hidden');
    try {
        const { data, error } = await sb
            .from('products')
            .select('id, code, name, price, category, link, image_paths, created_at')
            .order('created_at', { ascending: false });
        if (error) throw error;
        products = (data || []).map(p => ({
            ...p,
            image_urls: (p.image_paths || []).map(urlGambar)
        }));
    } catch (err) {
        showToast('Gagal memuat produk. ' + pesanKesalahan(err), 'error');
        console.error(err);
    } finally {
        dataLoaded = true;
        skeleton.classList.add('hidden');
        render();
        perbaruiJsonLd();
    }
}

function bacaFieldProduk(sumber) {
    const code = sanitizeCode(document.getElementById(sumber + '-code').value);
    if (!code) throw new Error('Kode produk hanya boleh huruf, angka, dan tanda hubung (maks. 32).');

    const name = document.getElementById(sumber + '-name').value.trim();
    if (!name) throw new Error('Nama produk wajib diisi.');

    const link = sanitizeUrl(document.getElementById(sumber + '-link').value.trim());
    if (!link) throw new Error('Link pembelian harus diawali http:// atau https://.');

    const hargaMentah = document.getElementById(sumber + '-price').value.trim();
    const price = hargaMentah === '' ? null : Number(hargaMentah);
    if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Harga tidak valid.');

    const category = document.getElementById(sumber + '-category').value.trim().slice(0, 32) || null;

    return { code, name, price, category, link };
}

/* --------------------------------------------------------------------------
   Pratinjau foto produk (maks. 4) di form Tambah
   -------------------------------------------------------------------------- */

function bersihkanPreviewFoto() {
    urlPreviewFoto.forEach(url => URL.revokeObjectURL(url));
    urlPreviewFoto = [];
}

function sinkronInputFoto() {
    const dt = new DataTransfer();
    daftarFoto.forEach(f => dt.items.add(f));
    document.getElementById('input-images').files = dt.files;
}

function renderPreviewFoto() {
    bersihkanPreviewFoto();
    const wrap = document.getElementById('preview-foto');
    const hitung = document.getElementById('preview-hitung');
    wrap.innerHTML = '';
    daftarFoto.forEach((file, i) => {
        const url = URL.createObjectURL(file);
        urlPreviewFoto.push(url);
        const kotak = document.createElement('div');
        kotak.className = 'relative rounded-xl overflow-hidden border aspect-square';
        kotak.style.borderColor = 'var(--border)';
        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Pratinjau foto ' + (i + 1);
        img.className = 'w-full h-full object-cover';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow';
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
        btn.setAttribute('aria-label', 'Hapus foto ' + (i + 1));
        btn.innerHTML = '<i class="fa-solid fa-xmark text-xs" aria-hidden="true"></i>';
        btn.addEventListener('click', () => {
            daftarFoto.splice(i, 1);
            sinkronInputFoto();
            renderPreviewFoto();
        });
        kotak.append(img, btn);
        wrap.appendChild(kotak);
    });
    hitung.classList.toggle('hidden', !daftarFoto.length);
    hitung.textContent = daftarFoto.length + ' dari ' + MAX_FOTO + ' foto';
}

function tanganiPilihFoto(input) {
    for (const f of input.files) {
        if (daftarFoto.length >= MAX_FOTO) {
            showToast('Maksimal ' + MAX_FOTO + ' foto per produk.', 'error');
            break;
        }
        if (!ALLOWED_IMG.includes(f.type)) {
            showToast('Format gambar harus PNG, JPG, atau WEBP.', 'error');
            continue;
        }
        if (f.size > MAX_IMG) {
            showToast('Ukuran gambar maksimal 5 MB.', 'error');
            continue;
        }
        const kembar = daftarFoto.some(x => x.name === f.name && x.size === f.size && x.lastModified === f.lastModified);
        if (!kembar) daftarFoto.push(f);
    }
    sinkronInputFoto();
    renderPreviewFoto();
}


function pratinjauFoto() {
    const images = [];
    for (const file of daftarFoto) {
        images.push(URL.createObjectURL(file));
    }
    if (!images.length) {
        showToast('Belum ada foto yang dipilih.', 'info');
        return;
    }
    bukaGaleri(images, 0, 'Pratinjau foto produk');
}
function resetFoto() {
    daftarFoto = [];
    sinkronInputFoto();
    renderPreviewFoto();
}

async function tambahBarang(e) {
    e.preventDefault();
    if (!sb) { showToast('Sistem belum siap.', 'error'); return; }
    if (!isAdmin) return;

    const btn = document.getElementById('btn-add');
    const form = e.target;
    const berkas = [...document.getElementById('input-images').files];
    const terunggah = [];

    try {
        const field = bacaFieldProduk('input');
        if (!berkas.length) throw new Error('Pilih minimal satu foto produk.');
        if (berkas.length > MAX_FOTO) throw new Error('Maksimal ' + MAX_FOTO + ' foto per produk.');

        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyimpan...';

        for (const file of berkas) {
            const path = 'products/' + Date.now() + '-' + acak() + '.jpg';
            await unggah(path, await optimizeImage(file, PRODUCT_SIZE, true));
            terunggah.push(path);
        }

        const { error } = await sb.from('products').insert({ ...field, image_paths: terunggah });
        if (error) throw error;

        form.reset();
        resetFoto();
        showToast('Produk ' + field.code + ' berhasil ditambahkan.');
        await muatProduk();
        if (isAdmin) muatStatistik();
    } catch (err) {
        await hapusBerkas(terunggah);
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-plus" aria-hidden="true"></i> Tambah Produk';
    }
}

function bukaUbah(p) {
    document.getElementById('edit-id').value = p.id;
    document.getElementById('edit-name').value = p.name || '';
    document.getElementById('edit-price').value = (p.price === null || p.price === undefined) ? '' : p.price;
    document.getElementById('edit-category').value = p.category || '';
    document.getElementById('edit-code').value = p.code;
    document.getElementById('edit-link').value = p.link;
    fotoUbahAsal = (p.image_paths || []).slice();
    fotoUbah = fotoUbahAsal.map(path => ({ path }));
    document.getElementById('edit-images').value = '';
    renderPreviewFotoUbah();
    openModal('edit-modal');
}

function bersihkanPreviewUbah() {
    urlPreviewUbah.forEach(url => URL.revokeObjectURL(url));
    urlPreviewUbah = [];
}

function renderPreviewFotoUbah() {
    bersihkanPreviewUbah();
    const wrap = document.getElementById('edit-preview-foto');
    wrap.innerHTML = '';
    fotoUbah.forEach((item, i) => {
        const kotak = document.createElement('div');
        kotak.className = 'relative rounded-xl overflow-hidden border aspect-square';
        kotak.style.borderColor = 'var(--border)';
        const img = document.createElement('img');
        img.alt = 'Foto produk ' + (i + 1);
        img.className = 'w-full h-full object-cover';
        if (item.path) {
            img.src = urlGambar(item.path);
        } else {
            const url = URL.createObjectURL(item.file);
            urlPreviewUbah.push(url);
            img.src = url;
        }
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center shadow';
        btn.style.background = '#ef4444';
        btn.style.color = '#fff';
        btn.setAttribute('aria-label', 'Hapus foto ' + (i + 1));
        btn.innerHTML = '<i class="fa-solid fa-xmark text-xs" aria-hidden="true"></i>';
        btn.addEventListener('click', () => {
            fotoUbah.splice(i, 1);
            renderPreviewFotoUbah();
        });
        kotak.append(img, btn);
        wrap.appendChild(kotak);
    });
    document.getElementById('edit-foto-info').textContent = fotoUbah.length + ' dari ' + MAX_FOTO + ' foto';
}

function tanganiPilihFotoUbah(input) {
    for (const f of input.files) {
        if (fotoUbah.length >= MAX_FOTO) {
            showToast('Maksimal ' + MAX_FOTO + ' foto per produk.', 'error');
            break;
        }
        if (!ALLOWED_IMG.includes(f.type)) {
            showToast('Format gambar harus PNG, JPG, atau WEBP.', 'error');
            continue;
        }
        if (f.size > MAX_IMG) {
            showToast('Ukuran gambar maksimal 5 MB.', 'error');
            continue;
        }
        if (!fotoUbah.some(x => x.file && x.file.name === f.name && x.file.size === f.size && x.file.lastModified === f.lastModified)) {
            fotoUbah.push({ file: f });
        }
    }
    input.value = '';
    renderPreviewFotoUbah();
}


function pratinjauFotoUbah() {
    const images = [];
    for (const item of fotoUbah) {
        if (item.path) {
            images.push(urlGambar(item.path));
        } else if (item.file) {
            images.push(URL.createObjectURL(item.file));
        }
    }
    if (!images.length) {
        showToast('Belum ada foto yang dipilih.', 'info');
        return;
    }
    bukaGaleri(images, 0, 'Pratinjau foto produk');
}
async function simpanUbahProduk(e) {
    e.preventDefault();
    if (!sb) { showToast('Sistem belum siap.', 'error'); return; }
    if (!isAdmin) return;

    const btn = document.getElementById('btn-edit');
    const id = document.getElementById('edit-id').value;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyimpan...';
    try {
        const code = sanitizeCode(document.getElementById('edit-code').value);
        if (!code) throw new Error('Kode produk tidak valid.');
        const name = document.getElementById('edit-name').value.trim();
        if (!name) throw new Error('Nama produk wajib diisi.');
        const link = sanitizeUrl(document.getElementById('edit-link').value.trim());
        if (!link) throw new Error('Link pembelian harus diawali http:// atau https://.');
        const hargaMentah = document.getElementById('edit-price').value.trim();
        const price = hargaMentah === '' ? null : Number(hargaMentah);
        if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Harga tidak valid.');
        const category = document.getElementById('edit-category').value.trim().slice(0, 32) || null;

        const { error } = await sb.from('products').update({ code, name, price, category, link }).eq('id', id);
        if (error) throw error;

        closeModal('edit-modal');
        showToast('Produk ' + code + ' diperbarui.');
        await muatProduk();
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Simpan Perubahan';
    }
}

async function hapusBarang(p) {
    if (!sb) { showToast('Sistem belum siap.', 'error'); return; }
    if (!isAdmin) return;
    if (!confirm('Hapus produk ' + p.code + ' dari katalog?')) return;
    try {
        const { error } = await sb.from('products').delete().eq('id', p.id);
        if (error) throw error;
        await hapusBerkas(p.image_paths);
        showToast('Produk ' + p.code + ' dihapus.');
        await muatProduk();
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    }
}

/* --------------------------------------------------------------------------
   Ekspor & impor CSV
   -------------------------------------------------------------------------- */

const kutipCSV = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';

function eksporCSV() {
    if (!products.length) { showToast('Belum ada produk untuk diekspor.', 'info'); return; }
    const baris = [['code', 'name', 'price', 'category', 'link']];
    products.forEach(p => baris.push([p.code, p.name || '', p.price ?? '', p.category || '', p.link]));
    const csv = baris.map(r => r.map(kutipCSV).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ingaustore-produk-' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast(products.length + ' produk diekspor ke CSV.');
}

function parseCSV(teks) {
    const rows = [];
    let row = [];
    let field = '';
    let dalamKutip = false;
    for (let i = 0; i < teks.length; i++) {
        const c = teks[i];
        if (dalamKutip) {
            if (c === '"') {
                if (teks[i + 1] === '"') { field += '"'; i++; } else dalamKutip = false;
            } else field += c;
        } else if (c === '"') {
            dalamKutip = true;
        } else if (c === ',' || c === ';') {
            row.push(field); field = '';
        } else if (c === '\n') {
            row.push(field); rows.push(row); row = []; field = '';
        } else if (c !== '\r') {
            field += c;
        }
    }
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows.filter(r => r.some(x => String(x).trim() !== ''));
}

async function imporCSV(input) {
    const file = input.files[0];
    if (!file) return;
    try {
        const rows = parseCSV((await file.text()).replace(/^\uFEFF/, ''));
        if (rows.length < 2) throw new Error('Berkas CSV kosong atau hanya berisi judul kolom.');

        const head = rows[0].map(h => h.trim().toLowerCase());
        const kolom = (nama) => head.indexOf(nama);
        if (kolom('code') < 0 || kolom('link') < 0) throw new Error('Kolom "code" dan "link" wajib ada di baris pertama.');

        const data = [];
        for (const r of rows.slice(1)) {
            const code = sanitizeCode(r[kolom('code')] || '');
            const link = sanitizeUrl(String(r[kolom('link')] || '').trim());
            if (!code || !link) continue;
            const angka = String(kolom('price') >= 0 ? (r[kolom('price')] || '') : '').replace(/[^\d]/g, '');
            data.push({
                code,
                link,
                name: kolom('name') >= 0 ? (String(r[kolom('name')] || '').trim().slice(0, 80) || code) : code,
                price: angka ? Number(angka) : null,
                category: kolom('category') >= 0 ? (String(r[kolom('category')] || '').trim().slice(0, 32) || null) : null
            });
        }
        if (!data.length) throw new Error('Tidak ada baris valid. Periksa kolom code dan link.');

        const { error } = await sb.from('products').upsert(data, { onConflict: 'code' });
        if (error) throw error;

        showToast(data.length + ' produk diimpor dari CSV.');
        await muatProduk();
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    } finally {
        input.value = '';
    }
}

/* --------------------------------------------------------------------------
   Tampilan toko (logo & wallpaper)
   -------------------------------------------------------------------------- */

function applyVisual(logoUrl, bgUrl) {
    const img = document.getElementById('logo-img');
    const icon = document.getElementById('logo-icon');
    const box = document.getElementById('logo-box');
    const btnHapus = document.getElementById('btn-remove-bg');

    if (logoUrl) {
        img.src = logoUrl;
        img.classList.remove('hidden');
        icon.classList.add('hidden');
        box.classList.remove('ig-gradient');
        box.classList.add('bg-white');
    } else {
        img.classList.add('hidden');
        img.removeAttribute('src');
        icon.classList.remove('hidden');
        box.classList.add('ig-gradient');
        box.classList.remove('bg-white');
    }

    if (bgUrl) {
        document.body.style.setProperty('--wall', 'url("' + bgUrl + '")');
        document.body.classList.add('has-wallpaper');
        btnHapus.classList.remove('hidden');
    } else {
        document.body.style.removeProperty('--wall');
        document.body.classList.remove('has-wallpaper');
        btnHapus.classList.add('hidden');
    }
}

async function muatPengaturan() {
    try {
        const { data, error } = await sb.from('settings').select('key, value');
        if (error) throw error;
        const map = Object.fromEntries((data || []).map(r => [r.key, r.value]));
        settingsPaths = { logo: map.logo || null, bg: map.bg || null };
        applyVisual(settingsPaths.logo ? urlGambar(settingsPaths.logo) : null,
            settingsPaths.bg ? urlGambar(settingsPaths.bg) : null);
    } catch (err) {
        console.error(err);
    }
}

function bukaPengaturan() {
    openModal('settings-modal');
    document.getElementById('settings-logo-preview').classList.add('hidden');
    document.getElementById('settings-logo-icon').classList.remove('hidden');
    document.getElementById('settings-bg-preview-wrap').classList.add('hidden');
    document.getElementById('settings-form').reset();
}

function previewGambar(input, pid, iid) {
    const file = input.files[0];
    if (!file) return;
    if (!ALLOWED_IMG.includes(file.type)) {
        showToast('Format gambar harus PNG, JPG, atau WEBP.', 'error');
        input.value = '';
        return;
    }
    if (file.size > MAX_IMG) {
        showToast('Ukuran gambar maksimal 5 MB.', 'error');
        input.value = '';
        return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
        document.getElementById(pid).src = ev.target.result;
        document.getElementById(pid).classList.remove('hidden');
        document.getElementById(iid).classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

async function simpanPengaturan(e) {
    e.preventDefault();
    if (!isAdmin) {
        showToast('Sesi berakhir. Silakan masuk ulang sebagai admin.', 'error');
        return;
    }

    const btn = document.getElementById('btn-save');
    const fileLogo = document.getElementById('input-logo').files[0];
    const fileBg = document.getElementById('input-bg').files[0];
    if (!fileLogo && !fileBg) {
        showToast('Pilih logo atau wallpaper terlebih dahulu.', 'info');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Menyimpan...';
    try {
        if (fileLogo) {
            const path = 'branding/logo-' + Date.now() + '.jpg';
            await unggah(path, await optimizeImage(fileLogo, LOGO_SIZE, true));
            const { error } = await sb.from('settings').upsert({ key: 'logo', value: path, updated_at: new Date().toISOString() });
            if (error) throw error;
            if (settingsPaths.logo) await hapusBerkas([settingsPaths.logo]);
        }

        if (fileBg) {
            const path = 'branding/bg-' + Date.now() + '.jpg';
            await unggah(path, await optimizeImage(fileBg, BG_MAX_SIDE, false));
            const { error } = await sb.from('settings').upsert({ key: 'bg', value: path, updated_at: new Date().toISOString() });
            if (error) throw error;
            if (settingsPaths.bg) await hapusBerkas([settingsPaths.bg]);
        }

        await muatPengaturan();
        closeModal('settings-modal');
        showToast('Tampilan berhasil diperbarui.');
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i> Simpan';
    }
}

async function hapusBackground() {
    if (!isAdmin) return;
    try {
        const path = settingsPaths.bg;
        const { error } = await sb.from('settings').delete().eq('key', 'bg');
        if (error) throw error;
        await hapusBerkas([path]);
        document.getElementById('input-bg').value = '';
        document.getElementById('settings-bg-preview-wrap').classList.add('hidden');
        await muatPengaturan();
        showToast('Wallpaper dihapus.');
    } catch (err) {
        showToast(pesanKesalahan(err), 'error');
        console.error(err);
    }
}

/* --------------------------------------------------------------------------
   Pencarian, filter, urutan
   -------------------------------------------------------------------------- */

function cocokCari(p, term) {
    if (!term) return true;
    const teks = [p.code, p.name || '', p.category || ''].join(' ').toLowerCase();
    return teks.includes(term);
}

function daftarTampil() {
    const term = document.getElementById('search-input').value.trim().toLowerCase();
    let list = products.filter(p => cocokCari(p, term));
    if (kategoriAktif !== SEMUA_KATEGORI) {
        list = list.filter(p => (p.category || '') === kategoriAktif);
    }

    const mode = document.getElementById('sort-select').value;
    const salin = list.slice();

    if (mode === 'termurah' || mode === 'termahal') {
        const arah = mode === 'termurah' ? 1 : -1;
        salin.sort((a, b) => {
            const ha = angkaHarga(a);
            const hb = angkaHarga(b);
            if (ha === null && hb === null) return 0;
            if (ha === null) return 1;
            if (hb === null) return -1;
            return (ha - hb) * arah;
        });
    } else if (mode === 'nama') {
        salin.sort((a, b) => namaProduk(a).localeCompare(namaProduk(b), 'id'));
    }
    return salin;
}

function renderKategori() {
    const bar = document.getElementById('category-bar');
    const kategori = [...new Set(products.map(p => (p.category || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
    const daftar = [SEMUA_KATEGORI, ...kategori];

    if (!kategori.length) {
        bar.innerHTML = '';
        document.getElementById('category-list').innerHTML = '';
        kategoriSignature = '';
        return;
    }

    const signature = daftar.join('|') + '#' + kategoriAktif;
    if (signature === kategoriSignature) return;
    kategoriSignature = signature;

    bar.innerHTML = '';
    daftar.forEach(k => {
        const aktif = k === kategoriAktif;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = k;
        btn.setAttribute('aria-pressed', String(aktif));
        btn.className = 'shrink-0 px-4 py-2 rounded-full text-sm font-bold border transition';
        btn.style.cssText = aktif
            ? 'background:var(--brand);border-color:var(--brand);color:#fff'
            : 'background:var(--card);border-color:var(--border);color:var(--muted)';
        btn.addEventListener('click', () => { kategoriAktif = k; render(); });
        bar.appendChild(btn);
    });

    const datalist = document.getElementById('category-list');
    datalist.innerHTML = '';
    kategori.forEach(k => {
        const opt = document.createElement('option');
        opt.value = k;
        datalist.appendChild(opt);
    });
}

function liveSearch(val) {
    document.getElementById('search-clear').classList.toggle('hidden', !val);
    const sug = document.getElementById('search-suggestions');
    const term = val.trim().toLowerCase();

    if (!term) {
        sug.classList.add('hidden');
        render();
        return;
    }

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        const matches = products.filter(p => cocokCari(p, term)).slice(0, 8);
        sug.innerHTML = '';
        if (matches.length) {
            matches.forEach(p => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-3 border-b last:border-b-0';
                btn.style.borderColor = 'var(--border)';

                const ic = document.createElement('i');
                ic.className = 'fa-solid fa-magnifying-glass text-slate-400 text-sm';
                ic.setAttribute('aria-hidden', 'true');

                const isi = document.createElement('span');
                isi.className = 'flex-1 min-w-0';
                const utama = document.createElement('span');
                utama.className = 'block font-semibold truncate';
                utama.style.color = 'var(--text)';
                utama.textContent = namaProduk(p);
                const kecil = document.createElement('span');
                kecil.className = 'block text-xs';
                kecil.style.color = 'var(--muted)';
                kecil.textContent = p.code + (p.category ? ' · ' + p.category : '');
                isi.append(utama, kecil);

                btn.append(ic, isi);
                btn.addEventListener('click', () => pickSuggestion(p.code));
                sug.appendChild(btn);
            });
        } else {
            const kosong = document.createElement('div');
            kosong.className = 'px-4 py-3 text-sm';
            kosong.style.color = 'var(--muted)';
            kosong.textContent = 'Tidak ada produk yang cocok.';
            sug.appendChild(kosong);
        }
        sug.classList.remove('hidden');
        render();
    }, 120);
}

function pickSuggestion(code) {
    document.getElementById('search-input').value = code;
    document.getElementById('search-suggestions').classList.add('hidden');
    render();
}

function submitSearch(e) {
    e.preventDefault();
    document.getElementById('search-suggestions').classList.add('hidden');
    liveSearch(document.getElementById('search-input').value.trim());
}

function clearSearch() {
    document.getElementById('search-input').value = '';
    document.getElementById('search-clear').classList.add('hidden');
    document.getElementById('search-suggestions').classList.add('hidden');
    render();
    document.getElementById('search-input').focus();
}

/* --------------------------------------------------------------------------
   Bagikan
   -------------------------------------------------------------------------- */

async function bagikan(p) {
    const judul = 'Ingaustore.id';
    const teks = namaProduk(p) + (angkaHarga(p) !== null ? ' — ' + formatRupiah(p.price) : '') + ' (' + p.code + ')';
    const url = location.origin + '/';
    if (navigator.share) {
        try {
            await navigator.share({ title: judul, text: teks, url });
            return;
        } catch { /* pengguna membatalkan */ }
    }
    window.open('https://wa.me/?text=' + encodeURIComponent(teks + '\n' + url), '_blank', 'noopener');
}

/* --------------------------------------------------------------------------
   Render katalog
   -------------------------------------------------------------------------- */

const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            io.unobserve(entry.target);
        }
    });
}, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

function tombolAdmin(p) {
    const wrap = document.createElement('div');
    wrap.className = 'absolute top-2 right-2 flex gap-1.5 z-20';

    const ubah = document.createElement('button');
    ubah.type = 'button';
    ubah.className = 'w-9 h-9 rounded-full flex items-center justify-center shadow-md transition';
    ubah.style.cssText = 'background:#fff;color:#0f172a';
    ubah.setAttribute('aria-label', 'Ubah produk ' + p.code);
    ubah.innerHTML = '<i class="fa-solid fa-pen text-xs" aria-hidden="true"></i>';
    ubah.addEventListener('click', (ev) => { ev.stopPropagation(); bukaUbah(p); });

    const hapus = document.createElement('button');
    hapus.type = 'button';
    hapus.className = 'w-9 h-9 rounded-full flex items-center justify-center shadow-md transition';
    hapus.style.cssText = 'background:#ef4444;color:#fff';
    hapus.setAttribute('aria-label', 'Hapus produk ' + p.code);
    hapus.innerHTML = '<i class="fa-solid fa-trash-can text-xs" aria-hidden="true"></i>';
    hapus.addEventListener('click', (ev) => { ev.stopPropagation(); hapusBarang(p); });

    wrap.append(ubah, hapus);
    return wrap;
}

function kartuProduk(p, i) {
    const card = document.createElement('div');
    card.className = 'card overflow-hidden flex flex-col fade-in relative';
    card.style.transitionDelay = (i * 25) + 'ms';

    const gambar = document.createElement('div');
    gambar.className = 'relative aspect-square overflow-hidden cursor-zoom bg-slate-100';
    gambar.style.width = '100%';
    gambar.setAttribute('role', 'button');
    gambar.setAttribute('tabindex', '0');
    gambar.setAttribute('aria-label', 'Perbesar foto ' + namaProduk(p));
    gambar.addEventListener('click', () => bukaGaleri(p.image_urls, 0, namaProduk(p)));
    gambar.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); bukaGaleri(p.image_urls, 0, namaProduk(p)); }
    });

    if (p.image_urls && p.image_urls.length) {
        const img = document.createElement('img');
        img.src = p.image_urls[0];
        img.alt = 'Foto ' + namaProduk(p);
        img.className = 'w-full h-full object-cover transition-transform duration-500 hover:scale-105';
        img.loading = 'lazy';
        img.decoding = 'async';
        img.width = 400;
        img.height = 400;
        gambar.appendChild(img);
    } else {
        const kosong = document.createElement('div');
        kosong.className = 'w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400';
        kosong.innerHTML = '<i class="fa-solid fa-image text-3xl" aria-hidden="true"></i><span class="text-xs font-semibold">Tanpa foto</span>';
        gambar.appendChild(kosong);
    }

    if (p.category) {
        const badge = document.createElement('span');
        badge.className = 'absolute bottom-2 left-2 px-2.5 py-1 rounded-full text-xs font-bold shadow-sm';
        badge.style.cssText = 'background:rgba(255,255,255,0.94);color:#be185d';
        badge.textContent = p.category;
        gambar.appendChild(badge);
    }

    if (isAdmin) card.appendChild(tombolAdmin(p));
    card.appendChild(gambar);

    const body = document.createElement('div');
    body.className = 'p-3 sm:p-4 flex flex-col gap-2 flex-1';

    const judul = document.createElement('h3');
    judul.className = 'font-extrabold text-base sm:text-lg tracking-tight leading-snug line-clamp-2 min-h-[2.6em]';
    judul.style.color = 'var(--text)';
    judul.textContent = namaProduk(p);

    const harga = document.createElement('p');
    harga.className = 'font-extrabold text-base sm:text-lg';
    harga.style.color = 'var(--brand-dark)';
    harga.textContent = angkaHarga(p) !== null ? formatRupiah(p.price) : 'Hubungi penjual';

    const aksi = document.createElement('div');
    aksi.className = 'flex items-center gap-2 mt-auto';

    const beli = document.createElement('a');
    beli.href = p.link;
    beli.target = '_blank';
    beli.rel = 'noopener noreferrer';
    beli.className = 'btn-primary flex-1 text-center py-2.5 rounded-xl flex items-center justify-center gap-2 touch-lg';
    beli.innerHTML = '<i class="fa-solid fa-bag-shopping" aria-hidden="true"></i> Beli';
    beli.addEventListener('click', () => catatKlik(p.id));

    const bagi = document.createElement('button');
    bagi.type = 'button';
    bagi.className = 'w-11 h-11 rounded-xl flex items-center justify-center shrink-0';
    bagi.style.cssText = 'background:var(--border);color:var(--text)';
    bagi.setAttribute('aria-label', 'Bagikan ' + namaProduk(p));
    bagi.innerHTML = '<i class="fa-solid fa-share-nodes" aria-hidden="true"></i>';
    bagi.addEventListener('click', () => bagikan(p));

    aksi.append(beli, bagi);
    body.append(judul);

    if (namaProduk(p) !== p.code) {
        const kode = document.createElement('p');
        kode.className = 'text-xs font-semibold -mt-1';
        kode.style.color = 'var(--muted)';
        kode.textContent = p.code;
        body.appendChild(kode);
    }

    body.append(harga, aksi);
    card.appendChild(body);

    return card;
}

function render() {
    const grid = document.getElementById('product-grid');
    const empty = document.getElementById('empty-state');
    const counter = document.getElementById('item-count');

    renderKategori();

    const list = daftarTampil();
    counter.textContent = list.length + ' Produk';
    grid.innerHTML = '';

    if (list.length === 0) {
        grid.classList.add('hidden');
        if (!dataLoaded) { empty.classList.add('hidden'); return; }
        empty.classList.remove('hidden');
        setTimeout(() => empty.classList.add('visible'), 50);
        const term = document.getElementById('search-input').value.trim();
        const adaFilter = Boolean(term) || kategoriAktif !== SEMUA_KATEGORI;
        document.getElementById('empty-title').textContent = adaFilter ? 'Produk Tidak Ditemukan' : 'Katalog Masih Kosong';
        document.getElementById('empty-desc').textContent = adaFilter
            ? 'Coba kata kunci lain, atau pilih kategori "Semua".'
            : 'Belum ada produk yang tersedia saat ini.';
        return;
    }

    empty.classList.add('hidden');
    empty.classList.remove('visible');
    grid.classList.remove('hidden');

    list.forEach((p, i) => {
        const card = kartuProduk(p, i);
        grid.appendChild(card);
        io.observe(card);
    });
}

/* --------------------------------------------------------------------------
   Data terstruktur untuk mesin pencari
   -------------------------------------------------------------------------- */

function perbaruiJsonLd() {
    const lama = document.getElementById('ld-produk');
    if (lama) lama.remove();
    if (!products.length) return;

    const itemList = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Katalog Produk Ingaustore.id',
        numberOfItems: products.length,
        itemListElement: products.slice(0, 50).map((p, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            item: {
                '@type': 'Product',
                name: namaProduk(p),
                sku: p.code,
                url: p.link,
                image: p.image_urls && p.image_urls[0] ? p.image_urls[0] : undefined,
                category: p.category || undefined,
                offers: angkaHarga(p) !== null ? {
                    '@type': 'Offer',
                    price: angkaHarga(p),
                    priceCurrency: 'IDR',
                    availability: 'https://schema.org/InStock'
                } : undefined
            }
        }))
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'ld-produk';
    script.textContent = JSON.stringify(itemList);
    document.head.appendChild(script);
}

/* --------------------------------------------------------------------------
   Pintasan admin tersembunyi
   -------------------------------------------------------------------------- */

function pasangPintasanAdmin() {
    let logoTaps = 0;
    let logoTimer = null;
    const logo = document.getElementById('logo');

    logo.addEventListener('click', () => {
        logoTaps++;
        clearTimeout(logoTimer);
        logoTimer = setTimeout(() => { logoTaps = 0; }, 1200);
        if (logoTaps >= 5) { logoTaps = 0; bukaLogin(); }
    });

    let pressTimer = null;
    logo.addEventListener('touchstart', () => { pressTimer = setTimeout(bukaLogin, 1200); }, { passive: true });
    logo.addEventListener('touchend', () => clearTimeout(pressTimer));
    logo.addEventListener('touchmove', () => clearTimeout(pressTimer));

    if (location.hash === '#admin') bukaLogin();

    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            bukaLogin();
        }
        const lb = document.getElementById('lightbox');
        const galeriTerbuka = lb && !lb.classList.contains('hidden');
        if (galeriTerbuka && e.key === 'ArrowLeft') { geserGaleri(-1); return; }
        if (galeriTerbuka && e.key === 'ArrowRight') { geserGaleri(1); return; }

        if (e.key === 'Escape') {
            ['login-modal', 'settings-modal', 'edit-modal'].forEach(id => {
                const el = document.getElementById(id);
                if (el && !el.classList.contains('hidden')) closeModal(id);
            });
            if (galeriTerbuka) closeLightbox();
        }
    });

    let footerTaps = 0;
    let footerTimer = null;
    document.querySelector('footer p').addEventListener('click', () => {
        footerTaps++;
        clearTimeout(footerTimer);
        footerTimer = setTimeout(() => { footerTaps = 0; }, 1000);
        if (footerTaps >= 3) { footerTaps = 0; bukaLogin(); }
    });
}

/* --------------------------------------------------------------------------
   Inisialisasi
   -------------------------------------------------------------------------- */

async function init() {
    console.log('[Ingaustore] init() called, supabase:', typeof supabase);
    document.getElementById('year').textContent = new Date().getFullYear();
    pasangPintasanAdmin();

    window.addEventListener('scroll', () => {
        document.getElementById('back-top').classList.toggle('hidden', window.scrollY <= 400);
    }, { passive: true });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-wrap')) {
            document.getElementById('search-suggestions').classList.add('hidden');
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').catch(() => { /* offline murni opsional */ });
        });
    }

    if (!terkonfigurasi()) {
        document.getElementById('config-warning').classList.remove('hidden');
        document.getElementById('skeleton').classList.add('hidden');
        return;
    }

    if (typeof supabase === 'undefined') {
        showToast('Pustaka Supabase gagal dimuat. Periksa koneksi internet lalu muat ulang.', 'error');
        document.getElementById('skeleton').classList.add('hidden');
        return;
    }

    sb = supabase.createClient(CFG.supabaseUrl.trim(), CFG.supabaseAnonKey.trim(), {
        auth: {
            storage: window.sessionStorage,
            storageKey: 'ingau.auth',
            persistSession: true,
            autoRefreshToken: true
        }
    });

    console.log('[Ingaustore] sb created:', sb ? 'yes' : 'NO', 'type:', typeof sb);
    
    sb.auth.onAuthStateChange((_event, session) => {
        setTimeout(() => terapkanSesi(session), 0);
    });

    cekPenyediaMasuk();

    const { data } = await sb.auth.getSession();
    console.log('[Ingaustore] session data:', data ? 'yes' : 'NO');
    await terapkanSesi(data && data.session);

    console.log('[Ingaustore] init complete, isAdmin:', isAdmin);
    await Promise.all([muatPengaturan(), muatProduk()]);
}

document.addEventListener('DOMContentLoaded', init);
