<script lang="ts">
	import { Application, Assets, BlurFilter, Container, Sprite, Texture } from 'pixi.js';
	import { onMount } from 'svelte';
	import type { Reel, Tween } from './types';
	import { capitalize } from './utils';

	let canvas: HTMLCanvasElement;
	let canvasContainer: HTMLDivElement;
	const app = new Application();
	const reelContainer = new Container();
	const columnsAmount = 3;
	const reels: Reel[] = [];
	let bettingAmounts = {
		win: 0,
		bet: 0.5,
		balance: 500000
	};

	onMount(async () => {
		await app.init({ resizeTo: canvas, backgroundAlpha: 0 });
		canvas.replaceWith(app.canvas);

		const { clientHeight: canvasHeight, clientWidth: canvasWidth } = canvasContainer;
		const columnsWidth = canvasWidth / columnsAmount;
		const symbolSize = columnsWidth;

		// Get Textures
		const pokemonList = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'];
		const pokemonImagePromises = pokemonList.map((pokemon) =>
			fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
				.then((response) => response.json())
				.then((data) => data.sprites.other.dream_world.front_default)
		);
		const pokemonImages = await Promise.all(pokemonImagePromises).then((results) => results);

		// Load the textures
		await Assets.load(pokemonImages);
		const slotTextures = pokemonImages.map((image) => Texture.from(image));

		new Array(columnsAmount).fill('').forEach((_, index) => {
			const rc = new Container();
			const reelWidth = columnsWidth;

			rc.height = canvasHeight;
			rc.width = canvasWidth / columnsAmount;
			rc.x = index * reelWidth;

			reelContainer.addChild(rc);

			const reel: Reel = {
				container: rc,
				symbols: [],
				position: 0,
				previousPosition: 0,
				blur: new BlurFilter()
			};

			reel.blur.blurX = 0;
			reel.blur.blurY = 0;
			rc.filters = [reel.blur];

			// Build the symbols
			for (let j = 0; j < pokemonList.length; j++) {
				const symbol = new Sprite(slotTextures[Math.floor(Math.random() * slotTextures.length)]);
				// Scale the symbol to fit symbol area.

				symbol.y = j * symbolSize;
				symbol.scale.x = symbol.scale.y = Math.min(
					symbolSize / symbol.width,
					symbolSize / symbol.height
				);
				symbol.x = Math.round((symbolSize - symbol.width) / 2);
				reel.symbols.push(symbol);
				rc.addChild(symbol);
			}

			reels.push(reel);
		});
		app.stage.addChild(reelContainer);

		app.ticker.add(() => {
			// Update the slots.
			for (let i = 0; i < reels.length; i++) {
				const r = reels[i];
				// Update blur filter y amount based on speed.
				// This would be better if calculated with time in mind also. Now blur depends on frame rate.

				r.blur.blurY = (r.position - r.previousPosition) * 8;
				r.previousPosition = r.position;

				// Update symbol positions on reel.
				for (let j = 0; j < r.symbols.length; j++) {
					const s = r.symbols[j];
					const prevy = s.y;

					s.y = ((r.position + j) % r.symbols.length) * symbolSize - symbolSize;
					if (s.y < 0 && prevy > symbolSize) {
						// Detect going over and swap a texture.
						// This should in proper product be determined from some logical reel.
						s.texture = slotTextures[Math.floor(Math.random() * slotTextures.length)];
						s.scale.x = s.scale.y = Math.min(
							symbolSize / s.texture.width,
							symbolSize / s.texture.height
						);
						s.x = Math.round((symbolSize - s.width) / 2);
					}
				}
			}
		});

		app.ticker.add(() => {
			const now = Date.now();
			const remove = [];

			for (let i = 0; i < tweening.length; i++) {
				const t = tweening[i];
				const phase = Math.min(1, (now - t.start) / t.time);

				t.object[t.property] = lerp(t.propertyBeginValue, t.target, t.easing(phase));
				if (t.change) t.change(t);
				if (phase === 1) {
					t.object[t.property] = t.target;
					if (t.complete) t.complete(t);
					remove.push(t);
				}
			}
			for (let i = 0; i < remove.length; i++) {
				tweening.splice(tweening.indexOf(remove[i]), 1);
			}
		});
	});

	const tweening: Tween[] = [];

	const tweenTo = (
		object: Reel,
		property: string,
		target: number,
		time: number,
		easing,
		onchange: ((t: number) => void) | null,
		oncomplete: ((t: number) => void) | null
	) => {
		const tween = {
			object,
			property,
			propertyBeginValue: object[property],
			target,
			easing,
			time,
			change: onchange,
			complete: oncomplete,
			start: Date.now()
		};

		tweening.push(tween);

		return tween;
	};

	let running = false;

	const startPlay = () => {
		if (running) return;
		running = true;

		for (let i = 0; i < reels.length; i++) {
			const r = reels[i];
			const extra = Math.floor(Math.random() * 3);
			const target = r.position + 10 + i * columnsAmount + extra;
			const time = 2500 + i * 600 + extra * 600;

			tweenTo(
				r,
				'position',
				target,
				time,
				backout(0.5),
				null,
				i === reels.length - 1 ? reelsComplete : null
			);
		}

		bettingAmounts.balance -= bettingAmounts.bet;
	};

	const reelsComplete = () => (running = false);

	// Basic lerp funtion.
	const lerp = (a1: number, a2: number, t: number) => a1 * (1 - t) + a2 * t;

	// Backout function from tweenjs.
	const backout = (amount: number) => (t: number) => --t * t * ((amount + 1) * t + amount) + 1;

	const sideButtons = [
		{
			onClick: () => (bettingAmounts.bet += 0.5),
			icon: '/reset.svg',
			key: 'spin'
		},
		{
			onClick: () => console.log('bet'),
			icon: '/coin-stack.svg',
			key: 'bet'
		}
	];
</script>

<div class="w-full h-full py-10 pr-10 pl-3 rounded hstack">
	<div class="bg-black w-full h-full bg-opacity-50 rounded p-3 pr-10">
		<div bind:this={canvasContainer} class="w-full h-full">
			<canvas bind:this={canvas} class="h-full w-full rounded bg-black" />
		</div>
		<div class="w-full bg-white h-10 rounded hstack text-sm">
			{#each Object.entries(bettingAmounts) as [key, value]}
				<div class="flex-1 stack">
					<p class="text-center font-bold">{capitalize(key)}</p>
					<p class="text-xs text-center">{value}</p>
				</div>
			{/each}
		</div>
	</div>
	<div class="stack center gap-3">
		{#each sideButtons as { onClick, icon, key }}
			<button on:click={onClick} class="w-10 h-10 rounded-full bg-white center">
				<img src={icon} alt={key} class="w-6 h-6" />
			</button>
		{/each}
	</div>
</div>

<!-- <svelte:window
	on:resize={() =>
		(reelContainer.children = reelContainer.children.map((rc) => {
			rc.width = canvasContainer.clientWidth / columnsAmount;
			rc.height = canvasContainer.clientHeight;
			rc.x = rc.width * Array.from(reelContainer.children).indexOf(rc);

			return rc;
		}))}
/> -->
