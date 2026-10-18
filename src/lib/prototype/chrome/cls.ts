// PROTOTYPE (prototype/chrome): class recipes shared by the chrome's parts.
// `--tap` is the touch size the bar picks; every control and menu row is at
// least that tall.

export const focus =
	'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500';

/** A header control: nav link, menu button. */
export const control = `inline-flex min-h-[var(--tap)] min-w-[var(--tap)] cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white ${focus}`;

/** A row in a dropdown or the phone menu. */
export const row = `flex min-h-[var(--tap)] w-full items-center gap-3 rounded-lg px-3 text-sm text-gray-300 transition-colors hover:bg-slate-700 hover:text-white ${focus}`;

/** Marks the current app in the apps list: the soft fill of current page B. */
export const currentRow = 'bg-white/10 text-white';

export const groupLabel =
	'px-3 pt-3 pb-1 text-xs font-semibold tracking-wider text-gray-400 uppercase';
