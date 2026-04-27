/**
 * Pactly icon set — line, currentColor.
 * Ported from the Claude Design prototype components.jsx.
 */

interface IconProps {
	size?: number;
}

export function Heart({
	size = 22,
	fill = "none",
}: IconProps & { fill?: string }) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill={fill}
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
		</svg>
	);
}

export function X({ size = 22 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<line x1="18" y1="6" x2="6" y2="18" />
			<line x1="6" y1="6" x2="18" y2="18" />
		</svg>
	);
}

export function Star({ size = 22 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
		</svg>
	);
}

export function Plus({ size = 18 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<line x1="12" y1="5" x2="12" y2="19" />
			<line x1="5" y1="12" x2="19" y2="12" />
		</svg>
	);
}

export function Send({ size = 18 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M3.4 20.6l17.45-8.05a.6.6 0 0 0 0-1.1L3.4 3.4a.5.5 0 0 0-.7.6L4.5 11l9.5 1-9.5 1L2.7 20a.5.5 0 0 0 .7.6z" />
		</svg>
	);
}

export function Lock({ size = 14 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="11" width="18" height="11" rx="2" />
			<path d="M7 11V7a5 5 0 0 1 10 0v4" />
		</svg>
	);
}

export function Sparkle({ size = 16 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
		>
			<path
				d="M12 2 L13.5 8.5 L20 10 L13.5 11.5 L12 18 L10.5 11.5 L4 10 L10.5 8.5 Z"
				opacity=".95"
			/>
			<circle cx="19" cy="5" r="1.2" />
			<circle cx="5" cy="19" r="1" />
		</svg>
	);
}

export function ChevronLeft({ size = 22 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polyline points="15 18 9 12 15 6" />
		</svg>
	);
}

export function Check({ size = 18 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polyline points="20 6 9 17 4 12" />
		</svg>
	);
}

export function Flag({ size = 16 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M4 22V4l9 3-2 4 9 2v6l-9-2 2 4-9 1z" />
		</svg>
	);
}

export function Wallet({ size = 18 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="2" y="6" width="20" height="14" rx="3" />
			<path d="M16 13h2" />
			<path d="M2 10h20" />
		</svg>
	);
}

export function Filter({ size = 14 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
		</svg>
	);
}

export function Calendar({ size = 16 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<rect x="3" y="4" width="18" height="18" rx="2" />
			<line x1="16" y1="2" x2="16" y2="6" />
			<line x1="8" y1="2" x2="8" y2="6" />
			<line x1="3" y1="10" x2="21" y2="10" />
		</svg>
	);
}

export function Pin({ size = 16 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
			<circle cx="12" cy="10" r="3" />
		</svg>
	);
}

export function Cloud({ size = 80 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M28 64a14 14 0 1 1 4-27.5A20 20 0 0 1 70 40a13 13 0 0 1 0 24z" />
			<path d="M40 76l-3 6M52 76l-3 6M64 76l-3 6" />
		</svg>
	);
}

export function ShrugFigure({ size = 96 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="50" cy="28" r="10" />
			<path d="M30 60c4-8 12-12 20-12s16 4 20 12" />
			<path d="M22 50c4 4 8 5 14 4M78 50c-4 4-8 5-14 4" />
			<path d="M14 46l4 6 6-2M86 46l-4 6-6-2" />
			<path d="M40 80l4 12M60 80l-4 12" />
		</svg>
	);
}

export function Clock({ size = 96 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 100 100"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeDasharray="3 4"
			aria-hidden="true"
		>
			<circle cx="50" cy="50" r="34" />
			<path d="M50 30v22l14 8" strokeDasharray="0" />
		</svg>
	);
}

export function HeartsBig({ size = 110 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 120 120"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M60 100s-32-22-32-46a18 18 0 0 1 32-12 18 18 0 0 1 32 12c0 24-32 46-32 46z" />
		</svg>
	);
}

export function CaughtUp({ size = 120 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 120 120"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<circle cx="60" cy="50" r="22" />
			<path d="M40 84c4-8 12-12 20-12s16 4 20 12" />
			<path d="M52 48l6 6 12-14" stroke="currentColor" />
			<path d="M22 30l6 4M98 30l-6 4M22 70l6-2M98 70l-6-2" />
		</svg>
	);
}

export function OnboardingHeart({ size = 120 }: IconProps) {
	return (
		<svg
			width={size}
			height={size}
			viewBox="0 0 120 120"
			fill="none"
			stroke="currentColor"
			strokeWidth="2.4"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M60 96s-30-20-30-44a16 16 0 0 1 30-8 16 16 0 0 1 30 8c0 24-30 44-30 44z" />
			<path d="M44 50l8 8 18-18" />
		</svg>
	);
}
