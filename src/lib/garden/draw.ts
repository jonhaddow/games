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

/**
 * A plant filling a cell of size s whose top left is (x, y). `t` is seconds, for a sway.
 * Upgraded plants have a star for each level past the first.
 */
export function drawPlant(
	ctx: Ctx,
	kind: PlantKind,
	x: number,
	y: number,
	s: number,
	t = 0,
	level = 1
) {
	const cx = x + s / 2;
	const cy = y + s / 2;
	ctx.save();
	ctx.lineWidth = Math.max(1.5, s * 0.03);
	ctx.strokeStyle = INK;
	ctx.lineJoin = 'round';
	const sway = Math.sin(t * 2 + x * 0.05) * s * 0.02;
	switch (kind) {
		case 'pea': {
			// A pod on a stalk, peas peeping out, with a face on the front pea.
			ctx.fillStyle = '#3f9b3a';
			ctx.fillRect(cx - s * 0.03, cy + s * 0.05, s * 0.06, s * 0.3);
			ctx.strokeRect(cx - s * 0.03, cy + s * 0.05, s * 0.06, s * 0.3);
			for (const dx of [-1, 1])
				blob(ctx, cx + dx * s * 0.16, cy + s * 0.3, s * 0.13, s * 0.06, '#3f9b3a');
			blob(ctx, cx + sway, cy - s * 0.04, s * 0.34, s * 0.2, '#6cc04a');
			for (const dx of [-0.18, 0, 0.18])
				circle(ctx, cx + sway + dx * s, cy - s * 0.04, s * 0.09, '#a6e05a');
			eyes(ctx, cx + sway, cy - s * 0.06, s * 0.7);
			break;
		}
		case 'melon': {
			// A striped watermelon on a leafy launcher.
			for (const dx of [-1, 1])
				blob(ctx, cx + dx * s * 0.2, cy + s * 0.3, s * 0.16, s * 0.07, '#3f9b3a');
			blob(ctx, cx + sway, cy, s * 0.34, s * 0.28, '#4fae3c');
			ctx.strokeStyle = '#2b6e25';
			for (const dx of [-0.18, 0, 0.18]) {
				ctx.beginPath();
				ctx.ellipse(cx + sway + dx * s, cy, s * 0.04, s * 0.26, 0, 0, TAU);
				ctx.stroke();
			}
			ctx.strokeStyle = INK;
			eyes(ctx, cx + sway, cy - s * 0.02, s);
			smile(ctx, cx + sway, cy + s * 0.08, s);
			break;
		}
		case 'mud': {
			// A brown puddle with bubbles.
			ctx.fillStyle = '#6b4424';
			ctx.beginPath();
			ctx.ellipse(cx, cy, s * 0.42, s * 0.32, 0, 0, TAU);
			ctx.fill();
			ctx.fillStyle = '#82552f';
			ctx.beginPath();
			ctx.ellipse(cx - s * 0.08, cy - s * 0.05, s * 0.25, s * 0.15, 0, 0, TAU);
			ctx.fill();
			const b = (Math.sin(t * 3 + x) + 1) / 2;
			circle(ctx, cx + s * 0.18, cy + s * 0.08, s * (0.03 + b * 0.04), '#9b6a3e', false);
			circle(ctx, cx - s * 0.2, cy + s * 0.12, s * 0.03, '#9b6a3e', false);
			break;
		}
		case 'frost': {
			// An icy mint plant: pale blue leaves and a frosty face.
			for (let i = 0; i < 5; i++) {
				const a = -Math.PI / 2 + (i - 2) * 0.55;
				ctx.save();
				ctx.translate(cx + Math.cos(a) * s * 0.2, cy + s * 0.05 + Math.sin(a) * s * 0.2);
				ctx.rotate(a + Math.PI / 2);
				blob(ctx, 0, 0, s * 0.1, s * 0.18, '#8fd8f0');
				ctx.restore();
			}
			blob(ctx, cx + sway, cy + s * 0.08, s * 0.22, s * 0.2, '#c8f0ff');
			eyes(ctx, cx + sway, cy + s * 0.06, s * 0.8);
			smile(ctx, cx + sway, cy + s * 0.13, s * 0.8);
			for (const [dx, dy] of [
				[-0.35, -0.3],
				[0.33, -0.2],
				[0.3, 0.3]
			]) {
				const k = (Math.sin(t * 4 + dx * 10) + 1) / 2;
				circle(ctx, cx + dx * s, cy + dy * s, s * 0.03 * (0.5 + k), '#fff', false);
			}
			break;
		}
		case 'sprinkler': {
			// A garden sprinkler head, spraying round.
			ctx.fillStyle = '#7a8794';
			ctx.fillRect(cx - s * 0.05, cy - s * 0.05, s * 0.1, s * 0.35);
			ctx.strokeRect(cx - s * 0.05, cy - s * 0.05, s * 0.1, s * 0.35);
			blob(ctx, cx, cy + s * 0.32, s * 0.2, s * 0.06, '#5a6772');
			blob(ctx, cx, cy - s * 0.1, s * 0.2, s * 0.13, '#f2c230');
			eyes(ctx, cx, cy - s * 0.11, s * 0.7);
			const spin = t * 3;
			for (let i = 0; i < 6; i++) {
				const a = spin + (i / 6) * TAU;
				circle(
					ctx,
					cx + Math.cos(a) * s * 0.36,
					cy - s * 0.1 + Math.sin(a) * s * 0.22,
					s * 0.035,
					'#4cb3f0',
					false
				);
			}
			break;
		}
		case 'sunflower': {
			// Petals round a seedy face, on a stalk.
			ctx.fillStyle = '#3f9b3a';
			ctx.fillRect(cx - s * 0.03, cy + s * 0.1, s * 0.06, s * 0.28);
			ctx.strokeRect(cx - s * 0.03, cy + s * 0.1, s * 0.06, s * 0.28);
			const fy = cy - s * 0.05;
			for (let i = 0; i < 10; i++) {
				const a = (i / 10) * TAU + sway;
				blob(
					ctx,
					cx + Math.cos(a) * s * 0.24,
					fy + Math.sin(a) * s * 0.24,
					s * 0.09,
					s * 0.09,
					'#ffd400'
				);
			}
			circle(ctx, cx, fy, s * 0.2, '#8a5a24');
			eyes(ctx, cx, fy - s * 0.02, s * 0.9);
			smile(ctx, cx, fy + s * 0.06, s * 0.9);
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
	}
	for (let i = 1; i < level; i++) {
		star(ctx, x + s * (0.5 + (i - level / 2) * 0.22 - 0.11), y + s * 0.12, s * 0.09);
	}
	ctx.restore();
}

function star(ctx: Ctx, x: number, y: number, r: number) {
	ctx.beginPath();
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i / 10) * TAU;
		const k = i % 2 ? r * 0.45 : r;
		ctx.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
	}
	ctx.closePath();
	ctx.fillStyle = '#ffd400';
	ctx.fill();
	ctx.stroke();
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

