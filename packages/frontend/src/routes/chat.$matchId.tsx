import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { Avatar, initialFor, toneFor } from "../components/ui";
import * as Icons from "../components/ui/icons";
import { useChatSecret } from "../lib/chat-keys";
import { decryptMessage, encryptMessage } from "../lib/crypto";
import { trpcClient, useTRPC } from "../lib/trpc";
import { uploadBytes } from "../lib/upload";
import { useSiwe } from "../lib/use-siwe";

export const Route = createFileRoute("/chat/$matchId")({ component: ChatRoute });

const API_URL =
	import.meta.env.VITE_PACTLY_API_URL ?? "http://localhost:3001";

interface UIMessage {
	id: string;
	rootHash: string;
	sender: string;
	sequence: number;
	createdAt: Date;
	plaintext: string | null; // null until decrypt resolves
}

function ChatRoute() {
	const { matchId } = Route.useParams();
	const navigate = useNavigate();
	const trpc = useTRPC();
	const siwe = useSiwe();
	const { address: me } = useAccount();

	// Match metadata (for the counterparty address + auth gate).
	const matchQuery = useQuery({
		...trpc.match.byId.queryOptions({ matchId }),
		enabled: siwe.status === "authenticated",
	});

	const peer: `0x${string}` | null = useMemo(() => {
		const row = matchQuery.data;
		const meAddr = me?.toLowerCase() as `0x${string}` | undefined;
		if (!row || !meAddr) return null;
		return (row.addrA === meAddr ? row.addrB : row.addrA) as `0x${string}`;
	}, [matchQuery.data, me]);

	// ECDH shared secret + peer profile.
	const { secret, peerProfile, error: keyError } = useChatSecret({
		myAddress: (me ?? null) as `0x${string}` | null,
		peerAddress: peer,
	});

	// My profile (display name for wingman context).
	const myProfileQuery = useQuery({
		...trpc.profile.byAddress.queryOptions(
			(me ?? "0x0") as `0x${string}`,
		),
		enabled: !!me,
	});

	// Manifests — polled every 3s.
	const manifestsQuery = useQuery({
		...trpc.chat.list.queryOptions({ matchId, since: -1, limit: 200 }),
		enabled: siwe.status === "authenticated" && !!matchQuery.data,
		refetchInterval: 3000,
	});

	// Decrypted plaintext cache, keyed by rootHash.
	const [plaintextCache, setPlaintextCache] = useState<Map<string, string>>(
		new Map(),
	);

	// Decrypt any new manifests once we have a secret.
	useEffect(() => {
		const manifests = manifestsQuery.data ?? [];
		if (!secret || manifests.length === 0) return;
		const missing = manifests.filter((m) => !plaintextCache.has(m.rootHash));
		if (missing.length === 0) return;

		let cancelled = false;
		(async () => {
			const results = await Promise.allSettled(
				missing.map(async (m) => {
					const res = await fetch(`${API_URL}/storage/blob/${m.rootHash}`);
					if (!res.ok) throw new Error(`blob ${res.status}`);
					const bytes = new Uint8Array(await res.arrayBuffer());
					const text = decryptMessage(bytes, m.iv, secret);
					return { rootHash: m.rootHash, text };
				}),
			);
			if (cancelled) return;
			setPlaintextCache((prev) => {
				const next = new Map(prev);
				for (const r of results) {
					if (r.status === "fulfilled") {
						next.set(r.value.rootHash, r.value.text);
					}
				}
				return next;
			});
		})();
		return () => {
			cancelled = true;
		};
	}, [manifestsQuery.data, secret, plaintextCache]);

	// Map manifests + plaintext into UI messages.
	const messages: UIMessage[] = useMemo(() => {
		const manifests = manifestsQuery.data ?? [];
		return manifests.map((m) => ({
			id: m.id,
			rootHash: m.rootHash,
			sender: m.sender,
			sequence: m.sequence,
			createdAt: new Date(m.createdAt),
			plaintext: plaintextCache.get(m.rootHash) ?? null,
		}));
	}, [manifestsQuery.data, plaintextCache]);

	// --- Send ---
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);

	const onSend = useCallback(async () => {
		const text = draft.trim();
		if (!text || !secret || !me) return;
		setSending(true);
		try {
			const { ciphertext, ivHex } = encryptMessage(text, secret);
			const { rootHash } = await uploadBytes(ciphertext, "chat");
			await trpcClient.chat.append.mutate({
				matchId,
				rootHash,
				iv: ivHex,
			});
			// Optimistic local refetch.
			setDraft("");
			void manifestsQuery.refetch();
		} catch (err) {
			console.error("[chat send]", err);
		} finally {
			setSending(false);
		}
	}, [draft, secret, me, matchId, manifestsQuery]);

	// --- Wingman ---
	const wingmanMutation = useMutation(trpc.wingman.suggest.mutationOptions());
	const [wingmanIdeas, setWingmanIdeas] = useState<string[] | null>(null);

	const askWingman = useCallback(async () => {
		const myDisplayName = myProfileQuery.data?.displayName ?? "Me";
		const theirDisplayName = peerProfile?.displayName ?? "Them";
		const recent = messages
			.slice(-8)
			.filter((m) => m.plaintext !== null)
			.map((m) => ({
				from:
					m.sender.toLowerCase() === me?.toLowerCase()
						? ("me" as const)
						: ("them" as const),
				text: m.plaintext as string,
			}));
		if (recent.length === 0) {
			setWingmanIdeas([
				"hey, how's your week going?",
				"random — coffee saturday?",
				"what's the last thing that made you laugh?",
			]);
			return;
		}
		try {
			const res = await wingmanMutation.mutateAsync({
				matchId,
				recent,
				myDisplayName,
				theirDisplayName,
			});
			setWingmanIdeas(res.suggestions);
		} catch (err) {
			console.error("[wingman]", err);
		}
	}, [
		messages,
		me,
		myProfileQuery.data?.displayName,
		peerProfile?.displayName,
		matchId,
		wingmanMutation,
	]);

	// Auto-scroll on new messages.
	const scrollerRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = scrollerRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages.length, plaintextCache]);

	if (siwe.status !== "authenticated") {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
				<p className="t-body muted mb-4">Sign in to chat.</p>
				<Link to="/" className="btn btn-secondary">
					Back home
				</Link>
			</div>
		);
	}

	if (matchQuery.error) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
				<p className="t-body muted mb-4">{matchQuery.error.message}</p>
				<Link to="/matches" className="btn btn-secondary">
					Back to matches
				</Link>
			</div>
		);
	}

	const peerName = peerProfile?.displayName ?? "Match";
	const peerTone = toneFor(peer ?? "0x0");
	const peerInitial = initialFor(peerProfile?.displayName ?? peer ?? "?");

	return (
		<div
			className="flex min-h-screen flex-col"
			style={{ background: "var(--color-bg)" }}
		>
			{/* Top bar */}
			<div
				className="flex items-center justify-between border-b px-4 py-3"
				style={{ borderColor: "var(--color-divider)" }}
			>
				<button
					type="button"
					className="btn-tertiary flex items-center gap-1"
					onClick={() => void navigate({ to: "/matches" })}
					aria-label="back"
				>
					<Icons.ChevronLeft size={20} />
				</button>
				<div className="flex items-center gap-2">
					<Avatar tone={peerTone} initial={peerInitial} size={36} />
					<div className="t-h3">{peerName}</div>
				</div>
				<div
					className="flex items-center gap-1 t-caption"
					style={{ color: "var(--color-mint)", letterSpacing: "0.04em" }}
					title="Pactly never reads your chat. Messages are E2E encrypted between you and your match."
				>
					<Icons.Lock size={12} />
					E2E
				</div>
			</div>

			{/* Message list */}
			<div ref={scrollerRef} className="frame-scroll flex-1 px-4 py-4">
				{!secret ? (
					<div className="flex h-full items-center justify-center">
						<div
							className="t-body-sm"
							style={{ color: "var(--color-text-muted)" }}
						>
							{keyError
								? `Couldn't open this chat — ${keyError}`
								: "Setting up encryption…"}
						</div>
					</div>
				) : messages.length === 0 ? (
					<div className="flex h-full flex-col items-center justify-center text-center">
						<Icons.HeartsBig size={64} />
						<div className="t-h3 mt-3">Say hi</div>
						<p
							className="t-body-sm mt-1"
							style={{ color: "var(--color-text-muted)", maxWidth: 240 }}
						>
							Free chat. When you're both ready to meet, propose a pact.
						</p>
					</div>
				) : (
					<div className="flex flex-col gap-2">
						{messages.map((m) => (
							<MessageBubble
								key={m.id}
								mine={m.sender.toLowerCase() === me?.toLowerCase()}
								text={m.plaintext}
							/>
						))}
					</div>
				)}
			</div>

			{/* Wingman bar */}
			{secret ? (
				<div className="px-4">
					{wingmanIdeas ? (
						<div className="flex flex-col gap-1.5 pb-2">
							{wingmanIdeas.map((idea, i) => (
								<button
									// biome-ignore lint/suspicious/noArrayIndexKey: ideas are ephemeral
									key={i}
									type="button"
									className="text-left"
									onClick={() => {
										setDraft(idea);
										setWingmanIdeas(null);
									}}
									style={{
										padding: "10px 14px",
										borderRadius: 16,
										background: "var(--color-lavender-soft)",
										color: "#4B3D9A",
										fontSize: 14,
										border: "1px solid transparent",
									}}
								>
									{idea}
								</button>
							))}
							<button
								type="button"
								className="t-caption self-end"
								style={{
									color: "var(--color-text-muted)",
									letterSpacing: "0.04em",
									padding: "4px 8px",
								}}
								onClick={() => setWingmanIdeas(null)}
							>
								dismiss
							</button>
						</div>
					) : null}
					<button
						type="button"
						onClick={() => void askWingman()}
						disabled={wingmanMutation.isPending}
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: 8,
							padding: "8px 14px",
							borderRadius: 999,
							background: "var(--color-lavender-soft)",
							color: "#4B3D9A",
							fontSize: 13,
							fontWeight: 500,
							border: 0,
							marginBottom: 8,
						}}
					>
						<Icons.Sparkle size={14} />
						{wingmanMutation.isPending ? "thinking…" : "Need a clue?"}
					</button>
				</div>
			) : null}

			{/* Input bar */}
			<div
				className="flex items-center gap-2 border-t px-3 py-3"
				style={{ borderColor: "var(--color-divider)" }}
			>
				<input
					type="text"
					value={draft}
					onChange={(e) => setDraft(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.shiftKey) {
							e.preventDefault();
							void onSend();
						}
					}}
					disabled={!secret || sending}
					placeholder={secret ? "say hi…" : "preparing…"}
					className="input"
					style={{ flex: 1, height: 44 }}
				/>
				<button
					type="button"
					onClick={() => void onSend()}
					disabled={!secret || sending || !draft.trim()}
					className="btn btn-primary"
					style={{ height: 44, paddingInline: 18 }}
					aria-label="send"
				>
					<Icons.Send size={16} />
				</button>
			</div>
		</div>
	);
}

function MessageBubble({
	mine,
	text,
}: {
	mine: boolean;
	text: string | null;
}) {
	if (text === null) {
		// decrypt pending
		return (
			<div
				className="self-stretch"
				style={{
					display: "flex",
					justifyContent: mine ? "flex-end" : "flex-start",
				}}
			>
				<div
					className="skeleton"
					style={{
						height: 32,
						width: 140,
						borderRadius: 16,
					}}
				/>
			</div>
		);
	}
	return (
		<div
			style={{
				display: "flex",
				justifyContent: mine ? "flex-end" : "flex-start",
			}}
		>
			<div
				style={{
					maxWidth: "78%",
					padding: "8px 14px",
					borderRadius: 16,
					background: mine
						? "var(--color-coral-soft)"
						: "var(--color-lavender-soft)",
					color: mine ? "#A6443D" : "#4B3D9A",
					fontSize: 15,
					lineHeight: "20px",
					borderBottomRightRadius: mine ? 6 : 16,
					borderBottomLeftRadius: mine ? 16 : 6,
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
				}}
			>
				{text}
			</div>
		</div>
	);
}
