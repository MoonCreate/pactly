import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Avatar, initialFor, toneFor } from "../components/ui";
import * as Icons from "../components/ui/icons";
import { StakeGlyph } from "../components/ui/stake-glyph";
import { photoUrl } from "../lib/photo";
import { useTRPC } from "../lib/trpc";
import { useSiwe } from "../lib/use-siwe";

export const Route = createFileRoute("/matches")({ component: Matches });

type Tab = "pending" | "conversations";

function Matches() {
	const navigate = useNavigate();
	const trpc = useTRPC();
	const queryClient = useQueryClient();
	const siwe = useSiwe();
	const [tab, setTab] = useState<Tab>("pending");

	const matchesQuery = useQuery({
		...trpc.match.list.queryOptions({}),
		enabled: siwe.status === "authenticated",
	});

	const acceptMutation = useMutation(trpc.match.accept.mutationOptions());

	const all = matchesQuery.data ?? [];
	const pending = all.filter((m) => m.status === "pending");
	const conversations = all.filter((m) => m.status === "accepted");

	const list = tab === "pending" ? pending : conversations;

	const onAccept = async (matchId: string) => {
		await acceptMutation.mutateAsync({ matchId });
		await queryClient.invalidateQueries({
			queryKey: trpc.match.list.queryKey({}),
		});
	};

	if (siwe.status !== "authenticated") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
				<p className="t-body muted mb-4">Sign in to see your matches.</p>
				<Link to="/" className="btn btn-secondary">
					Back home
				</Link>
			</div>
		);
	}

	return (
		<div
			className="relative flex min-h-screen flex-col"
			style={{ background: "var(--color-bg)" }}
		>
			{/* Top bar */}
			<div className="flex items-center justify-between px-4 pb-2 pt-3.5">
				<Link
					to="/"
					className="btn-tertiary flex items-center gap-1"
					aria-label="back home"
				>
					<Icons.ChevronLeft size={20} />
				</Link>
				<div className="t-h2">Matches</div>
				<div style={{ width: 24 }} />
			</div>

			{/* Tabs */}
			<div className="flex gap-2 px-4 pb-3 pt-1">
				<TabBtn
					active={tab === "pending"}
					count={pending.length}
					onClick={() => setTab("pending")}
				>
					Pending
				</TabBtn>
				<TabBtn
					active={tab === "conversations"}
					count={conversations.length}
					onClick={() => setTab("conversations")}
				>
					Conversations
				</TabBtn>
			</div>

			{/* List */}
			<div className="flex-1 overflow-y-auto px-2 pb-8">
				{matchesQuery.isPending ? (
					<ListSkeleton />
				) : list.length === 0 ? (
					<EmptyState
						tab={tab}
						onBrowse={() => navigate({ to: "/browse" })}
					/>
				) : (
					<div className="flex flex-col gap-1">
						{list.map((m) => (
							<MatchRow
								key={m.id}
								row={m}
								onAccept={() => void onAccept(m.id)}
								accepting={acceptMutation.isPending}
								onOpenChat={() =>
									void navigate({
										to: "/chat/$matchId",
										params: { matchId: m.id },
									})
								}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function TabBtn({
	active,
	count,
	onClick,
	children,
}: {
	active: boolean;
	count: number;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`chip ${active ? "chip-coral" : ""}`}
			style={{ height: 32, fontWeight: 500 }}
		>
			{children} · {count}
		</button>
	);
}

interface MatchRowProps {
	row: {
		id: string;
		status: string;
		mine: boolean;
		createdAt: Date;
		acceptedAt: Date | null;
		counterparty: {
			address: string;
			displayName: string;
			photoRootHash: string | null;
		} | null;
	};
	onAccept: () => void;
	accepting: boolean;
	onOpenChat: () => void;
}

function MatchRow({ row, onAccept, accepting, onOpenChat }: MatchRowProps) {
	const cp = row.counterparty;
	const addr = cp?.address ?? "";
	const tone = toneFor(addr || row.id);
	const initial = initialFor(cp?.displayName ?? addr);
	const url = photoUrl(cp?.photoRootHash ?? null);

	const isPending = row.status === "pending";
	const isAccepted = row.status === "accepted";

	return (
		<div className="card mx-2 my-1.5 p-3.5">
			<div className="flex items-center gap-3">
				{url ? (
					<img
						src={url}
						alt=""
						width={56}
						height={56}
						style={{
							width: 56,
							height: 56,
							borderRadius: "50%",
							objectFit: "cover",
							boxShadow: "0 0 0 2px var(--color-bg)",
						}}
					/>
				) : (
					<Avatar tone={tone} initial={initial} size={56} />
				)}
				<div style={{ flex: 1, minWidth: 0 }}>
					<div className="flex items-baseline justify-between">
						<div style={{ fontWeight: 600 }}>
							{cp?.displayName ?? "—"}
						</div>
						<div className="muted t-body-sm">{relTime(row.createdAt)}</div>
					</div>
					<div className="muted t-body-sm">
						{isPending && row.mine ? "you liked them · waiting" : null}
						{isPending && !row.mine ? "liked you · accept to chat" : null}
						{isAccepted ? (
							<span className="flex items-center gap-1.5">
								<StakeGlyph size={12} /> matched · ready to pact
							</span>
						) : null}
					</div>
				</div>
			</div>

			<div className="mt-3 flex gap-2">
				{isPending && row.mine ? (
					<div
						className="chip chip-peach-soft"
						style={{ height: 32, fontWeight: 500 }}
					>
						sent
					</div>
				) : null}
				{isPending && !row.mine ? (
					<button
						type="button"
						className="btn btn-primary"
						style={{ height: 40, flex: 1, fontSize: 14 }}
						onClick={onAccept}
						disabled={accepting}
					>
						<Icons.Heart size={14} fill="white" /> Accept
					</button>
				) : null}
				{isAccepted ? (
					<button
						type="button"
						className="btn btn-primary"
						style={{ height: 40, flex: 1, fontSize: 14 }}
						onClick={onOpenChat}
					>
						Open chat
					</button>
				) : null}
			</div>
		</div>
	);
}

function ListSkeleton() {
	return (
		<div className="flex flex-col gap-2 px-2">
			{[0, 1, 2].map((i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: skeletons
					key={i}
					className="skeleton mx-2"
					style={{ height: 96, borderRadius: "var(--radius-card)" }}
				/>
			))}
		</div>
	);
}

function EmptyState({
	tab,
	onBrowse,
}: {
	tab: Tab;
	onBrowse: () => void;
}) {
	return (
		<div
			className="flex h-full flex-col items-center justify-center px-6 text-center"
			style={{ gap: 14, color: "var(--color-coral)", paddingTop: 80 }}
		>
			<Icons.HeartsBig size={80} />
			<div className="t-h3" style={{ color: "var(--color-text)" }}>
				{tab === "pending"
					? "No pending requests"
					: "No conversations yet"}
			</div>
			<p
				className="muted t-body-sm"
				style={{ maxWidth: 240, color: "var(--color-text-muted)" }}
			>
				{tab === "pending"
					? "When you swipe right or someone likes you, requests show up here."
					: "Mutual matches will land here. Swipe right on someone in browse to start."}
			</p>
			<button
				type="button"
				className="btn btn-secondary"
				style={{ marginTop: 8 }}
				onClick={onBrowse}
			>
				Browse
			</button>
		</div>
	);
}

function relTime(d: Date | string): string {
	const date = typeof d === "string" ? new Date(d) : d;
	const ms = Date.now() - date.getTime();
	if (ms < 60_000) return "now";
	const m = Math.floor(ms / 60_000);
	if (m < 60) return `${m}m`;
	const h = Math.floor(m / 60);
	if (h < 24) return `${h}h`;
	const days = Math.floor(h / 24);
	return `${days}d`;
}
