import * as THREE from 'three';

export interface ProceduralMaterialSet {
  asphalt: THREE.MeshStandardMaterial;
  concrete: THREE.MeshLambertMaterial;
  terrainGrass: THREE.MeshLambertMaterial;
  brick: THREE.MeshLambertMaterial;
  stucco: THREE.MeshLambertMaterial;
  corrugatedMetal: THREE.MeshStandardMaterial;
  woodPlank: THREE.MeshLambertMaterial;
  hazardStripe: THREE.MeshLambertMaterial;
  water: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  rubber: THREE.MeshLambertMaterial;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  repeatX: number,
  repeatY: number,
  maxAniso: number
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = maxAniso;
  tex.needsUpdate = true;
  return tex;
}

export function createMaterialLibrary(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  textureQuality: 'low' | 'medium' | 'high'
): ProceduralMaterialSet {
  const size = textureQuality === 'low' ? 256 : 512;
  const maxAniso = isSoftwareGl ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());

  // 1. Weathered Asphalt
  const [asphC, asphCtx] = makeCanvas(size, size);
  asphCtx.fillStyle = '#2b2d30';
  asphCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 16; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 32 + Math.floor(Math.random() * 28);
    asphCtx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    asphCtx.fillRect(x, y, 2, 2);
  }
  asphCtx.fillStyle = 'rgba(20, 20, 22, 0.28)';
  asphCtx.fillRect(size * 0.18, 0, size * 0.14, size);
  asphCtx.fillRect(size * 0.68, 0, size * 0.14, size);
  asphCtx.fillStyle = '#d4a72c';
  asphCtx.fillRect(size * 0.485, size * 0.08, size * 0.03, size * 0.36);
  asphCtx.fillRect(size * 0.485, size * 0.58, size * 0.03, size * 0.36);
  asphCtx.fillStyle = 'rgba(235, 235, 230, 0.72)';
  asphCtx.fillRect(size * 0.05, 0, size * 0.025, size);
  asphCtx.fillRect(size * 0.925, 0, size * 0.025, size);

  const asphaltTex = finalizeTexture(asphC, true, 1, 1, maxAniso);
  const asphalt = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    roughness: 0.88,
    metalness: 0.04,
  });

  // 2. Brushed Concrete (Lambert for high FPS on integrated GPUs)
  const [concC, concCtx] = makeCanvas(size, size);
  concCtx.fillStyle = '#8b8d8a';
  concCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 10; i++) {
    const v = 115 + Math.floor(Math.random() * 40);
    concCtx.fillStyle = `rgb(${v},${v},${v - 2})`;
    concCtx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  concCtx.strokeStyle = 'rgba(60, 62, 60, 0.45)';
  concCtx.lineWidth = 2;
  concCtx.strokeRect(1, 1, size - 2, size - 2);
  concCtx.beginPath();
  concCtx.moveTo(0, size / 2);
  concCtx.lineTo(size, size / 2);
  concCtx.moveTo(size / 2, 0);
  concCtx.lineTo(size / 2, size);
  concCtx.stroke();
  const concreteTex = finalizeTexture(concC, true, 6, 6, maxAniso);
  const concrete = new THREE.MeshLambertMaterial({ map: concreteTex });

  // 3. Alpine Grass / Soil
  const [grC, grCtx] = makeCanvas(size, size);
  grCtx.fillStyle = '#435334';
  grCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 16; i++) {
    const g = 65 + Math.floor(Math.random() * 48);
    const r = Math.floor(g * 0.72);
    const b = Math.floor(g * 0.48);
    grCtx.fillStyle = `rgb(${r},${g},${b})`;
    grCtx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }
  const grassTex = finalizeTexture(grC, true, 24, 24, maxAniso);
  const terrainGrass = new THREE.MeshLambertMaterial({
    map: grassTex,
    vertexColors: true,
  });

  // 4. Weathered Brick
  const [brC, brCtx] = makeCanvas(size, size);
  brCtx.fillStyle = '#736c64';
  brCtx.fillRect(0, 0, size, size);
  const rows = 8;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 110 + Math.floor(Math.random() * 35);
      brCtx.fillStyle = `rgb(${shade},${Math.floor(shade * 0.48)},${Math.floor(shade * 0.38)})`;
      brCtx.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
    }
  }
  const brickTex = finalizeTexture(brC, true, 3, 2, maxAniso);
  const brick = new THREE.MeshLambertMaterial({ map: brickTex });

  // 5. Stucco Wall
  const [stC, stCtx] = makeCanvas(size, size);
  stCtx.fillStyle = '#cdc7ba';
  stCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 8; i++) {
    const v = 185 + Math.floor(Math.random() * 35);
    stCtx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    stCtx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  const stuccoTex = finalizeTexture(stC, true, 2, 2, maxAniso);
  const stucco = new THREE.MeshLambertMaterial({ map: stuccoTex });

  // 6. Corrugated Industrial Metal
  const [mtC, mtCtx] = makeCanvas(size, size);
  mtCtx.fillStyle = '#5a636a';
  mtCtx.fillRect(0, 0, size, size);
  for (let x = 0; x < size; x += 12) {
    mtCtx.fillStyle = 'rgba(255,255,255,0.12)';
    mtCtx.fillRect(x, 0, 4, size);
    mtCtx.fillStyle = 'rgba(0,0,0,0.2)';
    mtCtx.fillRect(x + 6, 0, 5, size);
  }
  const metalTex = finalizeTexture(mtC, true, 2, 1, maxAniso);
  const corrugatedMetal = new THREE.MeshStandardMaterial({
    map: metalTex,
    roughness: 0.48,
    metalness: 0.62,
  });

  // 7. Timber / Wood Plank
  const [wdC, wdCtx] = makeCanvas(size, size);
  wdCtx.fillStyle = '#6c4d35';
  wdCtx.fillRect(0, 0, size, size);
  for (let y = 0; y < size; y += size / 6) {
    wdCtx.fillStyle = 'rgba(30,18,10,0.45)';
    wdCtx.fillRect(0, y, size, 2);
    for (let i = 0; i < 32; i++) {
      wdCtx.fillStyle = 'rgba(90,62,40,0.35)';
      wdCtx.fillRect(0, y + Math.random() * (size / 6), size, 1.5);
    }
  }
  const woodTex = finalizeTexture(wdC, true, 2, 2, maxAniso);
  const woodPlank = new THREE.MeshLambertMaterial({ map: woodTex });

  // 8. Hazard Barrier Stripe (Yellow/Black)
  const [hzC, hzCtx] = makeCanvas(256, 64);
  hzCtx.fillStyle = '#eab308';
  hzCtx.fillRect(0, 0, 256, 64);
  hzCtx.fillStyle = '#18181b';
  for (let x = -64; x < 320; x += 44) {
    hzCtx.beginPath();
    hzCtx.moveTo(x, 0);
    hzCtx.lineTo(x + 22, 0);
    hzCtx.lineTo(x + 54, 64);
    hzCtx.lineTo(x + 32, 64);
    hzCtx.closePath();
    hzCtx.fill();
  }
  const hazardTex = finalizeTexture(hzC, true, 3, 1, maxAniso);
  const hazardStripe = new THREE.MeshLambertMaterial({ map: hazardTex });

  // 9. Lightweight River Water
  const water = new THREE.MeshStandardMaterial({
    color: 0x1d4d5e,
    roughness: 0.18,
    metalness: 0.15,
    transparent: true,
    opacity: 0.85,
  });

  // 10. Lightweight Optical Glass (no costly PhysicalMaterial clearcoat/IOR)
  const glass = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    metalness: 0.12,
    roughness: 0.1,
    transparent: true,
    opacity: isSoftwareGl ? 0.38 : 0.42,
  });

  // 11. Brushed Chrome
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    metalness: 0.85,
    roughness: 0.22,
  });

  // 12. Tire Rubber
  const rubber = new THREE.MeshLambertMaterial({
    color: 0x1c1c1e,
  });

  return {
    asphalt,
    concrete,
    terrainGrass,
    brick,
    stucco,
    corrugatedMetal,
    woodPlank,
    hazardStripe,
    water,
    glass,
    chrome,
    rubber,
  };
}
