<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Application,
		Assets,
		Color,
		Container,
		Texture,
		Sprite,
		Graphics,
		Text,
		TextStyle,
		BlurFilter,
		FillGradient
	} from 'pixi.js';

	let canvas: HTMLCanvasElement;
	let canvasContainer: HTMLDivElement;

	const app = new Application();

	onMount(async () => {
		// Create a new application

		// Initialize the application
		await app.init({ background: '#1099bb', resizeTo: canvas });

		// Append the application canvas to the canvas element
		canvas.replaceWith(app.canvas);

		const pokemonList = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'];

		const promises = pokemonList.map((pokemon) =>
			fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
				.then((response) => response.json())
				.then((data) => data.sprites.front_default)
		);

		const pokemonImages = await Promise.all(promises).then((results) => results);

		const reelWidth = 80;
		const symbolSize = 80;
		const columnsAmount = 3;

		// Load the textures
		await Assets.load(pokemonImages);

		// Create different slot symbols
		const slotTextures = pokemonImages.map((image) => Texture.from(image));

		// Build the reels
		const reels = [];
		const reelContainer = new Container();

		for (let i = 0; i < columnsAmount; i++) {
			const rc = new Container();

			rc.x = i * reelWidth;
			reelContainer.addChild(rc);

			const reel = {
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
			for (let j = 0; j < 4; j++) {
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
		}
		app.stage.addChild(reelContainer);

		// Build top & bottom covers and position reelContainer
		const margin = (app.screen.height - symbolSize * 3) / 2;

		reelContainer.y = margin;
		reelContainer.x = Math.round(app.screen.width - reelWidth * columnsAmount);
		const top = new Graphics().rect(0, 0, app.screen.width, margin).fill({ color: 0x0 });
		const bottom = new Graphics()
			.rect(0, symbolSize * 3 + margin, app.screen.width, margin)
			.fill({ color: 0x0 });

		// Create gradient fill
		const fill = new FillGradient(0, 0, 0, 36 * 1.7);

		const colors = [0xffffff, 0x00ff99].map((color) => Color.shared.setValue(color).toNumber());

		colors.forEach((number, index) => {
			const ratio = index / colors.length;

			fill.addColorStop(ratio, number);
		});

		// Add play text
		const style = new TextStyle({
			fontFamily: 'Arial',
			fontSize: 36,
			fontStyle: 'italic',
			fontWeight: 'bold',
			fill: { fill },
			stroke: { color: 0x4a1850, width: columnsAmount },
			dropShadow: {
				color: 0x000000,
				angle: Math.PI / 6,
				blur: 4,
				distance: 6
			},
			wordWrap: true,
			wordWrapWidth: 440
		});

		const playText = new Text('Spin the wheels!', style);

		playText.x = Math.round((bottom.width - playText.width) / 2);
		playText.y = app.screen.height - margin + Math.round((margin - playText.height) / 2);
		bottom.addChild(playText);

		// Add header text
		const headerText = new Text('PIXI MONSTER SLOTS!', style);

		headerText.x = Math.round((top.width - headerText.width) / 2);
		headerText.y = Math.round((margin - headerText.height) / 2);
		top.addChild(headerText);

		app.stage.addChild(top);
		app.stage.addChild(bottom);

		// Set the interactivity.
		bottom.eventMode = 'static';
		bottom.cursor = 'pointer';
		bottom.addListener('pointerdown', () => {
			startPlay();
		});

		let running = false;

		// Function to start playing.
		function startPlay() {
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
		}

		// Reels done handler.
		function reelsComplete() {
			running = false;
		}

		// Listen for animate update.
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

		// Very simple tweening utility function. This should be replaced with a proper tweening library in a real product.
		const tweening = [];

		function tweenTo(object, property, target, time, easing, onchange, oncomplete) {
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
		}
		// Listen for animate update.
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

		// Basic lerp funtion.
		function lerp(a1, a2, t) {
			return a1 * (1 - t) + a2 * t;
		}

		// Backout function from tweenjs.
		// https://github.com/CreateJS/TweenJS/blob/master/src/tweenjs/Ease.js
		function backout(amount) {
			return (t) => --t * t * ((amount + 1) * t + amount) + 1;
		}
	});
</script>

<div class="h-full w-full center">
	<div class="bg-blue-500 w-1/2 h-1/2" bind:this={canvasContainer}>
		<canvas bind:this={canvas} class="h-full w-full" />
	</div>
</div>

<svelte:window
	on:resize={() => app.renderer.resize(canvasContainer.clientWidth, canvasContainer.clientHeight)}
/>
