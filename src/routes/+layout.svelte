<script lang="ts">
	import { ModeWatcher } from "mode-watcher";
	import "../app.css";
	import { Toaster } from "@/components/ui/sonner";

	let { children } = $props();
</script>

<div class="fixed inset-0 -z-20 h-[100dvh] w-screen bg-slate-200 dark:bg-[#192437]">
	{@render children()}
</div>

<ModeWatcher defaultMode="dark" track={false} />

<Toaster
	richColors
	position="bottom-right"
	toastOptions={{
		unstyled: true,
		classes: {
			toast:
				"rounded-lg shadow-xl p-4 flex items-start gap-3 min-w-[300px] max-w-[450px] border bg-white border-slate-200 text-slate-900 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100",
			title: "font-medium text-sm leading-tight",
			description: "text-sm mt-1 leading-relaxed opacity-90",
			actionButton:
				"bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 ml-auto dark:bg-blue-600 dark:hover:bg-blue-700",
			cancelButton:
				"bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-300",
			closeButton:
				"text-current opacity-70 hover:opacity-100 transition-opacity duration-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10",
			success:
				"!bg-green-50 !border-green-200 !text-green-800 dark:!bg-green-950 dark:!border-green-700 dark:!text-green-200",
			error:
				"!bg-red-50 !border-red-200 !text-red-800 dark:!bg-red-950 dark:!border-red-700 dark:!text-red-200",
			warning:
				"!bg-yellow-50 !border-yellow-200 !text-yellow-800 dark:!bg-yellow-950 dark:!border-yellow-700 dark:!text-yellow-200",
			info: "!bg-blue-50 !border-blue-200 !text-blue-800 dark:!bg-blue-950 dark:!border-blue-700 dark:!text-blue-200",
			loading:
				"!bg-slate-50 !border-slate-200 !text-slate-800 dark:!bg-slate-900 dark:!border-slate-700 dark:!text-slate-200"
		}
	}}
/>
