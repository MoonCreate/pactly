import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("PactlyModule", (m) => {
  const owner = m.getAccount(0);

  // Treasury — non-upgradeable receiver.
  const treasury = m.contract("PactlyTreasury");

  // Reputation: impl + ERC1967 proxy initialised with the deployer as owner.
  const reputationImpl = m.contract("PactlyReputation", [], { id: "PactlyReputationImpl" });
  const reputationInit = m.encodeFunctionCall(reputationImpl, "initialize", [owner]);
  const reputationProxy = m.contract("PactlyProxy", [reputationImpl, reputationInit], {
    id: "PactlyReputationProxy",
  });
  const reputation = m.contractAt("PactlyReputation", reputationProxy, {
    id: "PactlyReputation",
  });

  // Escrow: impl + ERC1967 proxy initialised with treasury, reputation, owner.
  const escrowImpl = m.contract("PactlyEscrow", [], { id: "PactlyEscrowImpl" });
  const escrowInit = m.encodeFunctionCall(escrowImpl, "initialize", [
    treasury,
    reputation,
    owner,
  ]);
  const escrowProxy = m.contract("PactlyProxy", [escrowImpl, escrowInit], {
    id: "PactlyEscrowProxy",
  });
  const escrow = m.contractAt("PactlyEscrow", escrowProxy, { id: "PactlyEscrow" });

  // Wire the escrow into reputation so it can write stats.
  m.call(reputation, "setEscrow", [escrow]);

  return { treasury, reputation, escrow, reputationImpl, escrowImpl };
});
