import { useEffect, useRef, useState } from "react";
import { photoUrl } from "../../lib/photo";
import { Avatar, type Tone } from "./avatar";
import { CompatibilityChip } from "./compatibility-chip";
import * as Icons from "./icons";
import { PhotoBlock } from "./photo-block";

export interface SwipeCardPerson {
	address: `0x${string}`;
	displayName: string;
	tone: Tone;
	initial: string;
	photoRootHash?: string | null;
	profileRootHash?: string | null;
	hobbies?: string[];
	onchainTags?: string[];
	portfolioLabel?: string;
}

export type SwipeDir = "left" | "right";

export interface SwipeCardProps {
	person: SwipeCardPerson;
	isTop: boolean;
	depth?: number;
	dragLocked?: boolean;
	onSwipe?: (dir: SwipeDir, person: SwipeCardPerson) => void;
	onTap?: (person: SwipeCardPerson) => void;
}

const CARD_WIDTH = 320;
const SWIPE_THRESHOLD = CARD_WIDTH * 0.4;
const OVERLAY_THRESHOLD = CARD_WIDTH * 0.25;

export function SwipeCard({
	person,
	isTop,
	depth = 0,
	dragLocked = false,
	onSwipe,
	onTap,
}: SwipeCardProps) {
	const [drag, setDrag] = useState({ x: 0, y: 0, dragging: false });
	const startRef = useRef({ x: 0, y: 0 });
	const dragRef = useRef({ x: 0, y: 0 });
	const [exit, setExit] = useState<SwipeDir | null>(null);
	// Hard guard: each card can only resolve once. Defends against:
	//  - StrictMode double-invoking state updaters in dev (would otherwise
	//    schedule two `onSwipe` callbacks).
	//  - mouseup + touchend both firing on touch devices.
	const resolvedRef = useRef(false);

	const beginDrag = (e: React.PointerEvent | React.MouseEvent | React.TouchEvent) => {
		if (!isTop || dragLocked || resolvedRef.current) return;
		const p =
			"touches" in e
				? e.touches[0]
				: ("clientX" in e ? e : (e as unknown as { clientX: number; clientY: number }));
		startRef.current = { x: p!.clientX, y: p!.clientY };
		dragRef.current = { x: 0, y: 0 };
		setDrag({ x: 0, y: 0, dragging: true });
	};

	useEffect(() => {
		if (!drag.dragging) return;
		const move = (e: MouseEvent | TouchEvent) => {
			const p = "touches" in e ? e.touches[0] : e;
			if (!p) return;
			const next = {
				x: p.clientX - startRef.current.x,
				y: p.clientY - startRef.current.y,
			};
			dragRef.current = next;
			setDrag({ ...next, dragging: true });
		};
		const up = () => {
			if (resolvedRef.current) return;
			const { x, y } = dragRef.current;
			if (x > SWIPE_THRESHOLD) {
				resolvedRef.current = true;
				setExit("right");
				setDrag({ x, y, dragging: false });
				setTimeout(() => onSwipe?.("right", person), 220);
			} else if (x < -SWIPE_THRESHOLD) {
				resolvedRef.current = true;
				setExit("left");
				setDrag({ x, y, dragging: false });
				setTimeout(() => onSwipe?.("left", person), 220);
			} else {
				dragRef.current = { x: 0, y: 0 };
				setDrag({ x: 0, y: 0, dragging: false });
			}
		};
		window.addEventListener("mousemove", move);
		window.addEventListener("mouseup", up);
		window.addEventListener("touchmove", move);
		window.addEventListener("touchend", up);
		return () => {
			window.removeEventListener("mousemove", move);
			window.removeEventListener("mouseup", up);
			window.removeEventListener("touchmove", move);
			window.removeEventListener("touchend", up);
		};
	}, [drag.dragging, onSwipe, person]);

	const rotation = isTop
		? Math.max(-15, Math.min(15, (drag.x / CARD_WIDTH) * 15))
		: 0;
	const overlayProgress = Math.min(1, Math.abs(drag.x) / OVERLAY_THRESHOLD);

	let transform: string;
	if (exit === "right") {
		transform = `translate(800px, ${drag.y}px) rotate(30deg)`;
	} else if (exit === "left") {
		transform = `translate(-800px, ${drag.y}px) rotate(-30deg)`;
	} else if (isTop) {
		transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`;
	} else {
		transform = `translateY(${depth * 8}px) scale(${1 - depth * 0.04})`;
	}

	const transition = drag.dragging
		? "none"
		: exit
			? "transform 220ms cubic-bezier(0.4, 0.1, 0.6, 1)"
			: "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";

	const handleClick = () => {
		if (!isTop) return;
		if (Math.abs(drag.x) < 6 && Math.abs(drag.y) < 6) onTap?.(person);
	};

	return (
		<div
			className="no-select"
			onMouseDown={beginDrag}
			onTouchStart={beginDrag}
			onClick={handleClick}
			style={{
				position: "absolute",
				inset: 0,
				zIndex: 10 - depth,
				transform,
				transition,
				opacity: isTop ? 1 : Math.max(0, 1 - depth * 0.15),
				cursor: isTop ? (drag.dragging ? "grabbing" : "grab") : "default",
			}}
		>
			<div
				style={{
					width: "100%",
					height: "100%",
					borderRadius: "var(--radius-card)",
					overflow: "hidden",
					background: "var(--color-surface)",
					boxShadow: isTop ? "var(--shadow-card-lg)" : "var(--shadow-card)",
					display: "flex",
					flexDirection: "column",
					position: "relative",
				}}
			>
				{/* Photo (70%) */}
				<div
					style={{
						flex: "0 0 70%",
						borderRadius: 0,
						position: "relative",
						overflow: "hidden",
					}}
				>
					{photoUrl(person.photoRootHash) ? (
						<img
							src={photoUrl(person.photoRootHash) ?? ""}
							alt={person.displayName}
							draggable={false}
							style={{
								width: "100%",
								height: "100%",
								objectFit: "cover",
								userSelect: "none",
							}}
							onError={(e) => {
								(e.target as HTMLImageElement).style.display = "none";
							}}
						/>
					) : (
						<PhotoBlock
							tone={person.tone}
							label={`${person.displayName.toLowerCase()} · photo`}
							style={{ width: "100%", height: "100%" }}
						/>
					)}
					{/* Avatar floats top-right as a visual handle while photos load. */}
					<div
						style={{
							position: "absolute",
							top: 14,
							right: 14,
						}}
					>
						<Avatar tone={person.tone} initial={person.initial} size={40} />
					</div>

					{/* AI compatibility chip — only resolves for the top card so we don't
					    burn LLM calls on cards underneath. */}
					{isTop ? (
						<div
							style={{
								position: "absolute",
								top: 14,
								left: 14,
								pointerEvents: "none",
							}}
						>
							<CompatibilityChip address={person.address} />
						</div>
					) : null}
				</div>

				{/* Right swipe overlay (MATCH stamp) */}
				{isTop && drag.x > 0 ? (
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: `linear-gradient(135deg, rgba(148,210,161,${0.35 * overlayProgress}), rgba(255,140,122,${0.45 * overlayProgress}))`,
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "flex-start",
							padding: 24,
							pointerEvents: "none",
						}}
					>
						<div
							style={{
								transform: `rotate(-12deg) scale(${0.9 + overlayProgress * 0.3})`,
								opacity: overlayProgress,
								border: "4px solid var(--color-coral)",
								color: "var(--color-coral)",
								padding: "6px 16px",
								borderRadius: 12,
								fontWeight: 700,
								fontSize: 22,
								letterSpacing: "0.08em",
								background: "rgba(255,255,255,0.92)",
							}}
						>
							MATCH
						</div>
					</div>
				) : null}

				{/* Left swipe overlay (PASS stamp) */}
				{isTop && drag.x < 0 ? (
					<div
						style={{
							position: "absolute",
							inset: 0,
							background: `linear-gradient(135deg, rgba(244,164,164,${0.45 * overlayProgress}), rgba(244,164,164,${0.2 * overlayProgress}))`,
							display: "flex",
							alignItems: "flex-start",
							justifyContent: "flex-end",
							padding: 24,
							pointerEvents: "none",
						}}
					>
						<div
							style={{
								transform: `rotate(12deg) scale(${0.9 + overlayProgress * 0.3})`,
								opacity: overlayProgress,
								border: "4px solid var(--color-rose)",
								color: "#A6443D",
								padding: "6px 16px",
								borderRadius: 12,
								fontWeight: 700,
								fontSize: 22,
								letterSpacing: "0.08em",
								background: "rgba(255,255,255,0.92)",
							}}
						>
							PASS
						</div>
					</div>
				) : null}

				{/* Bottom info (30%) */}
				<div
					style={{
						flex: 1,
						padding: "16px 18px",
						display: "flex",
						flexDirection: "column",
						gap: 8,
					}}
				>
					<div className="flex items-center justify-between">
						<div
							style={{
								fontSize: 22,
								fontWeight: 600,
								letterSpacing: "-0.02em",
							}}
						>
							{person.displayName}
						</div>
						<div
							className="t-mono-sm"
							style={{ color: "var(--color-text-soft)" }}
						>
							{person.address.slice(0, 6)}…{person.address.slice(-4)}
						</div>
					</div>
					{(person.onchainTags?.length || person.portfolioLabel) ? (
						<div className="flex flex-wrap gap-1.5">
							{person.onchainTags?.slice(0, 2).map((c) => (
								<div key={c} className="chip chip-onchain">
									{c}
								</div>
							))}
							{person.portfolioLabel ? (
								<div className="chip chip-peach-soft">
									{person.portfolioLabel}
								</div>
							) : null}
						</div>
					) : (
						<div className="flex items-center gap-1.5 t-body-sm muted">
							<Icons.Sparkle size={12} /> tap to learn more
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
