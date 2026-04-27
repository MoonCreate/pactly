export interface StakeGlyphProps {
	size?: number;
	color?: string;
	secondary?: string;
}

/**
 * Two interlocking rings — the visual mark of a "pact". Reused on stake chips,
 * date cards, and the matches list to make pact-related rows immediately
 * scannable.
 */
export function StakeGlyph({
	size = 20,
	color = "var(--color-coral)",
	secondary = "var(--color-lavender)",
}: StakeGlyphProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 32 22"
			fill="none"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2.2" />
			<circle cx="21" cy="11" r="8" stroke={secondary} strokeWidth="2.2" />
		</svg>
	);
}
