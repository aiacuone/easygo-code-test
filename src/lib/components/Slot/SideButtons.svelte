<script lang="ts">
	export let startPlay: () => void;
	export let isChangingBet = false;
	export let isAudioOn = true;

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
</script>

{#each sideButtons as { onClick, icon, key }}
	<button on:click={onClick} class="w-10 h-10 rounded-full bg-white center">
		<img src={icon} alt={key} class="w-6 h-6" />
	</button>
{/each}

<button on:click={() => (isAudioOn = !isAudioOn)} class="w-10 h-10 rounded-full bg-white center">
	<img src={`${isAudioOn ? '/audio.png' : '/no-audio.png'}`} alt={'audio'} class="w-6 h-6" />
</button>
