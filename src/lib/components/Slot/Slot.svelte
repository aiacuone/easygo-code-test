<script lang="ts">
	import { Application, Assets, BlurFilter, Container, Sprite, Texture } from 'pixi.js';
	import { onMount } from 'svelte';
	import type { PokemonSprite, PokemonTexture, Reel, Tween } from '../../types';
	import { arraysAreEqual } from '$lib/utils/arrays';
	import SideButtons from './SideButtons.svelte';
	import BettingValues from './BettingValues.svelte';
	import WinBanner from './WinBanner.svelte';
	import ChangeBet from './ChangeBet.svelte';

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
	let isChangingBet = false;
	let hasWon = false;
	let running = false;
	let slotSound: HTMLAudioElement;
	let pikachuSound: HTMLAudioElement;
	let isAudioOn = true;

	onMount(async () => {
		await app.init({ resizeTo: canvas, backgroundAlpha: 0 });
		canvas.replaceWith(app.canvas);

		const { clientHeight: canvasHeight, clientWidth: canvasWidth } = canvasContainer;
		const columnsWidth = canvasWidth / columnsAmount;
		const symbolSize = columnsWidth;
		const pokemonList = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'];
		slotSound = new Audio('/slot-sound.mp3');
		pikachuSound = new Audio('/pikachu-sound.mp3');

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
			const texture = Texture.from(sprite) as PokemonTexture;
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
				const symbol = new Sprite(
					slotTextures[Math.floor(Math.random() * slotTextures.length)]
				) as PokemonSprite;
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

				r.blur.blurY = (r.position - r.previousPosition) * 8;
				r.previousPosition = r.position;

				// Update symbol positions on reel.
				for (let j = 0; j < r.symbols.length; j++) {
					const s = r.symbols[j] as PokemonSprite;
					const prevy = s.y;

					s.y = ((r.position + j) % r.symbols.length) * symbolSize - symbolSize;
					if (s.y < 0 && prevy > symbolSize) {
						// Detect going over and swap a texture.
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
				// @ts-ignore. Typescript error due to dynamic object property.
				(t.object as Reel)[t.property as keyof Reel] = lerp(
					t.propertyBeginValue,
					t.target,
					t.easing(phase)
				);
				if (t.change) t.change(t);
				if (phase === 1) {
					// @ts-ignore. Typescript error due to dynamic object property.
					(t.object as Reel)[t.property as keyof Reel] = t.target;
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
		easing: (t: number) => number,
		onchange: ((t: number) => void) | null,
		oncomplete: ((t: number) => void) | null
	) => {
		const tween: Tween = {
			object,
			property,
			propertyBeginValue: object[property as keyof Reel],
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

	const startPlay = () => {
		if (running || isChangingBet) return;

		isAudioOn && slotSound.play();

		// Return all to defaults
		running = true;
		bettingValues.win = 0;
		reels.forEach((reel) => reel.container.children.forEach((symbol) => (symbol.alpha = 1)));
		hasWon = false;

		for (let i = 0; i < reels.length; i++) {
			const r = reels[i];
			const extra = Math.floor(Math.random() * 3);
			const target = r.position + 10 + i * columnsAmount + extra;
			const time = 300 + i * 600 + extra * 600;

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
		checkWin();
	};

	const checkWin = () => {
		// Get all the pokemon x and y positions
		const pokemonPositions = reels.map((reel, x) => {
			return reel.symbols
				.map(({ pokemon, y: yPosition }) => ({
					pokemon,
					yPosition
				})) // Get the pokemon names and y positions
				.sort((a, b) => a.yPosition - b.yPosition) // Sort by y position
				.filter((symbol) => symbol.yPosition >= 0) // Filter out the hidden symbols
				.map(({ yPosition, ...rest }, index) => ({ ...rest, coordinates: [x, index] })); // Remove y position
		});

		// [x,y] coordinates for the lines that are considered a win
		const lineCoordinates = [
			[
				[0, 0],
				[1, 0],
				[2, 0]
			],
			[
				[0, 1],
				[1, 1],
				[2, 1]
			],
			[
				[0, 2],
				[1, 2],
				[2, 2]
			],
			[
				[0, 0],
				[1, 1],
				[2, 2]
			],
			[
				[2, 0],
				[1, 1],
				[0, 2]
			]
		];

		// Get all the pokemon at the line coordinates
		const pokemonAtLineCoordinates = lineCoordinates.map((line) =>
			line.map(([x, y]) =>
				pokemonPositions
					.flat()
					.find((pokemon) => pokemon.coordinates[0] === x && pokemon.coordinates[1] === y)
			)
		);

		// Check all the lines that have won
		const winningLines = pokemonAtLineCoordinates.map((line) =>
			line.every((pokemon) => pokemon?.pokemon === line[0]?.pokemon)
		);
		const amountOfLinesThatWon = winningLines.filter(Boolean).length;
		const isThereALineThatWon = !!amountOfLinesThatWon;

		if (isThereALineThatWon) {
			isAudioOn && pikachuSound.play();
			const allPossibleCoordinates = [];
			for (let i = 0; i <= 2; i++) {
				for (let j = 0; j <= 2; j++) {
					allPossibleCoordinates.push([i, j]);
				}
			}

			const winningCoordinates = pokemonAtLineCoordinates
				.filter((_, index) => winningLines[index])
				.flat()
				.map((pokemon) => pokemon?.coordinates);

			// Get coordinates of all losing textures to dim them
			const allLosingCoordinates = allPossibleCoordinates.filter(
				(coordinates) =>
					!winningCoordinates.some((winningCoordinate) =>
						arraysAreEqual(winningCoordinate, coordinates)
					)
			);

			handleCelebration(allLosingCoordinates);
			handleBet(amountOfLinesThatWon);
		}
	};

	const handleBet = (multiplier: number) => {
		const winAmount = bettingValues.bet * multiplier;
		bettingValues.win = winAmount;
		bettingValues.balance = Number((bettingValues.balance + winAmount).toFixed(1));
	};

	const handleCelebration = (allLosingCoordinates: number[][]) => {
		reels.forEach((reel, x) => {
			reel.container.children
				.sort((a, b) => a.y - b.y)
				.filter((symbol) => symbol.y >= 0)
				.forEach((texture, y) => {
					const isLosingTexture = allLosingCoordinates.some((coordinates) =>
						arraysAreEqual(coordinates, [x, y])
					);
					// Dim the losing textures
					if (isLosingTexture) texture.alpha = 0.2;
				});
		});

		hasWon = true;
	};

	// Basic lerp funtion.
	const lerp = (a1: number, a2: number, t: number) => a1 * (1 - t) + a2 * t;

	// Backout function from tweenjs.
	const backout = (amount: number) => (t: number) => --t * t * ((amount + 1) * t + amount) + 1;
</script>

<div class="w-full h-full py-10 pr-10 pl-3 rounded hstack">
	<div>
		<div class="bg-black w-full h-full bg-opacity-50 rounded-t-xl p-5 pr-10 relative">
			<div class="center absolute -top-9 left-0 h-10 w-full">
				<img src="/pokemon-title.svg" alt="pokemon-title" class="h-[70px]" />
			</div>
			<div bind:this={canvasContainer} class="w-full h-full">
				<canvas bind:this={canvas} class="h-full w-full rounded-t-xl bg-black" />
			</div>
			{#if hasWon}
				<div class="center w-full h-full absolute top-0 left-0 bg-black bg-opacity-10">
					<WinBanner />
				</div>
			{/if}
			{#if isChangingBet}
				<div
					class="absolute center w-full h-full bg-black bg-opacity-80 left-0 top-0 rounded-t-xl p-1"
				>
					<ChangeBet bind:isChangingBet bind:bettingValues />
				</div>
			{/if}
		</div>
		<div class="w-full bg-white rounded-b-xl hstack text-sm pb-[6px]">
			<BettingValues {bettingValues} />
		</div>
	</div>
	<div class="relative">
		<div class="stack center gap-3 h-full absolute -left-[20px] top-0">
			<SideButtons {startPlay} bind:isChangingBet bind:isAudioOn />
		</div>
	</div>
</div>
