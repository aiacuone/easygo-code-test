<script lang="ts">
	import { capitalize } from "$lib/utils";

	export let bettingValues = {
		bet: 0,
		win: 0,
		balance: 0
	};
</script>

{#each Object.entries(bettingValues) as [key, value]}
	<div class="flex-1 stack">
		<p class="text-center font-bold text-lg">{capitalize(key)}</p>
		<p class="text-center">{value}</p>
	</div>
{/each}
