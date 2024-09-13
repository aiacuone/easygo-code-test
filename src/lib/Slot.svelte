<script lang="ts">
	import { Application, Assets, BlurFilter, Container, Sprite, Texture } from 'pixi.js';
	import { onMount } from 'svelte';

	let canvas: HTMLCanvasElement;
	let canvasContainer: HTMLDivElement;

	const app = new Application();

	const columnsAmount = 3;
	const reelContainer = new Container();
	const reels = [];

	onMount(async () => {
		await app.init({ resizeTo: canvas, backgroundAlpha: 0 });
		canvas.replaceWith(app.canvas);

		const pokemonList = ['bulbasaur', 'charmander', 'squirtle', 'pikachu'];

		const promises = pokemonList.map((pokemon) =>
			fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon}`)
				.then((response) => response.json())
				.then((data) => data.sprites.front_default)
		);

		const pokemonImages = await Promise.all(promises).then((results) => results);

		await Assets.load(pokemonImages);

		const slotTextures = pokemonImages.map((image) => Texture.from(image));

		new Array(columnsAmount).fill('').forEach((_, index) => {
			const rc = new Container();
			const { clientHeight: canvasHeight, clientWidth: canvasWidth } = canvasContainer;

			const symbolSize = canvasWidth / columnsAmount;
			const reelWidth = symbolSize;

			rc.height = canvasHeight;
			rc.width = canvasWidth / columnsAmount;
			rc.x = index * reelWidth;

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
		});
		app.stage.addChild(reelContainer);
	});

	const tweening = [];

	const backgroundImageSrc =
		'https://wallpapers-clan.com/wp-content/uploads/2024/03/pokemon-bulbasaur-landscape-desktop-wallpaper-preview.jpg';

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

	let running = false;

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

	function backout(amount) {
		return (t) => --t * t * ((amount + 1) * t + amount) + 1;
	}

	function reelsComplete() {
		running = false;
	}
</script>

<div
	class="w-full h-full py-10 pr-10 pl-3 bg-red-500 rounded bg-center bg-cover"
	style={`background-image: url(${backgroundImageSrc})`}
>
	<div bind:this={canvasContainer} class="bg-black w-full h-full bg-opacity-50 rounded">
		<canvas bind:this={canvas} class="h-full w-full rounded bg-black" />
	</div>
</div>

<svelte:window
	on:resize={() =>
		(reelContainer.children = reelContainer.children.map((rc) => {
			rc.width = canvasContainer.clientWidth / columnsAmount;
			rc.height = canvasContainer.clientHeight;
			rc.x = rc.width * Array.from(reelContainer.children).indexOf(rc);

			return rc;
		}))}
/>
