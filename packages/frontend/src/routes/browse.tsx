import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ProfileDetail } from "../components/profile-detail";
import { Avatar, initialFor, toneFor } from "../components/ui";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "../components/ui/drawer";
import * as Icons from "../components/ui/icons";
import {
	SwipeCard,
	type SwipeCardPerson,
	type SwipeDir,
} from "../components/ui/swipe-card";
import { useTRPC } from "../lib/trpc";
import { useSiwe } from "../lib/use-siwe";

export const Route = createFileRoute("/browse")({ component: Browse });

interface Toast {
	kind: "info" | "error";
	text: string;
}

const DESKTOP_MQ = "(min-width: 1024px)";

function Browse() {
	const navigate = useNavigate();
	const { address: walletAddress } = useAccount();
	const siwe = useSiwe();
	const trpc = useTRPC();

	const browseQuery = useQuery({
		...trpc.profile.browse.queryOptions({ limit: 30 }),
		enabled: siwe.status === "authenticated",
	});

	const matchRequest = useMutation(trpc.match.request.mutationOptions());

	const [seen, setSeen] = useState<Set<string>>(new Set());
	const seenRef = useRef(seen);
	seenRef.current = seen;
	const [toast, setToast] = useState<Toast | null>(null);
	const [celebrate, setCelebrate] = useState<SwipeCardPerson | null>(null);
	const [drawerPerson, setDrawerPerson] = useState<SwipeCardPerson | null>(
		null,
	);

	// Map server rows → display people, filtering out anything we've already
	// passed/matched on locally.
	const decoratedRows = browseQuery.data
		? browseQuery.data
				.filter((r) => !seen.has(r.address.toLowerCase()))
				.map((r) => ({
					address: r.address as `0x${string}`,
					displayName: r.displayName,
					tone: toneFor(r.address),
					initial: initialFor(r.displayName),
					photoRootHash: r.photoRootHash ?? null,
					profileRootHash: r.profileRootHash ?? null,
				}))
		: null;
	const deck = decoratedRows;
	const top = deck?.[0];

	const showToast = useCallback((kind: Toast["kind"], text: string) => {
		setToast({ kind, text });
		setTimeout(() => setToast(null), 2400);
	}, []);

	const handleSwipe = useCallback(
		async (dir: SwipeDir, person: SwipeCardPerson) => {
			const key = person.address.toLowerCase();
			if (seenRef.current.has(key)) return;
			setSeen((s) => {
				const next = new Set(s);
				next.add(key);
				return next;
			});
			// If the user just swiped away the card whose detail is open, close it.
			if (drawerPerson && drawerPerson.address.toLowerCase() === key) {
				setDrawerPerson(null);
			}
			if (dir === "left") return;

			try {
				const res = await matchRequest.mutateAsync({
					counterparty: person.address,
				});
				if (res.mutual) {
					setCelebrate(person);
				} else {
					showToast("info", `Match request sent to ${person.displayName}.`);
				}
			} catch (err) {
				showToast(
					"error",
					err instanceof Error ? err.message : "couldn't send match request",
				);
				setSeen((s) => {
					const next = new Set(s);
					next.delete(key);
					return next;
				});
			}
		},
		[matchRequest, showToast, drawerPerson],
	);

	const openDetail = useCallback((person: SwipeCardPerson) => {
		// On desktop the side panel already shows the top card → no-op.
		if (
			typeof window !== "undefined" &&
			window.matchMedia(DESKTOP_MQ).matches
		) {
			return;
		}
		setDrawerPerson(person);
	}, []);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (!top) return;
			if (e.key === "ArrowRight") void handleSwipe("right", top);
			else if (e.key === "ArrowLeft") void handleSwipe("left", top);
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [top, handleSwipe]);

	if (siwe.status !== "authenticated") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
				<p className="t-body muted mb-4">Sign in to browse.</p>
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
			{/* Top bar — full width, spans desktop columns */}
			<div className="flex items-center justify-between px-4 pb-2 pt-3.5 lg:mx-auto lg:w-full lg:max-w-[1100px] lg:px-6">
				<Link
					to="/"
					className="btn-tertiary flex items-center gap-1"
					aria-label="back home"
				>
					<Icons.ChevronLeft size={20} />
				</Link>
				<div className="flex items-center gap-2">
					<div
						style={{ fontWeight: 700, fontSize: 20, letterSpacing: "-0.03em" }}
					>
						pactly
					</div>
					<div className="muted t-body-sm">· browse</div>
				</div>
				<div
					className="chip"
					style={{ borderColor: "var(--color-divider)", height: 30 }}
				>
					<Icons.Filter size={12} /> {deck?.length ?? "—"}
				</div>
			</div>

			{/* Body: 1 col on mobile, 2 cols ≥lg */}
			<main className="flex flex-1 flex-col lg:mx-auto lg:grid lg:w-full lg:max-w-[1100px] lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-10 lg:px-6">
				{/* Deck column */}
				<div className="flex flex-1 flex-col">
					<div className="flex flex-1 items-center justify-center px-6 py-4">
						<div
							style={{
								position: "relative",
								width: "100%",
								maxWidth: 360,
								aspectRatio: "3 / 4.5",
							}}
						>
							{browseQuery.isPending || deck === null ? (
								<DeckSkeleton />
							) : deck.length === 0 ? (
								<EmptyDeck
									error={
										browseQuery.error
											? browseQuery.error instanceof Error
												? browseQuery.error.message
												: "could not load profiles"
											: null
									}
									onMatches={() => navigate({ to: "/" })}
								/>
							) : (
								deck
									.slice(0, 3)
									.reverse()
									.map((p, idx, arr) => {
										const depth = arr.length - 1 - idx;
										return (
											<SwipeCard
												key={p.address}
												person={p}
												onSwipe={handleSwipe}
												onTap={openDetail}
												isTop={depth === 0}
												depth={depth}
											/>
										);
									})
							)}
						</div>
					</div>

					{/* Action row */}
					{deck && deck.length > 0 ? (
						<div
							className="flex items-center justify-center gap-7 pb-6"
							style={{ paddingTop: 16 }}
						>
							<ActionBtn
								label="pass"
								color="var(--color-rose)"
								onClick={() => void (top && handleSwipe("left", top))}
							>
								<Icons.X />
							</ActionBtn>
							<ActionBtn
								label="detail"
								color="var(--color-lavender)"
								onClick={() => top && openDetail(top)}
							>
								<Icons.Star />
							</ActionBtn>
							<ActionBtn
								label="match"
								color="var(--color-coral)"
								emphasis
								onClick={() => void (top && handleSwipe("right", top))}
							>
								<Icons.Heart fill="var(--color-coral)" />
							</ActionBtn>
						</div>
					) : null}
				</div>

				{/* Detail column — desktop only. Mirrors the top card automatically. */}
				<aside className="hidden py-6 lg:flex lg:flex-col">
					<div
						className="card overflow-hidden"
						style={{ height: "calc(100vh - 120px)", minHeight: 600 }}
					>
						{top ? (
							<ProfileDetail
								person={top}
								onMatch={() => void handleSwipe("right", top)}
							/>
						) : (
							<DetailEmpty />
						)}
					</div>
				</aside>
			</main>

			{/* Toast */}
			{toast ? (
				<div
					className="toast flex items-center gap-2"
					style={
						toast.kind === "error"
							? { borderLeft: "3px solid var(--color-rose)" }
							: undefined
					}
				>
					<Icons.Check size={16} />
					<span className="t-body-sm">{toast.text}</span>
				</div>
			) : null}

			{/* Mobile drawer — vaul portals to body so this works regardless of layout */}
			<Drawer
				open={!!drawerPerson}
				onOpenChange={(o) => {
					if (!o) setDrawerPerson(null);
				}}
			>
				<DrawerContent className="lg:hidden">
					<DrawerHeader className="sr-only">
						<DrawerTitle>
							{drawerPerson ? drawerPerson.displayName : "Profile"}
						</DrawerTitle>
						<DrawerDescription>Profile details</DrawerDescription>
					</DrawerHeader>
					<div style={{ height: "78vh" }}>
						{drawerPerson ? (
							<ProfileDetail
								person={drawerPerson}
								onMatch={() => {
									if (!drawerPerson) return;
									void handleSwipe("right", drawerPerson);
									setDrawerPerson(null);
								}}
								onClose={() => setDrawerPerson(null)}
								hideTitleBar
							/>
						) : null}
					</div>
				</DrawerContent>
			</Drawer>

			{/* Mutual match celebration */}
			{celebrate ? (
				<MatchCelebration
					me={walletAddress as `0x${string}` | undefined}
					person={celebrate}
					onClose={(where) => {
						setCelebrate(null);
						if (where === "home") void navigate({ to: "/" });
					}}
				/>
			) : null}
		</div>
	);
}

