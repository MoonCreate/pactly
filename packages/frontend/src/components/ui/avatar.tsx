export type Tone = "coral" | "lavender" | "mint" | "peach";

const TONE_BG: Record<Tone, string> = {
	coral: "var(--color-coral-soft)",
	lavender: "var(--color-lavender-soft)",
	mint: "var(--color-mint-soft)",
	peach: "var(--color-peach-soft)",
};

const TONE_FG: Record<Tone, string> = {
	coral: "#B8543F",
	lavender: "#5B4DAB",
	mint: "#2F6B40",
	peach: "#9A6435",
};

export interface AvatarProps {
	tone?: Tone;
	initial?: string;
	size?: number;
	ring?: boolean;
}

export function Avatar({
	tone = "coral",
	initial = "?",
	size = 40,
	ring = true,
}: AvatarProps) {
	return (
		<div
			style={{
				width: size,
				height: size,
				borderRadius: "50%",
				background: TONE_BG[tone],
				color: TONE_FG[tone],
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				fontWeight: 600,
				fontSize: size * 0.42,
				boxShadow: ring ? "0 0 0 2px var(--color-bg)" : undefined,
				flexShrink: 0,
				letterSpacing: "-0.02em",
			}}
			aria-hidden="true"
		>
			{initial}
		</div>
	);
}

/** Pick a deterministic tone for a string (e.g. wallet address). */
export function toneFor(seed: string): Tone {
	const tones: Tone[] = ["coral", "lavender", "mint", "peach"];
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
	return tones[h % tones.length] as Tone;
}

/** Take the first alphanumeric char of a name/address for the avatar initial. */
export function initialFor(s: string | null | undefined): string {
	if (!s) return "?";
	const c = s.match(/[A-Za-z0-9]/)?.[0];
	return c ? c.toUpperCase() : "?";
}
