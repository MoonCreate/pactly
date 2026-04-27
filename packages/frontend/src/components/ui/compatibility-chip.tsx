import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "../../lib/trpc";
import * as Icons from "./icons";

export interface CompatibilityChipProps {
	address: `0x${string}`;
	enabled?: boolean;
	/** Compact = score only. Full = score + one-line reason. */
	variant?: "compact" | "full";
}

export function CompatibilityChip({
	address,
	enabled = true,
	variant = "compact",
}: CompatibilityChipProps) {
	const trpc = useTRPC();
	const q = useQuery({
		...trpc.match.compatibility.queryOptions({ counterparty: address }),
		enabled,
		// Inputs are content-addressed via profileRootHash; cache hard.
		staleTime: 30 * 60_000,
	});

	if (!enabled) return null;

	if (q.isPending) {
		return (
			<div
				className="skeleton"
				style={{
					height: variant === "full" ? 20 : 28,
					width: variant === "full" ? 220 : 64,
					borderRadius: "var(--radius-pill)",
				}}
			/>
		);
	}

	if (!q.data) return null;

	if (variant === "compact") {
		return (
			<div
				className="chip chip-coral"
				style={{ height: 28, paddingInline: 12, fontWeight: 700 }}
				aria-label={q.data.reason}
			>
				<Icons.Sparkle size={12} />
				{q.data.score}%
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1.5">
			<div
				className="chip chip-coral self-start"
				style={{ height: 28, fontWeight: 700 }}
			>
				<Icons.Sparkle size={12} />
				{q.data.score}% match
			</div>
			<div
				className="t-body-sm"
				style={{ color: "var(--color-text-muted)", lineHeight: "20px" }}
			>
				{q.data.reason}
			</div>
		</div>
	);
}