function ActionBtn({
	label,
	color,
	emphasis,
	onClick,
	children,
}: {
	label: string;
	color: string;
	emphasis?: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col items-center gap-1">
			<button
				type="button"
				className="btn-icon"
				style={{
					color,
					boxShadow: emphasis ? "0 8px 24px -6px #FF8C7A66" : undefined,
				}}
				onClick={onClick}
				aria-label={label}
			>
				{children}
			</button>
			<span className="t-caption">{label}</span>
		</div>
	);
}

function DeckSkeleton() {
	return (
		<div
			className="skeleton"
			style={{
				position: "absolute",
				inset: 0,
				borderRadius: "var(--radius-card)",
			}}
		/>
	);
}

function EmptyDeck({
	error,
	onMatches,
}: {
	error: string | null;
	onMatches: () => void;
}) {
	return (
		<div
			className="flex h-full flex-col items-center justify-center text-center"
			style={{ gap: 14, color: "var(--color-coral)" }}
		>
			<Icons.CaughtUp size={140} />
			<div className="t-h2" style={{ color: "var(--color-text)" }}>
				{error ? "Something went sideways." : "You're caught up."}
			</div>
			<div
				className="muted t-body-sm"
				style={{ maxWidth: 240, color: "var(--color-text-muted)" }}
			>
				{error
					? error
					: "We'll surface fresh people as they show up. Pact someone you've already matched in the meantime."}
			</div>
			<button
				type="button"
				className="btn btn-secondary"
				style={{ marginTop: 8 }}
				onClick={onMatches}
			>
				Back home
			</button>
		</div>
	);
}

