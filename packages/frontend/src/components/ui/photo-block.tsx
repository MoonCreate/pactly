import type { CSSProperties, ReactNode } from "react";
import type { Tone } from "./avatar";

const TONE_CLASS: Record<Tone, string> = {
	coral: "photo-placeholder",
	lavender: "photo-placeholder photo-lavender",
	mint: "photo-placeholder photo-mint",
	peach: "photo-placeholder photo-peach",
};

export interface PhotoBlockProps {
	tone?: Tone;
	label?: string;
	style?: CSSProperties;
	className?: string;
	children?: ReactNode;
}

/**
 * Striped pastel placeholder used in card stacks and onboarding while real
 * photos are loading or absent. Falls back to a monospace label so demo
 * states still feel intentional.
 */
export function PhotoBlock({
	tone = "coral",
	label = "photo",
	style,
	className = "",
	children,
}: PhotoBlockProps) {
	return (
		<div className={`${TONE_CLASS[tone]} ${className}`} style={style}>
			{children ?? label}
		</div>
	);
}
