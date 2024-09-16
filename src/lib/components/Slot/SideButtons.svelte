<script lang="ts">
	export let sideButtons: { onClick: () => void; icon: string; key: string }[] = [];
</script>

	{#each sideButtons as { onClick, icon, key }}
		<button on:click={onClick} class="w-10 h-10 rounded-full bg-white center">
			<img src={icon} alt={key} class="w-6 h-6" />
		</button>
	{/each}
