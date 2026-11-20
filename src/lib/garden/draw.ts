// Garden Defence's drawing: everything is drawn in code on the canvas, in cells
// of `c` pixels. Goofy, friendly zombies: no gore, and they nod off when beaten.
import type { PlantKind, Zombie, ZombieKind } from './garden.ts';

type Ctx = CanvasRenderingContext2D;
const INK = '#203018';
const TAU = Math.PI * 2;

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, line = true) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, TAU);
	ctx.fillStyle = fill;
	ctx.fill();
	if (line) ctx.stroke();
}

function blob(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string) {
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
	ctx.fillStyle = fill;
	ctx.fill();
	ctx.stroke();
}

function eyes(ctx: Ctx, x: number, y: number, s: number, sleepy = false) {
	for (const dx of [-1, 1]) {
		if (sleepy) {
			ctx.beginPath();
			ctx.arc(x + dx * s * 0.09, y, s * 0.04, 0, Math.PI);
			ctx.stroke();
			continue;
		}
		circle(ctx, x + dx * s * 0.09, y, s * 0.06, '#fff');
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.arc(x + dx * s * 0.09, y + s * 0.015, s * 0.028, 0, TAU);
		ctx.fill();
	}
}

function smile(ctx: Ctx, x: number, y: number, s: number) {
	ctx.beginPath();
	ctx.arc(x, y, s * 0.07, 0.15 * Math.PI, 0.85 * Math.PI);
	ctx.stroke();
}

