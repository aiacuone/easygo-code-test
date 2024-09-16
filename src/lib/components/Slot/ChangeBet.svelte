<script lang="ts">
	export let isChangingBet = false;
	export let bettingValues = {
		bet: 0,
		win: 0,
		balance: 0
	};

	// Get the betting amounts that can be selected
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
