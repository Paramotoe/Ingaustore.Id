/**
 * Uji logika pintu admin (pasangPintuAdmin) dari adminGate.js ASLI.
 * Sumber dibaca dari repo, hanya baris import supabase dan dua fungsi server
 * yang dibuang supaya bisa dijalankan di node tanpa dependensi.
 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')

const SRC = path.join(__dirname, '..', 'react-frontend', 'src', 'services', 'adminGate.js')
let code = fs.readFileSync(SRC, 'utf8')

// Buang import supabase + dua fungsi server (butuh jaringan).
code = code.replace(/^import .*$/m, '')
code = code.replace(/^export\s+/gm, '')
code = code.replace(/export async function bolehMasukServer[\s\S]*?\n}\n/, '')
code = code.replace(/export async function catatPercobaanServer[\s\S]*?\n}\n/, '')

const sandbox = { module: { exports: {} }, exports: {}, window: {}, setTimeout, clearTimeout, console }
sandbox.global = sandbox
vm.createContext(sandbox)
vm.runInContext(code + '\nmodule.exports = { pasangPintuAdmin };', sandbox)

const { pasangPintuAdmin } = sandbox.module.exports

// --- palsukan elemen DOM ---
function elemenPalsu() {
  const handlers = {}
  const el = {
    addEventListener: (n, f) => { (handlers[n] = handlers[n] || []).push(f); el._add.push(n) },
    removeEventListener: (n, f) => {
      handlers[n] = (handlers[n] || []).filter((x) => x !== f)
      el._rem.push(n)
    },
    _add: [],
    _rem: [],
    _fire: (n, ev) => (handlers[n] || []).forEach((f) => f(ev))
  }
  return el
}

const events = (x, y) => ({ clientX: x, clientY: y, pointerType: 'mouse', button: 0 })

const hasil = []
function cek(nama, lolos) {
  hasil.push(`${lolos ? 'PASS' : 'GAGAL'}  ${nama}`)
  if (!lolos) prosesGagal = true
}
let prosesGagal = false

async function jalan() {
  // 1. tahan 1,2 detik -> terbuka
  {
    const el = elemenPalsu()
    let dibuka = 0
    pasangPintuAdmin(el, () => { dibuka++ })
    el._fire('pointerdown', events(100, 100))
    await new Promise((r) => setTimeout(r, 1350))
    cek('tahan 1,2 detik membuka portal', dibuka === 1)
  }

  // 2. gerak jari melebihi radius -> tidak terbuka
  {
    const el = elemenPalsu()
    let dibuka = 0
    pasangPintuAdmin(el, () => { dibuka++ })
    el._fire('pointerdown', events(100, 100))
    el._fire('pointermove', events(300, 300))
    await new Promise((r) => setTimeout(r, 1350))
    cek('gerak melebihi radius membatalkan', dibuka === 0)
  }

  // 3. lepas jari sebelum 1,2 detik -> tidak terbuka
  {
    const el = elemenPalsu()
    let dibuka = 0
    pasangPintuAdmin(el, () => { dibuka++ })
    el._fire('pointerdown', events(100, 100))
    el._fire('pointerup', events(100, 100))
    await new Promise((r) => setTimeout(r, 1350))
    cek('lepas jari sebelum waktunya membatalkan', dibuka === 0)
  }

  // 4. sentuhan (touch) juga membuka
  {
    const el = elemenPalsu()
    let dibuka = 0
    pasangPintuAdmin(el, () => { dibuka++ })
    el._fire('touchstart', { touches: [{ clientX: 50, clientY: 50 }] })
    await new Promise((r) => setTimeout(r, 1350))
    cek('sentuhan tahan membuka portal', dibuka === 1)
  }

  // 5. semua listener dilepas saat cleanup
  {
    const el = elemenPalsu()
    const lepas = pasangPintuAdmin(el, () => {})
    lepas()
    const Urut = (a) => [...a].sort().join(',')
    const nama = (arr) => [...new Set(arr)].sort()
    cek('jumlah listener dilepas sesuai dipasang', el._add.length === el._rem.length && el._add.length > 0)
    cek('nama listener dilepas sama persis', Urut(nama(el._add)) === Urut(nama(el._rem)))
    cek('tidak ada listener tersisa', nama(el._add).every((n) => (el._rem.filter((x) => x === n).length === el._add.filter((x) => x === n).length)))
  }

  console.log(hasil.join('\n'))
  console.log(prosesGagal ? '\nHASIL: GAGAL' : '\nHASIL: SEMUA PASS')
  process.exit(prosesGagal ? 1 : 0)
}

jalan()
