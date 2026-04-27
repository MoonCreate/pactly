import escrowArtifact from "./artifacts/contracts/PactlyEscrow.sol/PactlyEscrow.json" with { type: "json" };
import reputationArtifact from "./artifacts/contracts/PactlyReputation.sol/PactlyReputation.json" with { type: "json" };
import treasuryArtifact from "./artifacts/contracts/PactlyTreasury.sol/PactlyTreasury.json" with { type: "json" };
import zgTestnetAddresses from "./ignition/deployments/chain-16602/deployed_addresses.json" with { type: "json" };
import { ZG_TESTNET_CHAIN_ID } from "./chain";

export * from "./chain";

export const escrowAbi = escrowArtifact.abi;
export const reputationAbi = reputationArtifact.abi;
export const treasuryAbi = treasuryArtifact.abi;

export interface Deployment {
  escrow: `0x${string}`;
  reputation: `0x${string}`;
  treasury: `0x${string}`;
  escrowImpl: `0x${string}`;
  reputationImpl: `0x${string}`;
}

const fromIgnition = (record: Record<string, string>): Deployment => ({
  escrow: record["PactlyModule#PactlyEscrow"] as `0x${string}`,
  reputation: record["PactlyModule#PactlyReputation"] as `0x${string}`,
  treasury: record["PactlyModule#PactlyTreasury"] as `0x${string}`,
  escrowImpl: record["PactlyModule#PactlyEscrowImpl"] as `0x${string}`,
  reputationImpl: record["PactlyModule#PactlyReputationImpl"] as `0x${string}`,
});

export const deployments: Record<number, Deployment> = {
  [ZG_TESTNET_CHAIN_ID]: fromIgnition(zgTestnetAddresses),
  // Aristotle entry will be appended once deployed:
  // [ZG_MAINNET_CHAIN_ID]: fromIgnition(zgMainnetAddresses),
};

export function getDeployment(chainId: number): Deployment {
  const d = deployments[chainId];
  if (!d) throw new Error(`No Pactly deployment for chainId ${chainId}`);
  return d;
}
