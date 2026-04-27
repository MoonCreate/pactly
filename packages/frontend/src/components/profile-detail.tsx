import { Avatar, type Tone } from "./ui/avatar";
import { CompatibilityChip } from "./ui/compatibility-chip";
import * as Icons from "./ui/icons";
import { PhotoBlock } from "./ui/photo-block";
import { photoUrl } from "../lib/photo";
import { useProfileBody } from "../lib/profile-fetch";
import { TIER_DISPLAY } from "../lib/portfolio";

export interface ProfileDetailPerson {
	address: `0x${string}`;
	displayName: string;
	tone: Tone;
	initial: string;
	photoRootHash?: string | null;
	profileRootHash?: string | null;
}

export interface ProfileDetailProps {
	person: ProfileDetailPerson;
	matched?: boolean;
	onMatch?: () => void;
	onChat?: () => void;
	onClose?: () => void;
	/** Compact title bar: render in the desktop panel; the drawer has its own. */
	hideTitleBar?: boolean;
}

export function ProfileDetail({
	person,
	matched = false,
	onMatch,
	onChat,
	onClose,
	hideTitleBar,
}: ProfileDetailProps) {
	const body = useProfileBody(person.profileRootHash);

	return (
		<div className="flex h-full flex-col">
			{!hideTitleBar ? (
				<div className="flex items-center justify-between px-4 py-3">
					<div className="t-h3">Profile</div>
					{onClose ? (
						<button
							type="button"
							className="btn-tertiary"
							onClick={onClose}
							aria-label="close"
						>
							<Icons.X size={18} />
						</button>
					) : null}
				</div>
			) : null}

			<div className="flex-1 overflow-y-auto px-4 pb-4">
				{/* Photo */}
				<div className="px-0">
					<DetailPhoto person={person} />
				</div>

				{/* Header */}
				<div className="pt-4">
					<div className="flex items-end justify-between gap-3">
						<div>
							<div className="t-h1">{person.displayName}</div>
							<div className="t-mono-sm mt-1" style={{ color: "var(--color-text-soft)" }}>
								{person.address.slice(0, 6)}…{person.address.slice(-4)}
							</div>
						</div>
						{body.data?.portfolio ? (
							<div className="chip chip-peach-soft">
								{TIER_DISPLAY[body.data.portfolio.tier].icon}{" "}
								<span className="capitalize">
									{TIER_DISPLAY[body.data.portfolio.tier].label}
								</span>
							</div>
						) : null}
					</div>

					{/* AI-scored compatibility */}
					<div className="mt-3">
						<CompatibilityChip address={person.address} variant="full" />
					</div>

					{body.data?.bio ? (
						<p className="t-body mt-3" style={{ textWrap: "pretty" }}>
							"{body.data.bio}"
						</p>
					) : null}
				</div>

				{/* Hobbies */}
				{body.data?.hobbies?.length ? (
					<Section label="Hobbies">
						<div className="flex flex-wrap gap-2">
							{body.data.hobbies.map((h) => (
								<div key={h} className="chip">
									{h}
								</div>
							))}
						</div>
					</Section>
				) : null}

				{/* On chain */}
				{body.data?.onChain?.tags?.length ? (
					<Section label="On chain">
						<div className="flex flex-wrap gap-2">
							{body.data.onChain.tags.map((t) => (
								<div key={t} className="chip chip-onchain">
									{t}
								</div>
							))}
						</div>
					</Section>
				) : null}

				{/* Socials */}
				{body.data?.socials &&
				(body.data.socials.x || body.data.socials.instagram || body.data.socials.github) ? (
					<Section
						label="Socials"
						hint={
							<span style={{ textTransform: "none", letterSpacing: 0 }}>
								· unverified
							</span>
						}
					>
						<div className="flex flex-wrap gap-2">
							{body.data.socials.x ? (
								<div className="chip">𝕏 @{body.data.socials.x}</div>
							) : null}
							{body.data.socials.instagram ? (
								<div className="chip">📸 @{body.data.socials.instagram}</div>
							) : null}
							{body.data.socials.github ? (
								<div className="chip">{"</> "}{body.data.socials.github}</div>
							) : null}
						</div>
					</Section>
				) : null}

				{/* States */}
				{body.isPending ? (
					<div className="mt-4 flex flex-col gap-2">
						<div className="skeleton" style={{ height: 18, width: "60%" }} />
						<div className="skeleton" style={{ height: 14, width: "80%" }} />
						<div className="skeleton" style={{ height: 14, width: "50%" }} />
					</div>
				) : null}
				{!body.isPending && !body.data ? (
					<p
						className="t-body-sm mt-4"
						style={{ color: "var(--color-text-muted)" }}
					>
						This profile hasn't uploaded extended details yet.
					</p>
				) : null}
			</div>

			{/* CTA footer */}
			<div
				className="border-t px-4 py-3"
				style={{ borderColor: "var(--color-divider)" }}
			>
				{matched ? (
					<button
						type="button"
						className="btn btn-primary btn-block"
						onClick={onChat}
					>
						Open chat
					</button>
				) : (
					<div className="flex gap-2">
						{onClose ? (
							<button
								type="button"
								className="btn btn-secondary"
								style={{ flex: 1, height: 48 }}
								onClick={onClose}
							>
								Close
							</button>
						) : null}
						<button
							type="button"
							className="btn btn-primary"
							style={{ flex: 2 }}
							onClick={onMatch}
						>
							<Icons.Heart size={16} fill="white" /> Match
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

function DetailPhoto({ person }: { person: ProfileDetailPerson }) {
	const url = photoUrl(person.photoRootHash);
	if (url) {
		return (
			<img
				src={url}
				alt={person.displayName}
				style={{
					width: "100%",
					height: 320,
					objectFit: "cover",
					borderRadius: "var(--radius-photo)",
				}}
			/>
		);
	}
	return (
		<div style={{ position: "relative" }}>
			<PhotoBlock
				tone={person.tone}
				label={`${person.displayName.toLowerCase()} · photo`}
				style={{
					width: "100%",
					height: 320,
					borderRadius: "var(--radius-photo)",
				}}
			/>
			<div style={{ position: "absolute", top: 16, right: 16 }}>
				<Avatar tone={person.tone} initial={person.initial} size={56} />
			</div>
		</div>
	);
}

function Section({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="mt-5">
			<div className="t-caption mb-2">
				{label}{" "}
				{hint ? (
					<span className="muted" style={{ fontWeight: 400 }}>
						{hint}
					</span>
				) : null}
			</div>
			{children}
		</div>
	);
}
