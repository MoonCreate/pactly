/**
 * Pactly wordmark — "pa[heart-pact]ly" with the coral heart-pact ligature
 * sitting in the middle. Lowercase, single-weight, monochrome except for the
 * heart accent.
 */
export function Wordmark({ size = 48 }: { size?: number }) {
	return (
		<div
			className="t-display"
			style={{ fontSize: size, lineHeight: 1, letterSpacing: "-0.04em" }}
		>
			pa
			<span
				style={{
					position: "relative",
					display: "inline-block",
					width: "0.55em",
					verticalAlign: "middle",
				}}
			>
				<svg
					viewBox="0 0 32 36"
					width="0.55em"
					height="0.62em"
					style={{ position: "absolute", left: 0, top: "0.18em" }}
					aria-hidden="true"
				>
					<path
						d="M9 22 V8"
						stroke="var(--color-text)"
						strokeWidth="3.5"
						strokeLinecap="round"
					/>
					<path
						d="M3 8 H15"
						stroke="var(--color-text)"
						strokeWidth="3.5"
						strokeLinecap="round"
					/>
					<path
						d="M21 30 C21 30, 12 24, 12 16 a6 6 0 0 1 11 -3 a6 6 0 0 1 11 3 c0 8 -9 14 -9 14 z"
						transform="translate(-4 -4) scale(0.6)"
						fill="var(--color-coral)"
					/>
				</svg>
				<span style={{ visibility: "hidden" }}>ct</span>
			</span>
			ly
		</div>
	);
}
