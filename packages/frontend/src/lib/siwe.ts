import { createSiweMessage } from "viem/siwe";

export function buildSiweMessage(args: {
	address: `0x${string}`;
	chainId: number;
	nonce: string;
	expiresAt: Date;
}) {
	return createSiweMessage({
		address: args.address,
		chainId: args.chainId,
		domain: window.location.host,
		uri: window.location.origin,
		version: "1",
		nonce: args.nonce,
		issuedAt: new Date(),
		expirationTime: args.expiresAt,
		statement: "Sign in to Pactly. This signature does not cost any gas.",
	});
}
