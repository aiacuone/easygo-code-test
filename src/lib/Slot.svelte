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
	let bettingValues = {
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
		const pokemonList = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'];

		// Get Textures
		const pokemonsAndSpritesPromises = pokemonList.map((pokemon) =>
			fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
				.then((response) => response.json())
				.then((data) => ({ sprite: data.sprites.other.dream_world.front_default, pokemon }))
		);
		const pokemonsAndSprites = await Promise.all(pokemonsAndSpritesPromises).then(
			(results) => results
		);

		// Load the textures
		await Assets.load(pokemonsAndSprites.map(({ sprite }) => sprite));
		const slotTextures = pokemonsAndSprites.map(({ sprite, pokemon }) => {
			const texture = Texture.from(sprite);
			texture.pokemon = pokemon;
			return texture;
		});

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
						const randomTexture = slotTextures[Math.floor(Math.random() * slotTextures.length)];
						//Texture being changed here, therefore pokemon is also changed
						s.texture = randomTexture;
						s.pokemon = randomTexture.pokemon;
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

		bettingValues.balance = Number((bettingValues.balance - bettingValues.bet).toFixed(1));
	};

	const reelsComplete = () => {
		running = false;

		const pokemonYPositionsAndColumns = reels.map((reel) => {
			return reel.symbols
				.map(({ pokemon, y }) => ({
					pokemon,
					y
				})) // Get the pokemon names and y positions
				.sort((a, b) => a.y - b.y) // Sort by y position
				.filter((symbol) => symbol.y >= 0) // Filter out the hidden symbols
				.map(({ pokemon }) => pokemon); // Get the pokemon names
		});

		console.log({ pokemonYPositionsAndColumns });
	};

	// Basic lerp funtion.
	const lerp = (a1: number, a2: number, t: number) => a1 * (1 - t) + a2 * t;

	// Backout function from tweenjs.
	const backout = (amount: number) => (t: number) => --t * t * ((amount + 1) * t + amount) + 1;

	const sideButtons = [
		{
			onClick: startPlay,
			icon: '/reset.svg',
			key: 'spin'
		},
		{
			onClick: () => (isChangingBet = !isChangingBet),
			icon: '/coin-stack.svg',
			key: 'bet'
		}
	];

	let isChangingBet = false;

	const getBettingAmounts = () => {
		const series = [];

		const addRange = (start: number, end: number, step: number) => {
			for (let i = start; i <= end; i += step) {
				series.push(parseFloat(i.toFixed(2)));
			}
		};

		const ranges = [
			[0.1, 1.0, 0.1],
			[1.0 + 0.2, 3.0, 0.2],
			[3.0 + 0.5, 5.0, 0.5],
			[5.0 + 1.0, 10.0, 1.0],
			[10.0 + 2.0, 20.0, 2.0]
		];

		ranges.forEach(([start, end, step]) => addRange(start, end, step));

		series.push(25.0);

		return series;
	};
	const bettingAmounts = getBettingAmounts();

	const changeBettingAmount = (amount: number) => {
		bettingValues.bet = amount;
		isChangingBet = false;
	};
</script>

<div class="w-full h-full py-10 pr-10 pl-3 rounded hstack">
	<div>
		<div class="bg-black w-full h-full bg-opacity-50 rounded p-5 pr-10 relative">
			<div bind:this={canvasContainer} class="w-full h-full">
				<canvas bind:this={canvas} class="h-full w-full rounded bg-black" />
			</div>
			{#if isChangingBet}
				<div class="absolute center w-full h-full bg-black bg-opacity-80 left-0 top-0 rounded p-1">
					<button
						on:click={() => (isChangingBet = false)}
						class="text-white absolute right-2 top-2 border-2 border-white rounded px-2">X</button
					>
					<div class="stack gap-1 text-white text-center">
						<p class="text-lg">Bet</p>
						<p class="text-xs">Change your bet</p>
						<div class="grid gap-2 grid-cols-6">
							{#each bettingAmounts as amount}
								<button
									class="h-10 rounded border-2 border-white px-3 hover:bg-white hover:text-black"
									on:click={() => changeBettingAmount(amount)}
								>
									{amount}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="w-full bg-white rounded hstack text-sm pb-[6px]">
			{#each Object.entries(bettingValues) as [key, value]}
				<div class="flex-1 stack">
					<p class="text-center font-bold text-lg">{capitalize(key)}</p>
					<p class="text-center">{value}</p>
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
