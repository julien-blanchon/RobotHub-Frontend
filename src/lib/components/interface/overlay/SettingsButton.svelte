<script lang="ts">
	import { Button } from "@/components/ui/button";

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	$effect(() => {
		console.log("render_interface");
	});
</script>

<!-- Settings Trigger Button -->

<Button
	variant="default"
	size="sm"
	onclick={() => (open = !open)}
	class="group w-32 border-0 bg-orange-500 text-white transition-all duration-200 hover:bg-orange-400 dark:bg-orange-600 dark:hover:bg-orange-500"
>
	<span
		class={[
			"mr-2 size-4 transition-transform duration-200",
			"icon-[mdi--cog] group-hover:rotate-90"
		]}
	></span>
	Settings
</Button>
