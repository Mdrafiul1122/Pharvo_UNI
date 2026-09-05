/**
 * PC / Strip / Box unit helpers.
 *
 * Stock is stored in the database as a single number of PCs
 * (`stock_quantity`). These helpers convert between PCs and pharmacy packs
 * using each product's configured conversions (`pcs_per_strip`,
 * `strips_per_box`, `pcs_per_box`), mirroring the backend logic.
 */

const LABELS = {
  box: { singular: "Box", plural: "Boxes", short: "Bx" },
  strip: { singular: "Strip", plural: "Strips", short: "Str" },
  pc: { singular: "PC", plural: "PCs", short: "Pc" },
};

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * @param {object} product - product from the API
 * @returns {{pcsPerStrip: number|null, stripsPerBox: number|null, pcsPerBox: number|null}}
 */
export function packConfig(product) {
  return {
    pcsPerStrip: num(product?.pcs_per_strip),
    stripsPerBox: num(product?.strips_per_box),
    pcsPerBox: num(product?.pcs_per_box),
  };
}

/** How many PCs one selling unit contains (null when not configured). */
export function unitsInPack(product, unit) {
  if (unit === "strip") return packConfig(product).pcsPerStrip;
  if (unit === "box") {
    const cfg = packConfig(product);
    return cfg.pcsPerBox ?? null;
  }
  if (unit === "pc") return 1;
  return null;
}

/**
 * Split a PC count into whole boxes/strips plus loose PCs.
 * boxes*pcs_per_box + strips*pcs_per_strip + pcs === totalPcs (always).
 */
export function packBreakdown(totalPcs, product) {
  const cfg = packConfig(product);
  let remaining = Math.max(Number(totalPcs) || 0, 0);
  let boxes = 0;
  let strips = 0;
  if (cfg.pcsPerBox) {
    boxes = Math.floor(remaining / cfg.pcsPerBox);
    remaining -= boxes * cfg.pcsPerBox;
  }
  if (cfg.pcsPerStrip) {
    strips = Math.floor(remaining / cfg.pcsPerStrip);
    remaining -= strips * cfg.pcsPerStrip;
  }
  return { boxes, strips, pcs: remaining };
}

/** "3 Boxes + 1 Strip + 3 PCs" (zero components omitted). */
export function formatBreakdown(totalPcs, product) {
  const { boxes, strips, pcs } = packBreakdown(totalPcs, product);
  const parts = [];
  if (boxes > 0) parts.push(`${boxes} ${boxes === 1 ? "Box" : "Boxes"}`);
  if (strips > 0) parts.push(`${strips} ${strips === 1 ? "Strip" : "Strips"}`);
  if (pcs > 0 || parts.length === 0)
    parts.push(`${pcs} ${pcs === 1 ? "PC" : "PCs"}`);
  return parts.join(" + ");
}

/** Compact variant for tight table cells: "3Bx + 1Str + 3Pc". */
export function formatBreakdownShort(totalPcs, product) {
  const { boxes, strips, pcs } = packBreakdown(totalPcs, product);
  const parts = [];
  if (boxes > 0) parts.push(`${boxes}${LABELS.box.short}`);
  if (strips > 0) parts.push(`${strips}${LABELS.strip.short}`);
  if (pcs > 0 || parts.length === 0) parts.push(`${pcs}${LABELS.pc.short}`);
  return parts.join("+");
}

/** Strip/box equivalents of a PC count: "12 Strips / 120 PCs". */
export function formatEquivalents(totalPcs, product) {
  const total = Math.max(Number(totalPcs) || 0, 0);
  const cfg = packConfig(product);
  const parts = [];
  if (cfg.pcsPerStrip)
    parts.push(
      `${Math.floor(total / cfg.pcsPerStrip)} ${
        Math.floor(total / cfg.pcsPerStrip) === 1 ? "Strip" : "Strips"
      }`
    );
  parts.push(`${total} ${total === 1 ? "PC" : "PCs"}`);
  return parts.join(" / ");
}
