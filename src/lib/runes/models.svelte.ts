interface Modals {
	settings: {
		open: boolean;
	};
	controls: {
		open: boolean;
	};
	info: {
		open: boolean;
	};
}

export const modals: Modals = $state({
	settings: {
		open: false
	},
	controls: {
		open: false
	},
	info: {
		open: false
	}
});
