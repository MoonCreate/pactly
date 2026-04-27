import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Avatar, initialFor, toneFor, Wordmark } from "../components/ui";
import * as Icons from "../components/ui/icons";
import { photoUrl } from "../lib/photo";
import { useTRPC } from "../lib/trpc";
import { useSiwe } from "../lib/use-siwe";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const siwe = useSiwe();
	const navigate = useNavigate();
	const trpc = useTRPC();

	const signedIn = siwe.status === "authenticated" && !!siwe.address;

	const profileQuery = useQuery({
		...trpc.profile.byAddress.queryOptions(siwe.address as `0x${string}`),
		enabled: signedIn,
	});

	// If signed in but no profile, kick to onboarding.
	useEffect(() => {
		if (!signedIn) return;
		if (profileQuery.data === null) {
			void navigate({ to: "/onboarding" });
		}
	}, [signedIn, profileQuery.data, navigate]);

	const profile = profileQuery.data ?? null;
	const meTone = siwe.address ? toneFor(siwe.address) : "lavender";
	const meInitial = initialFor(profile?.displayName ?? siwe.address);

	return (
		<div
			className="relative flex min-h-screen flex-col"
			style={{
				background:
					"radial-gradient(120% 80% at 50% 0%, var(--color-coral-soft), transparent 60%), var(--color-bg)",
			}}
		>
			{signedIn ? (
				<div className="flex items-center justify-between px-4 py-3.5">
					<div className="flex items-center gap-2">
						<HeaderAvatar
							tone={meTone}
							initial={meInitial}
							photoRootHash={profile?.photoRootHash ?? null}
						/>
						<div className="text-sm font-medium">
							{profile?.displayName ??
								`${siwe.address!.slice(0, 6)}…${siwe.address!.slice(-4)}`}
						</div>
					</div>
					{profile ? (
						<Link to="/onboarding" className="btn-tertiary">
							edit profile
						</Link>
					) : null}
				</div>
			) : null}

			<div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 text-center">
				<Wordmark size={56} />

				<div className="t-h3 muted max-w-[300px] leading-[26px]">
					Dating, in earnest.
					<br />
					Match free.{" "}
					<span style={{ color: "var(--color-text)" }}>Stake to meet.</span>
					<br />
					Show up — or get slashed.
				</div>

				<div className="flex w-full max-w-[320px] flex-col gap-2.5">
					{!signedIn ? (
						<>
							<appkit-button />

							{siwe.status === "needs-signature" ? (
								<button
									type="button"
									className="btn btn-primary btn-block"
									onClick={() => void siwe.signIn()}
								>
									<Icons.Wallet size={18} /> Sign in with Ethereum
								</button>
							) : null}

							{siwe.status === "signing" ? (
								<p className="t-body-sm muted">Open your wallet to sign…</p>
							) : null}
							{siwe.status === "verifying" ? (
								<p className="t-body-sm muted">Verifying signature…</p>
							) : null}
							{siwe.status === "error" && siwe.error ? (
								<p
									className="t-body-sm"
									style={{ color: "var(--color-rose)" }}
								>
									{siwe.error}
								</p>
							) : null}
						</>
					) : null}

					{signedIn && profileQuery.isPending ? (
						<p className="t-body-sm muted">checking profile…</p>
					) : null}

					{signedIn && profileQuery.data === null ? (
						<Link to="/onboarding" className="btn btn-primary btn-block">
							Set up your profile
						</Link>
					) : null}

					{signedIn && profile ? (
						<>
							<Link to="/browse" className="btn btn-primary btn-block">
								Browse matches
							</Link>
							<MatchesButton />
							<button
								type="button"
								className="btn btn-tertiary"
								style={{ height: 36 }}
								onClick={() => void siwe.signOut()}
							>
								sign out
							</button>
						</>
					) : null}
				</div>
			</div>

			<div className="px-6 pb-8 text-center">
				<div className="t-caption mb-2">The pact</div>
				<div className="flex flex-wrap justify-center gap-2">
					<div className="chip">show up · keep stake</div>
					<div className="chip chip-rose-soft">ghost · lose it</div>
				</div>
				<div className="t-caption mt-4">Built on 0G</div>
			</div>
		</div>
	);
}

function MatchesButton() {
	const trpc = useTRPC();
	const matchesQuery = useQuery({
		...trpc.match.list.queryOptions({}),
		staleTime: 30_000,
	});

	const all = matchesQuery.data ?? [];
	const pendingCount = all.filter((m) => m.status === "pending" && !m.mine).length;
	const conversationCount = all.filter((m) => m.status === "accepted").length;
	const total = pendingCount + conversationCount;

	return (
		<Link
			to="/matches"
			className="btn btn-secondary btn-block"
			style={{ height: 48 }}
		>
			My matches
			{total > 0 ? (
				<span
					className={
						pendingCount > 0
							? "chip chip-coral-soft"
							: "chip chip-mint-soft"
					}
					style={{ height: 22, marginLeft: 6, fontSize: 12 }}
				>
					{total}
				</span>
			) : null}
		</Link>
	);
}

function HeaderAvatar({
	tone,
	initial,
	photoRootHash,
}: {
	tone: ReturnType<typeof toneFor>;
	initial: string;
	photoRootHash: string | null;
}) {
	const url = photoUrl(photoRootHash);
	if (url) {
		return (
			<img
				src={url}
				alt=""
				width={32}
				height={32}
				style={{
					width: 32,
					height: 32,
					borderRadius: "50%",
					objectFit: "cover",
					boxShadow: "0 0 0 2px var(--color-bg)",
				}}
			/>
		);
	}
	return <Avatar tone={tone} initial={initial} size={32} />;
}
