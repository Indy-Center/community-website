// Feedback ratings on the same 1-5 scale as the feedback star picker
export const RATING_STARS: Record<string, number> = {
	poor: 1,
	fair: 2,
	good: 3,
	very_good: 4,
	excellent: 5
};

// "very_good" -> "Very good"
export function ratingLabel(rating: string) {
	const label = rating.replaceAll('_', ' ');
	return label.charAt(0).toUpperCase() + label.slice(1);
}

// Average star rating across feedback, or null when there's nothing to average
export function averageRating(ratings: string[]) {
	const stars = ratings.map((rating) => RATING_STARS[rating]).filter((n) => n !== undefined);
	if (stars.length === 0) return null;
	return stars.reduce((sum, n) => sum + n, 0) / stars.length;
}
