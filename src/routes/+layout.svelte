<script lang="ts">
	import Overlay from "@/components/interface/overlay/Overlay.svelte";
	import "../app.css";
	import { Toaster } from "@/components/ui/sonner";

	let { children } = $props();
</script>

<div class="fixed inset-0 -z-20 h-[100dvh] w-screen bg-[#192437]">
	{@render children()}
</div>

<Toaster
	richColors
	position="bottom-right"
	toastOptions={{
		unstyled: true,
		classes: {
			toast: "rounded-lg shadow-xl p-4 flex items-start gap-3 min-w-[300px] max-w-[450px] border",
			title: "font-medium text-sm leading-tight",
			description: "text-sm mt-1 leading-relaxed opacity-90",
			actionButton:
				"bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ml-auto",
			cancelButton:
				"bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200",
			closeButton:
				"text-current opacity-70 hover:opacity-100 transition-opacity duration-200 p-1 rounded-md hover:bg-white/10",
			success: "!bg-green-950 border-green-700 !text-green-200",
			error: "!bg-red-950 border-red-700 !text-red-200",
			warning: "!bg-yellow-950 border-yellow-700 !text-yellow-200",
			info: "!bg-blue-950 border-blue-700 !text-blue-200",
			loading: "!bg-slate-900 border-slate-700 !text-slate-200"
		}
	}}
/>

<Overlay /> 