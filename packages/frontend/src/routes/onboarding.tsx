import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { PhotoBlock, toneFor } from "../components/ui";
import * as Icons from "../components/ui/icons";
import { deriveChatKeys, getCachedChatKeys } from "../lib/keys";
import {
	fetchOnChainInterests,
	type OnChainInterests,
} from "../lib/on-chain-interests";
import {
	fetchPortfolio,
	type PortfolioSnapshot,
	TIER_DISPLAY,
} from "../lib/portfolio";
import { HOBBY_OPTIONS, type Hobby, type ProfileBody } from "../lib/profile";
import { trpcClient, useTRPC } from "../lib/trpc";
import { uploadJSON, uploadPhoto } from "../lib/upload";

export const Route = createFileRoute("/onboarding")({ component: Onboarding });

function Onboarding() {
	const navigate = useNavigate();
	const { address, isConnected } = useAccount();
	const { signMessageAsync } = useSignMessage();
	const trpc = useTRPC();
	const queryClient = useQueryClient();

	const [displayName, setDisplayName] = useState("");
	const [bio, setBio] = useState("");
	const [hobbies, setHobbies] = useState<Set<Hobby>>(new Set());
	const [xHandle, setXHandle] = useState("");
	const [igHandle, setIgHandle] = useState("");
	const [ghHandle, setGhHandle] = useState("");

	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoUploading, setPhotoUploading] = useState(false);
	const [photoRootHash, setPhotoRootHash] = useState<`0x${string}` | null>(
		null,
	);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);

	const [showPortfolio, setShowPortfolio] = useState(false);
	const [portfolio, setPortfolio] = useState<PortfolioSnapshot | null>(null);
	const [portfolioLoading, setPortfolioLoading] = useState(false);

	const [onChain, setOnChain] = useState<OnChainInterests | null>(null);

	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!address) return;
		void fetchOnChainInterests(address).then(setOnChain);
	}, [address]);

	useEffect(() => {
		if (!photoFile) {
			setPhotoPreview(null);
			return;
		}
		const url = URL.createObjectURL(photoFile);
		setPhotoPreview(url);
		let cancelled = false;
		setPhotoUploading(true);
		setPhotoRootHash(null);
		void uploadPhoto(photoFile)
			.then((res) => {
				if (cancelled) return;
				setPhotoRootHash(res.rootHash);
			})
			.catch((e) => {
				if (cancelled) return;
				setError(e instanceof Error ? e.message : "photo upload failed");
			})
			.finally(() => {
				if (!cancelled) setPhotoUploading(false);
			});
		return () => {
			cancelled = true;
			URL.revokeObjectURL(url);
		};
	}, [photoFile]);

	const togglePortfolio = async () => {
		if (!address) return;
		const next = !showPortfolio;
		setShowPortfolio(next);
		if (next && !portfolio) {
			setPortfolioLoading(true);
			try {
				setPortfolio(await fetchPortfolio(address));
			} finally {
				setPortfolioLoading(false);
			}
		}
	};

	const toggleHobby = (h: Hobby) => {
		const next = new Set(hobbies);
		if (next.has(h)) next.delete(h);
		else next.add(h);
		setHobbies(next);
	};

	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		if (!address) {
			setError("connect a wallet first");
			return;
		}
		if (!displayName.trim()) {
			setError("display name required");
			return;
		}
		if (hobbies.size < 3) {
			setError("pick at least 3 hobbies");
			return;
		}
		setSubmitting(true);
		try {
			const keys =
				getCachedChatKeys(address) ??
				(await deriveChatKeys({ address, signMessage: signMessageAsync }));

			const body: ProfileBody = {
				v: 1,
				displayName: displayName.trim(),
				bio: bio.trim(),
				hobbies: Array.from(hobbies),
				photoRootHash: photoRootHash ?? undefined,
				socials: {
					x: xHandle.trim() || undefined,
					instagram: igHandle.trim() || undefined,
					github: ghHandle.trim() || undefined,
				},
				portfolio: showPortfolio ? portfolio : null,
				onChain,
				updatedAt: Date.now(),
			};
			const { rootHash: profileRootHash } = await uploadJSON(body);

			await trpcClient.profile.upsert.mutate({
				displayName: body.displayName,
				profileRootHash,
				photoRootHash: photoRootHash ?? undefined,
				encryptionPubKey: keys.pubKey,
			});

			// Invalidate cached profile so home re-fetches and shows the new state.
			await queryClient.invalidateQueries({
				queryKey: trpc.profile.byAddress.queryKey(address),
			});

			void navigate({ to: "/" });
		} catch (err) {
			setError(err instanceof Error ? err.message : "save failed");
		} finally {
			setSubmitting(false);
		}
	};

	if (!isConnected || !address) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
				<p className="t-body muted mb-4">
					Connect a wallet to set up your profile.
				</p>
				<Link to="/" className="btn btn-secondary">
					Back home
				</Link>
			</div>
		);
	}

	const meTone = toneFor(address);

	return (
		<form
			onSubmit={onSubmit}
			className="relative flex min-h-screen flex-col"
			style={{ background: "var(--color-bg)" }}
		>
			<div
				className="flex items-center justify-between px-4 py-3.5"
				style={{ borderBottom: "1px solid var(--color-divider)" }}
			>
				<Link to="/" className="btn-tertiary flex items-center gap-1">
					<Icons.ChevronLeft size={20} />
				</Link>
				<div className="t-h3">Set up your profile</div>
				<div style={{ width: 24 }} />
			</div>

			<div className="frame-scroll px-[18px] pb-[140px] pt-5">
				{/* Photo + name combo */}
				<div className="mb-[22px] flex items-end gap-3">
					<label className="relative cursor-pointer">
						<input
							type="file"
							accept="image/*"
							onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
							className="hidden"
						/>
						{photoPreview ? (
							<img
								src={photoPreview}
								alt="profile"
								style={{
									width: 96,
									height: 96,
									borderRadius: "var(--radius-photo)",
									objectFit: "cover",
									flexShrink: 0,
								}}
							/>
						) : (
							<PhotoBlock
								tone={meTone}
								label="drop photo"
								style={{
									width: 96,
									height: 96,
									borderRadius: "var(--radius-photo)",
									flexShrink: 0,
								}}
							/>
						)}
						{photoUploading ? (
							<div
								className="absolute inset-0 flex items-center justify-center"
								style={{
									background: "rgba(255,255,255,0.7)",
									borderRadius: "var(--radius-photo)",
									fontSize: 11,
									fontFamily: "var(--font-mono)",
									color: "var(--color-text-muted)",
								}}
							>
								uploading…
							</div>
						) : null}
					</label>

					<div className="flex-1">
						<label htmlFor="displayName" className="label">
							Display name
						</label>
						<input
							id="displayName"
							type="text"
							className="input"
							value={displayName}
							onChange={(e) => setDisplayName(e.target.value)}
							maxLength={64}
							required
							placeholder="What should people call you?"
						/>
					</div>
				</div>

				{photoRootHash ? (
					<p
						className="t-mono-sm mb-5"
						style={{ color: "var(--color-text-soft)" }}
					>
						stored on 0G · {photoRootHash.slice(0, 14)}…
					</p>
				) : null}

				{/* Bio */}
				<div className="mb-5">
					<label htmlFor="bio" className="label">
						Bio
					</label>
					<textarea
						id="bio"
						className="input"
						rows={3}
						maxLength={200}
						value={bio}
						onChange={(e) => setBio(e.target.value.slice(0, 200))}
						placeholder="Coffee, code, and bad jokes."
					/>
					<div className="hint flex justify-between">
						<span>Keep it human.</span>
						<span>{bio.length}/200</span>
					</div>
				</div>

				{/* Hobbies */}
				<div className="mb-5">
					<div className="label">
						Hobbies{" "}
						<span className="muted font-normal">
							· pick 3+ (chosen {hobbies.size})
						</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{HOBBY_OPTIONS.map((h) => {
							const on = hobbies.has(h);
							return (
								<button
									key={h}
									type="button"
									onClick={() => toggleHobby(h)}
									className={`chip ${on ? "chip-coral" : ""}`}
									style={{ height: 32 }}
								>
									{h}
								</button>
							);
						})}
					</div>
				</div>

				{/* Socials */}
				<div className="mb-5">
					<div className="label">
						Socials{" "}
						<span className="muted font-normal">· optional · unverified</span>
					</div>
					<div className="flex flex-col gap-2">
						<SocialInput
							prefix="𝕏"
							placeholder="@yourhandle"
							value={xHandle}
							onChange={setXHandle}
						/>
						<SocialInput
							prefix="📸"
							placeholder="@yourhandle"
							value={igHandle}
							onChange={setIgHandle}
						/>
						<SocialInput
							prefix="</>"
							placeholder="github username"
							value={ghHandle}
							onChange={setGhHandle}
						/>
					</div>
				</div>

				{/* On chain (auto) */}
				<div className="mb-5">
					<div className="label">
						Spotted on chain <span className="muted font-normal">· auto</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{onChain ? (
							onChain.tags.map((t) => (
								<div key={t} className="chip chip-onchain">
									{t}
								</div>
							))
						) : (
							<div className="t-body-sm muted">reading from mainnet…</div>
						)}
					</div>
					<div className="hint">
						From{" "}
						<span className="t-mono-sm">
							{address.slice(0, 6)}…{address.slice(-4)}
						</span>
					</div>
				</div>

				{/* Portfolio (opt-in) */}
				<div className="mb-5">
					<div className="label">Portfolio</div>
					<button
						type="button"
						onClick={() => void togglePortfolio()}
						className="flex w-full items-center gap-3"
						style={{
							padding: "14px 16px",
							borderRadius: "var(--radius-input)",
							background: "var(--color-surface)",
							border: "1px solid var(--color-divider)",
							textAlign: "left",
						}}
					>
						<div
							style={{
								width: 22,
								height: 22,
								borderRadius: 6,
								border: `2px solid ${showPortfolio ? "var(--color-coral)" : "var(--color-divider)"}`,
								background: showPortfolio
									? "var(--color-coral)"
									: "transparent",
								color: "white",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								flexShrink: 0,
							}}
						>
							{showPortfolio ? <Icons.Check size={14} /> : null}
						</div>
						<div>
							<div style={{ fontWeight: 500 }}>
								Show portfolio tier on my profile
							</div>
							<div className="hint" style={{ marginTop: 2 }}>
								Across mainnet + L2s. Updates weekly.
							</div>
						</div>
					</button>
					{showPortfolio ? (
						<div
							className="card mt-2.5 flex items-center gap-3"
							style={{ padding: 14 }}
						>
							{portfolioLoading ? (
								<>
									<div className="skeleton" style={{ width: 28, height: 28 }} />
									<div
										className="skeleton"
										style={{ height: 18, flex: 1, maxWidth: 160 }}
									/>
								</>
							) : portfolio ? (
								<>
									<div style={{ fontSize: 28 }}>
										{TIER_DISPLAY[portfolio.tier].icon}
									</div>
									<div>
										<div style={{ fontWeight: 600, textTransform: "capitalize" }}>
											{TIER_DISPLAY[portfolio.tier].label}
										</div>
										<div className="hint" style={{ marginTop: 2 }}>
											Your wallet across mainnet + L2s.
										</div>
									</div>
								</>
							) : (
								<div className="t-body-sm muted">portfolio unavailable</div>
							)}
						</div>
					) : null}
				</div>

				{error ? (
					<p
						className="t-body-sm mt-2"
						style={{ color: "var(--color-rose)" }}
					>
						{error}
					</p>
				) : null}
			</div>

			{/* Sticky CTA */}
			<div
				className="absolute right-0 bottom-0 left-0 px-4 pt-3.5 pb-6"
				style={{
					background:
						"linear-gradient(to top, var(--color-bg) 60%, transparent)",
				}}
			>
				<button
					type="submit"
					className="btn btn-primary btn-block"
					disabled={submitting}
				>
					{submitting ? "saving…" : "Save profile"}
				</button>
			</div>
		</form>
	);
}

function SocialInput({
	prefix,
	placeholder,
	value,
	onChange,
}: {
	prefix: string;
	placeholder: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<label className="flex items-center gap-3">
			<span
				className="text-center text-base"
				style={{ width: 32, color: "var(--color-text-muted)" }}
			>
				{prefix}
			</span>
			<input
				type="text"
				className="input"
				style={{ height: 44 }}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
			/>
		</label>
	);
}
