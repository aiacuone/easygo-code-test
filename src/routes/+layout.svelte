<script lang="ts">
	import { onMount, setContext } from 'svelte';
	import '../app.css';
	import { writable, type Writable } from 'svelte/store';
</script>

<div class="w-full h-[100dvh]">
	<slot />
</div>
