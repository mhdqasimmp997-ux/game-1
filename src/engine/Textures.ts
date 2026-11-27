import * as THREE from 'three';

export interface ProceduralMaterialSet {
  asphalt: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  concreteBarrier: THREE.MeshStandardMaterial;
  terrainGrass: THREE.MeshStandardMaterial;
  brick: THREE.MeshStandardMaterial;
  stucco: THREE.MeshStandardMaterial;
  corrugatedMetal: THREE.MeshStandardMaterial;
  structuralSteel: THREE.MeshStandardMaterial;
  diamondPlate: THREE.MeshStandardMaterial;
  officeFloor: THREE.MeshStandardMaterial;
  woodPlank: THREE.MeshStandardMaterial;
  bark: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  water: THREE.MeshStandardMaterial;
  glass: THREE.MeshStandardMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  chrome: THREE.MeshStandardMaterial;
  brushedSteel: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
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

function makeNoiseBumpCanvas(size: number, contrast = 35, streakX = 1, streakY = 1): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);
  const count = size * 18;
  for (let i = 0; i < count; i++) {
    const v = 128 + Math.floor((Math.random() - 0.5) * contrast * 2);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, streakX, streakY);
  }
  return c;
}

export function createMaterialLibrary(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean,
  textureQuality: 'low' | 'medium' | 'high'
): ProceduralMaterialSet {
  const size = textureQuality === 'low' ? 256 : textureQuality === 'medium' ? 512 : 1024;
  const bumpSize = textureQuality === 'low' ? 256 : 512;
  const maxAniso = isSoftwareGl ? 1 : Math.min(8, renderer.capabilities.getMaxAnisotropy());

  // 1. Weathered Highway Asphalt + Micro-Aggregate Bump & Roughness Variation
  const [asphC, asphCtx] = makeCanvas(size, size);
  asphCtx.fillStyle = '#26292e';
  asphCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 24; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 28 + Math.floor(Math.random() * 34);
    asphCtx.fillStyle = `rgb(${v},${v + 1},${v + 3})`;
    asphCtx.fillRect(x, y, 2, 2);
  }
  // Subtle worn tire track sheen bands
  const trackGradL = asphCtx.createLinearGradient(size * 0.14, 0, size * 0.38, 0);
  trackGradL.addColorStop(0, 'rgba(12,13,15,0)');
  trackGradL.addColorStop(0.5, 'rgba(12,13,15,0.34)');
  trackGradL.addColorStop(1, 'rgba(12,13,15,0)');
  asphCtx.fillStyle = trackGradL;
  asphCtx.fillRect(size * 0.14, 0, size * 0.24, size);
  const trackGradR = asphCtx.createLinearGradient(size * 0.62, 0, size * 0.86, 0);
  trackGradR.addColorStop(0, 'rgba(12,13,15,0)');
  trackGradR.addColorStop(0.5, 'rgba(12,13,15,0.34)');
  trackGradR.addColorStop(1, 'rgba(12,13,15,0)');
  asphCtx.fillStyle = trackGradR;
  asphCtx.fillRect(size * 0.62, 0, size * 0.24, size);

  // Subtle tar crack lines
  asphCtx.strokeStyle = 'rgba(14,15,17,0.55)';
  asphCtx.lineWidth = Math.max(1, size / 256);
  for (let k = 0; k < 5; k++) {
    asphCtx.beginPath();
    let cx = Math.random() * size;
    let cy = Math.random() * size;
    asphCtx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += (Math.random() - 0.5) * size * 0.14;
      cy += Math.random() * size * 0.12;
      asphCtx.lineTo(cx, cy);
    }
    asphCtx.stroke();
  }

  // Crisp reflective yellow center dashes & crisp white shoulder stripes
  asphCtx.fillStyle = '#eab308';
  asphCtx.fillRect(size * 0.486, size * 0.06, size * 0.028, size * 0.37);
  asphCtx.fillRect(size * 0.486, size * 0.56, size * 0.028, size * 0.37);
  asphCtx.fillStyle = 'rgba(241, 245, 249, 0.85)';
  asphCtx.fillRect(size * 0.045, 0, size * 0.026, size);
  asphCtx.fillRect(size * 0.929, 0, size * 0.026, size);

  const asphBumpC = makeNoiseBumpCanvas(bumpSize, 52, 2, 2);
  const asphaltTex = finalizeTexture(asphC, true, 1, 1, maxAniso);
  const asphaltBump = finalizeTexture(asphBumpC, false, 1, 1, maxAniso);
  const asphalt = new THREE.MeshStandardMaterial({
    map: asphaltTex,
    bumpMap: asphaltBump,
    bumpScale: 0.045,
    roughness: 0.82,
    metalness: 0.06,
    envMapIntensity: 0.75,
  });

  // 2. Brushed Concrete Apron with Slab Expansion Joints & Oil Weathering
  const [concC, concCtx] = makeCanvas(size, size);
  const [concBC, concBCtx] = makeCanvas(bumpSize, bumpSize);
  concCtx.fillStyle = '#8b8f8c';
  concCtx.fillRect(0, 0, size, size);
  concBCtx.fillStyle = '#888888';
  concBCtx.fillRect(0, 0, bumpSize, bumpSize);
  for (let i = 0; i < size * 16; i++) {
    const v = 118 + Math.floor(Math.random() * 38);
    concCtx.fillStyle = `rgb(${v},${v + 1},${v - 2})`;
    concCtx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    const bv = 110 + Math.floor(Math.random() * 44);
    concBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    concBCtx.fillRect(Math.random() * bumpSize, Math.random() * bumpSize, 2, 2);
  }
  // Soft weathering stain patches
  for (let i = 0; i < 6; i++) {
    const rx = Math.random() * size;
    const ry = Math.random() * size;
    const rg = concCtx.createRadialGradient(rx, ry, 2, rx, ry, size * 0.14);
    rg.addColorStop(0, 'rgba(42, 44, 42, 0.16)');
    rg.addColorStop(1, 'rgba(42, 44, 42, 0)');
    concCtx.fillStyle = rg;
    concCtx.fillRect(0, 0, size, size);
  }
  concCtx.strokeStyle = 'rgba(45, 48, 46, 0.52)';
  concCtx.lineWidth = Math.max(2, size / 180);
  concCtx.strokeRect(1, 1, size - 2, size - 2);
  concCtx.beginPath();
  concCtx.moveTo(0, size / 2);
  concCtx.lineTo(size, size / 2);
  concCtx.moveTo(size / 2, 0);
  concCtx.lineTo(size / 2, size);
  concCtx.stroke();

  concBCtx.strokeStyle = '#303030';
  concBCtx.lineWidth = Math.max(2, bumpSize / 160);
  concBCtx.strokeRect(1, 1, bumpSize - 2, bumpSize - 2);
  concBCtx.beginPath();
  concBCtx.moveTo(0, bumpSize / 2);
  concBCtx.lineTo(bumpSize, bumpSize / 2);
  concBCtx.moveTo(bumpSize / 2, 0);
  concBCtx.lineTo(bumpSize / 2, bumpSize);
  concBCtx.stroke();

  const concreteTex = finalizeTexture(concC, true, 7, 7, maxAniso);
  const concreteBump = finalizeTexture(concBC, false, 7, 7, maxAniso);
  const concrete = new THREE.MeshStandardMaterial({
    map: concreteTex,
    bumpMap: concreteBump,
    bumpScale: 0.04,
    roughness: 0.88,
    metalness: 0.04,
  });

  const concreteBarrier = new THREE.MeshStandardMaterial({
    map: finalizeTexture(concC, true, 1, 1, maxAniso),
    bumpMap: finalizeTexture(concBC, false, 1, 1, maxAniso),
    bumpScale: 0.03,
    color: 0xd4d4d8,
    roughness: 0.85,
    metalness: 0.05,
  });

  // 3. Alpine Meadow Grass & Organic Soil Detail
  const [grC, grCtx] = makeCanvas(size, size);
  grCtx.fillStyle = '#425431';
  grCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 28; i++) {
    const g = 62 + Math.floor(Math.random() * 54);
    const r = Math.floor(g * 0.72 + (Math.random() - 0.5) * 12);
    const b = Math.floor(g * 0.44);
    grCtx.fillStyle = `rgb(${r},${g},${b})`;
    grCtx.fillRect(Math.random() * size, Math.random() * size, 2.5, 4.5);
  }
  const grassBumpC = makeNoiseBumpCanvas(bumpSize, 42, 2, 3);
  const terrainGrass = new THREE.MeshStandardMaterial({
    map: finalizeTexture(grC, true, 28, 28, maxAniso),
    bumpMap: finalizeTexture(grassBumpC, false, 28, 28, maxAniso),
    bumpScale: 0.08,
    vertexColors: true,
    roughness: 0.94,
    metalness: 0.02,
  });

  // 4. Weathered Checkpoint Masonry Brick with Recessed Mortar Bump
  const [brC, brCtx] = makeCanvas(size, size);
  const [brBC, brBCtx] = makeCanvas(bumpSize, bumpSize);
  brCtx.fillStyle = '#686259';
  brCtx.fillRect(0, 0, size, size);
  brBCtx.fillStyle = '#383838';
  brBCtx.fillRect(0, 0, bumpSize, bumpSize);
  const rows = 8;
  const cols = 4;
  const rh = size / rows;
  const cw = size / cols;
  const brh = bumpSize / rows;
  const bcw = bumpSize / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (cw * 0.5);
    const boff = (r % 2) * (bcw * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = 104 + Math.floor(Math.random() * 38);
      brCtx.fillStyle = `rgb(${shade},${Math.floor(shade * 0.47)},${Math.floor(shade * 0.36)})`;
      brCtx.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      const bVal = 190 + Math.floor(Math.random() * 45);
      brBCtx.fillStyle = `rgb(${bVal},${bVal},${bVal})`;
      brBCtx.fillRect(c * bcw + boff + 2, r * brh + 2, bcw - 4, brh - 4);
    }
  }
  const brick = new THREE.MeshStandardMaterial({
    map: finalizeTexture(brC, true, 3, 2, maxAniso),
    bumpMap: finalizeTexture(brBC, false, 3, 2, maxAniso),
    bumpScale: 0.05,
    roughness: 0.86,
    metalness: 0.03,
  });

  // 5. Architectural Stucco Wall
  const [stC, stCtx] = makeCanvas(size, size);
  stCtx.fillStyle = '#cfc9bc';
  stCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 12; i++) {
    const v = 186 + Math.floor(Math.random() * 36);
    stCtx.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    stCtx.fillRect(Math.random() * size, Math.random() * size, 2.5, 2.5);
  }
  const stucco = new THREE.MeshStandardMaterial({
    map: finalizeTexture(stC, true, 2, 2, maxAniso),
    bumpMap: finalizeTexture(makeNoiseBumpCanvas(bumpSize, 26, 2, 2), false, 2, 2, maxAniso),
    bumpScale: 0.025,
    roughness: 0.9,
    metalness: 0.02,
  });

  // 6. Corrugated Industrial Galvanized Steel
  const [mtC, mtCtx] = makeCanvas(size, size);
  const [mtBC, mtBCtx] = makeCanvas(bumpSize, bumpSize);
  mtCtx.fillStyle = '#5e6870';
  mtCtx.fillRect(0, 0, size, size);
  mtBCtx.fillStyle = '#808080';
  mtBCtx.fillRect(0, 0, bumpSize, bumpSize);
  const ribW = Math.max(8, size / 24);
  for (let x = 0; x < size; x += ribW) {
    mtCtx.fillStyle = 'rgba(255,255,255,0.14)';
    mtCtx.fillRect(x, 0, ribW * 0.35, size);
    mtCtx.fillStyle = 'rgba(0,0,0,0.22)';
    mtCtx.fillRect(x + ribW * 0.5, 0, ribW * 0.4, size);
  }
  const bRibW = Math.max(6, bumpSize / 24);
  for (let x = 0; x < bumpSize; x += bRibW) {
    mtBCtx.fillStyle = '#d4d4d4';
    mtBCtx.fillRect(x, 0, bRibW * 0.45, bumpSize);
    mtBCtx.fillStyle = '#404040';
    mtBCtx.fillRect(x + bRibW * 0.5, 0, bRibW * 0.45, bumpSize);
  }
  const corrugatedMetal = new THREE.MeshStandardMaterial({
    map: finalizeTexture(mtC, true, 2, 1, maxAniso),
    bumpMap: finalizeTexture(mtBC, false, 2, 1, maxAniso),
    bumpScale: 0.055,
    roughness: 0.36,
    metalness: 0.72,
    envMapIntensity: 1.15,
  });

  // 6b. Painted Structural Steel (Canopy Columns, Gantry & Trusses)
  const structuralSteel = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.34,
    metalness: 0.68,
    envMapIntensity: 1.1,
  });

  // 6c. Weighbridge Diamond-Plate Steel Deck
  const [dpC, dpCtx] = makeCanvas(bumpSize, bumpSize);
  dpCtx.fillStyle = '#475569';
  dpCtx.fillRect(0, 0, bumpSize, bumpSize);
  const [dpBC, dpBCtx] = makeCanvas(bumpSize, bumpSize);
  dpBCtx.fillStyle = '#707070';
  dpBCtx.fillRect(0, 0, bumpSize, bumpSize);
  const step = bumpSize / 8;
  for (let y = 0; y < bumpSize; y += step) {
    for (let x = 0; x < bumpSize; x += step) {
      dpCtx.fillStyle = 'rgba(203, 213, 225, 0.25)';
      dpCtx.fillRect(x + step * 0.2, y + step * 0.42, step * 0.55, step * 0.16);
      dpBCtx.fillStyle = '#e5e5e5';
      dpBCtx.fillRect(x + step * 0.2, y + step * 0.42, step * 0.55, step * 0.16);
    }
  }
  const diamondPlate = new THREE.MeshStandardMaterial({
    map: finalizeTexture(dpC, true, 4, 8, maxAniso),
    bumpMap: finalizeTexture(dpBC, false, 4, 8, maxAniso),
    bumpScale: 0.05,
    roughness: 0.42,
    metalness: 0.78,
    envMapIntensity: 1.0,
  });

  // 6d. Office Polished Terrazzo Tile Floor
  const [ofC, ofCtx] = makeCanvas(size, size);
  ofCtx.fillStyle = '#9ca3af';
  ofCtx.fillRect(0, 0, size, size);
  const tiles = 4;
  const ts = size / tiles;
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const shade = (tx + ty) % 2 === 0 ? 158 : 144;
      ofCtx.fillStyle = `rgb(${shade},${shade - 2},${shade - 6})`;
      ofCtx.fillRect(tx * ts + 2, ty * ts + 2, ts - 4, ts - 4);
    }
  }
  const officeFloor = new THREE.MeshStandardMaterial({
    map: finalizeTexture(ofC, true, 4, 4, maxAniso),
    roughness: 0.32,
    metalness: 0.08,
    envMapIntensity: 0.85,
  });

  // 7. Timber / Wood Plank with Grain & Bump
  const [wdC, wdCtx] = makeCanvas(size, size);
  const [wdBC, wdBCtx] = makeCanvas(bumpSize, bumpSize);
  wdCtx.fillStyle = '#6d4c33';
  wdCtx.fillRect(0, 0, size, size);
  wdBCtx.fillStyle = '#9a9a9a';
  wdBCtx.fillRect(0, 0, bumpSize, bumpSize);
  const planks = 6;
  for (let p = 0; p < planks; p++) {
    const y = (p / planks) * size;
    const by = (p / planks) * bumpSize;
    wdCtx.fillStyle = 'rgba(28,16,8,0.52)';
    wdCtx.fillRect(0, y, size, 3);
    wdBCtx.fillStyle = '#333333';
    wdBCtx.fillRect(0, by, bumpSize, 2);
    for (let i = 0; i < 42; i++) {
      wdCtx.fillStyle = i % 2 === 0 ? 'rgba(98,66,42,0.34)' : 'rgba(52,32,18,0.22)';
      wdCtx.fillRect(0, y + Math.random() * (size / planks), size, 1.5);
    }
  }
  const woodPlank = new THREE.MeshStandardMaterial({
    map: finalizeTexture(wdC, true, 2, 2, maxAniso),
    bumpMap: finalizeTexture(wdBC, false, 2, 2, maxAniso),
    bumpScale: 0.035,
    roughness: 0.72,
    metalness: 0.04,
  });

  // 7b. Pine Bark
  const bark = new THREE.MeshStandardMaterial({
    color: 0x4b3525,
    bumpMap: finalizeTexture(makeNoiseBumpCanvas(bumpSize, 55, 1, 5), false, 2, 4, maxAniso),
    bumpScale: 0.06,
    roughness: 0.95,
    metalness: 0.02,
  });

  // 8. Hazard Barrier Stripe (Yellow/Black)
  const [hzC, hzCtx] = makeCanvas(256, 64);
  hzCtx.fillStyle = '#f59e0b';
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
  const hazardStripe = new THREE.MeshStandardMaterial({
    map: finalizeTexture(hzC, true, 3, 1, maxAniso),
    roughness: 0.42,
    metalness: 0.25,
    envMapIntensity: 0.9,
  });

  // 9. Reflective Water
  const water = new THREE.MeshStandardMaterial({
    color: 0x164e63,
    roughness: 0.08,
    metalness: 0.35,
    transparent: true,
    opacity: 0.86,
    envMapIntensity: 1.5,
  });

  // 10. Automotive Tinted Glass (strong sky/environment reflections!)
  const glass = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    metalness: 0.22,
    roughness: 0.05,
    transparent: true,
    opacity: isSoftwareGl ? 0.42 : 0.48,
    envMapIntensity: 1.75,
  });

  // 10b. Architectural Window Glass
  const windowGlass = new THREE.MeshStandardMaterial({
    color: 0xbae6fd,
    metalness: 0.18,
    roughness: 0.06,
    transparent: true,
    opacity: 0.36,
    envMapIntensity: 1.6,
  });

  // 11. Brushed Chrome & Stainless Steel
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xe4e4e7,
    metalness: 0.95,
    roughness: 0.14,
    envMapIntensity: 1.45,
  });

  const brushedSteel = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.88,
    roughness: 0.26,
    envMapIntensity: 1.2,
  });

  // 12. Tire Rubber with Sidewall & Tread Detail
  const rubber = new THREE.MeshStandardMaterial({
    color: 0x191a1d,
    bumpMap: finalizeTexture(makeNoiseBumpCanvas(256, 36, 3, 1), false, 3, 1, maxAniso),
    bumpScale: 0.025,
    roughness: 0.86,
    metalness: 0.05,
  });

  // 13. Soft Radial Contact Shadow Plane (prevents floating cars & characters)
  const [csC, csCtx] = makeCanvas(128, 128);
  const csGrad = csCtx.createRadialGradient(64, 64, 10, 64, 64, 62);
  csGrad.addColorStop(0, 'rgba(0,0,0,0.72)');
  csGrad.addColorStop(0.55, 'rgba(0,0,0,0.42)');
  csGrad.addColorStop(1, 'rgba(0,0,0,0)');
  csCtx.fillStyle = csGrad;
  csCtx.fillRect(0, 0, 128, 128);
  const csTex = new THREE.CanvasTexture(csC);
  csTex.colorSpace = THREE.SRGBColorSpace;
  const contactShadow = new THREE.MeshBasicMaterial({
    map: csTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  return {
    asphalt,
    concrete,
    concreteBarrier,
    terrainGrass,
    brick,
    stucco,
    corrugatedMetal,
    structuralSteel,
    diamondPlate,
    officeFloor,
    woodPlank,
    bark,
    hazardStripe,
    water,
    glass,
    windowGlass,
    chrome,
    brushedSteel,
    rubber,
    contactShadow,
  };
}
