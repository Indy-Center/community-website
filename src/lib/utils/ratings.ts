// VATSIM controller ratings from highest to lowest, the order they're displayed in
export const RATING_ORDER = ['ADM', 'SUP', 'I3', 'I1', 'C3', 'C1', 'S3', 'S2', 'S1', 'OBS'];

function ratingRank(rating: string | null) {
	const index = rating ? RATING_ORDER.indexOf(rating) : -1;
	return index === -1 ? RATING_ORDER.length : index;
}

// Highest rating first, then by name; unknown or missing ratings go last
export function byRating(
	a: { name: string; rating: string | null },
	b: { name: string; rating: string | null }
) {
	return ratingRank(a.rating) - ratingRank(b.rating) || a.name.localeCompare(b.name);
}