function DetailEmpty() {
	return (
		<div
			className="flex h-full flex-col items-center justify-center px-6 text-center"
			style={{ color: "var(--color-text-soft)" }}
		>
			<Icons.HeartsBig size={80} />
			<div className="t-h3 mt-4" style={{ color: "var(--color-text)" }}>
				No one in the deck
			</div>
			<p className="t-body-sm muted mt-1" style={{ maxWidth: 240 }}>
				Profiles you swipe through will show their full details here.
			</p>
		</div>
	);
}

function MatchCelebration({
	me,
	person,
	onClose,
}: {
	me?: `0x${string}`;
	person: SwipeCardPerson;
	onClose: (where: "chat" | "home" | "browse") => void;
}) {
	const colors = ["#FF8C7A", "#C9B8FF", "#94D2A1", "#FFCFA6", "#F4A4A4"];
	return (
		<div
			className="takeover"
			style={{
				background: "rgba(255, 217, 210, 0.92)",
				backdropFilter: "blur(6px)",
			}}
		>
			{Array.from({ length: 22 }).map((_, i) => (
				<div
					// biome-ignore lint/suspicious/noArrayIndexKey: confetti pieces are ephemeral
					key={i}
					className="confetti-piece"
					style={{
						left: `${10 + (i * 4) % 80}%`,
						background: colors[i % colors.length],
						animationDelay: `${(i * 30) % 400}ms`,
						top: "20%",
					}}
				/>
			))}

			<div
				style={{
					display: "flex",
					gap: 12,
					marginBottom: 24,
					alignItems: "center",
				}}
			>
				<Avatar
					tone={me ? toneFor(me) : "lavender"}
					initial={me ? initialFor(me) : "?"}
					size={84}
				/>
				<div style={{ color: "var(--color-coral)" }}>
					<Icons.Heart size={36} fill="var(--color-coral)" />
				</div>
				<Avatar tone={person.tone} initial={person.initial} size={84} />
			</div>

			<div className="t-h1" style={{ marginBottom: 4 }}>
				It's a match.
			</div>
			<div
				className="t-body muted"
				style={{
					marginBottom: 24,
					textAlign: "center",
					maxWidth: 280,
					color: "var(--color-text-muted)",
				}}
			>
				You and {person.displayName} both said yes. Say hi — and when you're
				ready, propose a pact.
			</div>

			<button
				type="button"
				className="btn btn-primary"
				onClick={() => onClose("home")}
			>
				Got it
			</button>
			<button
				type="button"
				className="btn btn-tertiary"
				style={{ marginTop: 8 }}
				onClick={() => onClose("browse")}
			>
				Keep browsing
			</button>
		</div>
	);
}
