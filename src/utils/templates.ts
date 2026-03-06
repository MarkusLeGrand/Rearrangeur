import type { Point, TemplateShape, TemplateParams, TemplateHandle, TemplateResult } from '../types';

/** Generate template contour + handles from params. Area is in cm². */
export function generateTemplate(params: TemplateParams): TemplateResult {
  switch (params.shape) {
    case 'rectangle': return genRectangle(params);
    case 'L': return genL(params);
    case 'T': return genT(params);
    case 'U': return genU(params);
  }
}

/** Default initial params for a shape given target area (cm²) */
export function defaultTemplateParams(shape: TemplateShape, areaCm2: number): TemplateParams {
  switch (shape) {
    case 'rectangle': {
      const w = Math.sqrt(areaCm2 * 1.2);
      return { shape, targetArea: areaCm2, values: { width: Math.round(w / 50) * 50 } };
    }
    case 'L': {
      const side = Math.sqrt(areaCm2);
      const mainW = Math.round((side * 1.2) / 50) * 50;
      const mainH = Math.round((side * 1.0) / 50) * 50;
      const cutoutW = Math.round((mainW * 0.4) / 50) * 50;
      return { shape, targetArea: areaCm2, values: { mainW, mainH, cutoutW } };
    }
    case 'T': {
      const side = Math.sqrt(areaCm2);
      const totalW = Math.round((side * 1.4) / 50) * 50;
      const barH = Math.round((side * 0.35) / 50) * 50;
      const stemW = Math.round((side * 0.5) / 50) * 50;
      return { shape, targetArea: areaCm2, values: { totalW, barH, stemW } };
    }
    case 'U': {
      const side = Math.sqrt(areaCm2);
      const totalW = Math.round((side * 1.3) / 50) * 50;
      const wingW = Math.round((side * 0.3) / 50) * 50;
      const wingH = Math.round((side * 0.6) / 50) * 50;
      return { shape, targetArea: areaCm2, values: { totalW, wingW, wingH } };
    }
  }
}

// ── Rectangle: h = area / w ──

function genRectangle(params: TemplateParams): TemplateResult {
  const { targetArea, values } = params;
  const w = Math.max(100, values.width || 400);
  const h = Math.round(targetArea / w);
  const contour: Point[] = [
    { x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h },
  ];
  const handles: TemplateHandle[] = [
    { id: 'width', paramKey: 'width', position: { x: w, y: h / 2 }, axis: 'x', min: 100, max: 1500 },
  ];
  return { contour, handles };
}

// ── L-shape: cutoutH = (mainW*mainH - area) / cutoutW ──
//
//  ┌───────────┐
//  │           │ mainH
//  │     ┌─────┘
//  │     │ cutoutH
//  └─────┘
//  mainW

function genL(params: TemplateParams): TemplateResult {
  const { targetArea, values } = params;
  const mainW = Math.max(200, values.mainW || 500);
  const mainH = Math.max(200, values.mainH || 400);
  const cutoutW = Math.max(50, Math.min(mainW - 50, values.cutoutW || 200));
  const cutoutH = Math.round(Math.max(0, (mainW * mainH - targetArea) / cutoutW));
  const clampedCutoutH = Math.min(mainH - 50, Math.max(0, cutoutH));

  const contour: Point[] = [
    { x: 0, y: 0 },
    { x: mainW, y: 0 },
    { x: mainW, y: mainH - clampedCutoutH },
    { x: mainW - cutoutW, y: mainH - clampedCutoutH },
    { x: mainW - cutoutW, y: mainH },
    { x: 0, y: mainH },
  ];
  const handles: TemplateHandle[] = [
    { id: 'mainW', paramKey: 'mainW', position: { x: mainW, y: mainH / 2 }, axis: 'x', min: 200, max: 1500 },
    { id: 'mainH', paramKey: 'mainH', position: { x: mainW / 2, y: mainH }, axis: 'y', min: 200, max: 1500 },
    { id: 'cutoutW', paramKey: 'cutoutW', position: { x: mainW - cutoutW, y: mainH - clampedCutoutH / 2 }, axis: 'x', min: 50, max: mainW - 50 },
  ];
  return { contour, handles };
}

// ── T-shape: stemH = (area - totalW*barH) / stemW ──
//
//  ┌─────────────┐
//  │    barH      │ totalW
//  └──┬─────┬────┘
//     │stemW│
//     │     │ stemH
//     └─────┘

function genT(params: TemplateParams): TemplateResult {
  const { targetArea, values } = params;
  const totalW = Math.max(200, values.totalW || 600);
  const barH = Math.max(50, values.barH || 150);
  const stemW = Math.max(50, Math.min(totalW - 50, values.stemW || 200));
  const stemH = Math.round(Math.max(50, (targetArea - totalW * barH) / stemW));
  const stemX = Math.round((totalW - stemW) / 2);

  const contour: Point[] = [
    { x: 0, y: 0 },
    { x: totalW, y: 0 },
    { x: totalW, y: barH },
    { x: stemX + stemW, y: barH },
    { x: stemX + stemW, y: barH + stemH },
    { x: stemX, y: barH + stemH },
    { x: stemX, y: barH },
    { x: 0, y: barH },
  ];
  const handles: TemplateHandle[] = [
    { id: 'totalW', paramKey: 'totalW', position: { x: totalW, y: barH / 2 }, axis: 'x', min: 200, max: 1500 },
    { id: 'barH', paramKey: 'barH', position: { x: totalW / 2, y: barH }, axis: 'y', min: 50, max: 800 },
    { id: 'stemW', paramKey: 'stemW', position: { x: stemX + stemW, y: barH + stemH / 2 }, axis: 'x', min: 50, max: totalW - 50 },
  ];
  return { contour, handles };
}

// ── U-shape: bottomH = (area - 2*wingW*wingH) / totalW ──
//
//  ┌──┐     ┌──┐
//  │wW│     │wW│ wingH
//  │  └─────┘  │
//  │  bottomH  │ totalW
//  └───────────┘

function genU(params: TemplateParams): TemplateResult {
  const { targetArea, values } = params;
  const totalW = Math.max(200, values.totalW || 500);
  const wingW = Math.max(50, Math.min((totalW - 50) / 2, values.wingW || 150));
  const wingH = Math.max(50, values.wingH || 250);
  const bottomH = Math.round(Math.max(50, (targetArea - 2 * wingW * wingH) / totalW));
  const innerLeft = wingW;
  const innerRight = totalW - wingW;

  const contour: Point[] = [
    { x: 0, y: 0 },
    { x: wingW, y: 0 },
    { x: wingW, y: wingH },
    { x: innerRight, y: wingH },
    { x: innerRight, y: 0 },
    { x: totalW, y: 0 },
    { x: totalW, y: wingH + bottomH },
    { x: 0, y: wingH + bottomH },
  ];
  const handles: TemplateHandle[] = [
    { id: 'totalW', paramKey: 'totalW', position: { x: totalW, y: (wingH + bottomH) / 2 }, axis: 'x', min: 200, max: 1500 },
    { id: 'wingW', paramKey: 'wingW', position: { x: wingW, y: wingH / 2 }, axis: 'x', min: 50, max: (totalW - 50) / 2 },
    { id: 'wingH', paramKey: 'wingH', position: { x: innerLeft + (innerRight - innerLeft) / 2, y: wingH }, axis: 'y', min: 50, max: 1200 },
  ];
  return { contour, handles };
}