/** A plant filling a cell of size s whose top left is (x, y). `t` is seconds, for a sway. */
export function drawPlant(ctx: Ctx, kind: PlantKind, x: number, y: number, s: number, t = 0) {
	const cx = x + s / 2;
	const cy = y + s / 2;
	ctx.save();
	ctx.lineWidth = Math.max(1.5, s * 0.03);
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	const sway = Math.sin(t * 2 + x * 0.05) * s * 0.02;
	switch (kind) {
		case 'hive': {
			// A domed straw hive with bands, and a bee buzzing round.
			const w = s * 0.32;
			ctx.fillStyle = '#e8a83a';
			ctx.beginPath();
			ctx.moveTo(cx - w, cy + s * 0.3);
			ctx.quadraticCurveTo(cx - w * 1.15, cy - s * 0.3, cx, cy - s * 0.32);
			ctx.quadraticCurveTo(cx + w * 1.15, cy - s * 0.3, cx + w, cy + s * 0.3);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			for (const k of [-0.12, 0.04, 0.18]) {
				ctx.beginPath();
				ctx.moveTo(cx - w * 0.95, cy + s * k);
				ctx.lineTo(cx + w * 0.95, cy + s * k);
				ctx.stroke();
			}
			circle(ctx, cx, cy + s * 0.22, s * 0.06, '#4a2e10');
			const bx = cx + Math.cos(t * 3) * s * 0.36;
			const by = cy - s * 0.2 + Math.sin(t * 6) * s * 0.08;
			blob(ctx, bx, by, s * 0.07, s * 0.05, '#ffd400');
			ctx.beginPath();
			ctx.moveTo(bx, by - s * 0.05);
			ctx.lineTo(bx, by + s * 0.05);
			ctx.stroke();
			break;
		}
		case 'tomato': {
			// A vine with a big red tomato for a face.
			ctx.fillStyle = '#3f9b3a';
			for (const dx of [-1, 1]) {
				blob(ctx, cx + dx * s * 0.22, cy + s * 0.28, s * 0.14, s * 0.07, '#3f9b3a');
			}
			blob(ctx, cx + sway, cy + s * 0.02, s * 0.27, s * 0.25, '#e8402f');
			ctx.fillStyle = '#3f9b3a';
			ctx.beginPath();
			for (let i = 0; i < 5; i++) {
				const a = (i / 5) * TAU - Math.PI / 2;
				ctx.lineTo(cx + sway + Math.cos(a) * s * 0.12, cy - s * 0.2 + Math.sin(a) * s * 0.06);
				ctx.lineTo(
					cx + sway + Math.cos(a + 0.6) * s * 0.03,
					cy - s * 0.2 + Math.sin(a + 0.6) * s * 0.02
				);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
			eyes(ctx, cx + sway, cy, s);
			ctx.lineWidth = Math.max(1, s * 0.025);
			ctx.beginPath();
			ctx.ellipse(cx + sway, cy + s * 0.12, s * 0.05, s * 0.04, 0, 0, TAU);
			ctx.fillStyle = INK;
			ctx.fill();
			break;
		}
		case 'pumpkin': {
			const w = s * 0.42;
			for (const [dx, k] of [
				[-0.5, 0.55],
				[0.5, 0.55],
				[0, 0.6]
			]) {
				blob(ctx, cx + dx * w, cy + s * 0.06, w * k, s * 0.32, '#f28c1e');
			}
			ctx.fillStyle = '#5b8a2b';
			ctx.fillRect(cx - s * 0.04, cy - s * 0.36, s * 0.08, s * 0.12);
			ctx.strokeRect(cx - s * 0.04, cy - s * 0.36, s * 0.08, s * 0.12);
			eyes(ctx, cx, cy, s);
			smile(ctx, cx, cy + s * 0.1, s);
			break;
		}
		case 'onion': {
			ctx.fillStyle = '#c69be0';
			ctx.beginPath();
			ctx.moveTo(cx + sway, cy - s * 0.4);
			ctx.bezierCurveTo(
				cx + s * 0.05,
				cy - s * 0.2,
				cx + s * 0.36,
				cy - s * 0.05,
				cx + s * 0.3,
				cy + s * 0.18
			);
			ctx.quadraticCurveTo(cx + s * 0.24, cy + s * 0.36, cx, cy + s * 0.36);
			ctx.quadraticCurveTo(cx - s * 0.24, cy + s * 0.36, cx - s * 0.3, cy + s * 0.18);
			ctx.bezierCurveTo(
				cx - s * 0.36,
				cy - s * 0.05,
				cx - s * 0.05,
				cy - s * 0.2,
				cx + sway,
				cy - s * 0.4
			);
			ctx.fill();
			ctx.stroke();
			eyes(ctx, cx, cy + s * 0.06, s);
			smile(ctx, cx, cy + s * 0.15, s);
			// Smelly wiggles.
			ctx.strokeStyle = 'rgb(140 200 60 / 0.8)';
			for (const dx of [-0.3, 0.3]) {
				ctx.beginPath();
				for (let i = 0; i <= 6; i++) {
					const yy = cy - s * 0.1 - i * s * 0.05;
					const xx = cx + dx * s + Math.sin(t * 4 + i) * s * 0.03;
					if (i) ctx.lineTo(xx, yy);
					else ctx.moveTo(xx, yy);
				}
				ctx.stroke();
			}
			break;
		}
		case 'chilli': {
			const shake = Math.sin(t * 40) * s * 0.02;
			ctx.fillStyle = '#e5281b';
			ctx.beginPath();
			ctx.moveTo(cx - s * 0.1 + shake, cy - s * 0.28);
			ctx.quadraticCurveTo(
				cx + s * 0.25 + shake,
				cy - s * 0.25,
				cx + s * 0.12 + shake,
				cy + s * 0.1
			);
			ctx.quadraticCurveTo(cx + shake, cy + s * 0.36, cx - s * 0.2 + shake, cy + s * 0.38);
			ctx.quadraticCurveTo(cx - s * 0.1 + shake, cy + s * 0.1, cx - s * 0.1 + shake, cy - s * 0.28);
			ctx.fill();
			ctx.stroke();
			ctx.fillStyle = '#3f9b3a';
			ctx.fillRect(cx - s * 0.16 + shake, cy - s * 0.38, s * 0.12, s * 0.1);
			ctx.strokeRect(cx - s * 0.16 + shake, cy - s * 0.38, s * 0.12, s * 0.1);
			eyes(ctx, cx + s * 0.02 + shake, cy - s * 0.1, s * 0.8);
			break;
		}
	}
	ctx.restore();
}

const SHIRTS: Record<ZombieKind, string> = {
	walker: '#5b7bd6',
	bucket: '#a05bd6',
	runner: '#e0702a',
	big: '#7a5236'
};

/**
 * A zombie standing at (cx, cy), the middle of its cell, facing down the lawn.
 * Drawn front on: arms out, wobbling as it shuffles.
 */
export function drawZombie(
	ctx: Ctx,
	z: Pick<Zombie, 'kind' | 'eating' | 'hit'>,
	cx: number,
	cy: number,
	c: number,
	t: number,
	asleep = false
) {
	const s = z.kind === 'big' ? c * 1.35 : z.kind === 'runner' ? c * 0.85 : c;
	ctx.save();
	ctx.translate(cx, cy);
	if (asleep) ctx.rotate(Math.PI / 2);
	else ctx.rotate(Math.sin(t * (z.kind === 'runner' ? 12 : 5)) * 0.08);
	ctx.lineWidth = Math.max(1.5, c * 0.03);
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	const skin = z.hit < 0.12 ? '#f4ffe0' : '#8fd06b';
	// Shadow.
	ctx.fillStyle = 'rgb(0 0 0 / 0.15)';
	ctx.beginPath();
	ctx.ellipse(0, s * 0.38, s * 0.26, s * 0.07, 0, 0, TAU);
	ctx.fill();
	// Arms, out in front (munching moves them up and down).
	const munch = z.eating ? Math.sin(t * 14) * s * 0.05 : 0;
	for (const dx of [-1, 1]) {
		ctx.fillStyle = skin;
		ctx.beginPath();
		ctx.roundRect(dx * s * 0.26 - s * 0.06, s * 0.0 + munch * dx, s * 0.12, s * 0.3, s * 0.05);
		ctx.fill();
		ctx.stroke();
	}
	// Body and head.
	ctx.fillStyle = SHIRTS[z.kind];
	ctx.beginPath();
	ctx.roundRect(-s * 0.2, -s * 0.02, s * 0.4, s * 0.38, s * 0.08);
	ctx.fill();
	ctx.stroke();
	blob(ctx, 0, -s * 0.18, s * 0.22, s * 0.2, skin);
	eyes(ctx, 0, -s * 0.2, s, asleep);
	// A silly open mouth, or zzz when asleep.
	if (!asleep) {
		ctx.fillStyle = INK;
		ctx.beginPath();
		ctx.ellipse(0, -s * 0.07, s * 0.05, z.eating ? s * 0.05 : s * 0.025, 0, 0, TAU);
		ctx.fill();
	}
	if (z.kind === 'bucket') {
		ctx.fillStyle = '#b8c2cc';
		ctx.beginPath();
		ctx.moveTo(-s * 0.2, -s * 0.28);
		ctx.lineTo(-s * 0.16, -s * 0.46);
		ctx.lineTo(s * 0.16, -s * 0.46);
		ctx.lineTo(s * 0.2, -s * 0.28);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else if (z.kind === 'runner') {
		ctx.fillStyle = '#ff4f7b';
		ctx.fillRect(-s * 0.21, -s * 0.33, s * 0.42, s * 0.06);
		ctx.strokeRect(-s * 0.21, -s * 0.33, s * 0.42, s * 0.06);
	} else if (z.kind === 'big') {
		// A tiny party hat.
		ctx.fillStyle = '#ffd400';
		ctx.beginPath();
		ctx.moveTo(-s * 0.08, -s * 0.35);
		ctx.lineTo(0, -s * 0.52);
		ctx.lineTo(s * 0.08, -s * 0.35);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	} else {
		// A tuft of hair.
		ctx.beginPath();
		ctx.moveTo(-s * 0.04, -s * 0.37);
		ctx.quadraticCurveTo(0, -s * 0.46, s * 0.05, -s * 0.4);
		ctx.stroke();
	}
	ctx.restore();
}

/** The lawn: stripes down each lane, a hedge at the top and the house at the bottom. */
export function drawLawn(ctx: Ctx, ox: number, oy: number, c: number, lanes: number, rows: number) {
	for (let l = 0; l < lanes; l++) {
		for (let r = 0; r < rows; r++) {
			ctx.fillStyle = (l + r) % 2 ? '#7cc95a' : '#89d465';
			ctx.fillRect(ox + l * c, oy + r * c, c, c);
		}
	}
	// The hedge, with a gap at each lane for zombies to squeeze through.
	const hedge = c * 0.5;
	ctx.fillStyle = '#2f7a3a';
	ctx.fillRect(ox, oy - hedge, lanes * c, hedge);
	ctx.fillStyle = '#3d9147';
	for (let i = 0; i < lanes * 3; i++) {
		ctx.beginPath();
		ctx.arc(ox + (i + 0.5) * (c / 3), oy - hedge, c / 6, Math.PI, 0);
		ctx.fill();
	}
	// The house: a porch along the bottom.
	const y = oy + rows * c;
	ctx.fillStyle = '#c9814a';
	ctx.fillRect(ox, y, lanes * c, c * 0.5);
	ctx.fillStyle = '#a8653a';
	for (let i = 0; i < lanes * 4; i++) ctx.fillRect(ox + i * (c / 4), y, 2, c * 0.5);
	ctx.fillStyle = '#e24b3b';
	ctx.fillRect(ox, y + c * 0.5, lanes * c, c * 0.3);
}

export function drawTomato(ctx: Ctx, x: number, y: number, c: number) {
	ctx.save();
	ctx.lineWidth = Math.max(1, c * 0.025);
	ctx.strokeStyle = INK;
	circle(ctx, x, y, c * 0.1, '#e8402f');
	ctx.restore();
}