/** The lawn: a checked lawn with the dirt path, a hedge at the top and the house at the bottom. */
export function drawLawn(
	ctx: Ctx,
	ox: number,
	oy: number,
	c: number,
	cols: number,
	rows: number,
	path: readonly (readonly [number, number])[]
) {
	for (let l = 0; l < cols; l++) {
		for (let r = 0; r < rows; r++) {
			ctx.fillStyle = (l + r) % 2 ? '#7cc95a' : '#89d465';
			ctx.fillRect(ox + l * c, oy + r * c, c, c);
		}
	}
	// The path: a dirt track joining the middles of its cells.
	ctx.save();
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	const track = (width: number, colour: string) => {
		ctx.beginPath();
		for (const [x, y] of path) ctx.lineTo(ox + (x + 0.5) * c, oy + (y + 0.5) * c);
		ctx.lineWidth = width;
		ctx.strokeStyle = colour;
		ctx.stroke();
	};
	track(c * 0.92, '#b98a55');
	track(c * 0.78, '#d9ab72');
	ctx.restore();
	// The hedge, with a gap where the path comes in.
	const hedge = c * 0.5;
	const [gap] = path[0];
	ctx.fillStyle = '#2f7a3a';
	ctx.fillRect(ox, oy - hedge, gap * c, hedge);
	ctx.fillRect(ox + (gap + 1) * c, oy - hedge, (cols - gap - 1) * c, hedge);
	ctx.fillStyle = '#3d9147';
	for (let i = 0; i < cols * 3; i++) {
		if (Math.floor(i / 3) === gap) continue;
		ctx.beginPath();
		ctx.arc(ox + (i + 0.5) * (c / 3), oy - hedge, c / 6, Math.PI, 0);
		ctx.fill();
	}
	// The house: a porch along the bottom.
	const y = oy + rows * c;
	ctx.fillStyle = '#c9814a';
	ctx.fillRect(ox, y, cols * c, c * 0.5);
	ctx.fillStyle = '#a8653a';
	for (let i = 0; i < cols * 4; i++) ctx.fillRect(ox + i * (c / 4), y, 2, c * 0.5);
	ctx.fillStyle = '#e24b3b';
	ctx.fillRect(ox, y + c * 0.5, cols * c, c * 0.3);
}

const SHOTS: Partial<Record<PlantKind, [string, number]>> = {
	pea: ['#a6e05a', 0.08],
	melon: ['#4fae3c', 0.16],
	frost: ['#c8f0ff', 0.09],
	sunflower: ['#6b4424', 0.1]
};

/** A shot in flight, by the kind of plant that threw it. */
export function drawShot(ctx: Ctx, kind: PlantKind, x: number, y: number, c: number) {
	const [fill, r] = SHOTS[kind] ?? ['#fff', 0.08];
	ctx.save();
	ctx.lineWidth = Math.max(1, c * 0.025);
	ctx.strokeStyle = INK;
	circle(ctx, x, y, c * r, fill);
	ctx.restore();
}
