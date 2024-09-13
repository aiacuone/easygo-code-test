<script lang="ts">
	import ExampleSlots from '$lib/ExampleSlots.svelte';
	import Slot from '$lib/Slot.svelte';
</script>

<div class="hstack center h-full w-full bg-green-500 gap-3">
	<div class="h-2/3 w-1/3">
		<ExampleSlots />
	</div>
	<div class="h-2/3 w-1/3">
		<Slot />
	</div>
</div>
