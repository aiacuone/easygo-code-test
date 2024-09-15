<script lang="ts">
	import Slot from '$lib/components/Slot.svelte';

	const backgroundImageSrc =
		'https://wallpapers-clan.com/wp-content/uploads/2024/03/pokemon-bulbasaur-landscape-desktop-wallpaper-preview.jpg';

	let isPageLoading = true;

	setTimeout(() => {
		isPageLoading = false;
	}, 2000);
</script>

<div
	class="hstack center h-full w-full bg-neutral-900 gap-3 bg-center bg-cover"
	style={`background-image: url(${backgroundImageSrc})`}
>
	{#if isPageLoading}
		<div class="absolute">
			<div class="h-full w-full stack center relative">
				<img src="/pokemon-title.svg" alt="pokemon-title" class="h-[70px]" />
				<img src="/pokemon-ball.png" alt="pokemon-title" class="h-[70px] rotate" />
				<p class="text-center font-bold text-lg">Loading....</p>
			</div>
		</div>
	{/if}
	<div class={`h-[510px] w-[500px] center ${isPageLoading ? 'opacity-0' : 'opacity-100'}`}>
		<Slot />
	</div>
</div>

<style>
	.rotate {
		/* Animation that rotates 360 degrees continuously */
		animation: spin 3s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}
</style>
