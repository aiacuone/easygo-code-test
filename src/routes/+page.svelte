<script lang="ts">
	import Slot from '$lib/components/Slot.svelte';

	const backgroundImageSrc =
		'https://wallpapers-clan.com/wp-content/uploads/2024/03/pokemon-bulbasaur-landscape-desktop-wallpaper-preview.jpg';
</script>

<div
	class="hstack center h-full w-full bg-neutral-900 gap-3 bg-center bg-cover"
	style={`background-image: url(${backgroundImageSrc})`}
>
	<div class="h-[510px] w-[500px] center">
		<Slot />
	</div>
</div>
