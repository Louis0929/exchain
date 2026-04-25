const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ExChainCertificate", function () {
  let ExChainCertificate;
  let exChainCertificate;
  let owner;
  let partyA;
  let partyB;

  beforeEach(async function () {
    ExChainCertificate = await ethers.getContractFactory("ExChainCertificate");
    [owner, partyA, partyB] = await ethers.getSigners();
    exChainCertificate = await ExChainCertificate.deploy();
  });

  describe("Deployment", function () {
    it("should set the correct name and symbol", async function () {
      expect(await exChainCertificate.name()).to.equal("ExChain Relationship Certificate");
      expect(await exChainCertificate.symbol()).to.equal("EXCR");
    });

    it("should start token id at 1", async function () {
      await exChainCertificate.safeMint(
        owner.address,
        partyA.address,
        partyB.address,
        1000000000,
        Date.now() + 365 * 24 * 3600,
        "https://example.com/metadata/1"
      );
      expect(await exChainCertificate.ownerOf(1)).to.equal(owner.address);
    });
  });

  describe("Minting", function () {
    it("should mint a certificate to the specified address", async function () {
      const totalLocked = 1000000000;
      const deadline = Date.now() + 365 * 24 * 3600;

      await exChainCertificate.safeMint(
        owner.address,
        partyA.address,
        partyB.address,
        totalLocked,
        deadline,
        "https://example.com/metadata/1"
      );

      const tokenId = 1;
      const metadata = await exChainCertificate.certificateMetadata(tokenId);
      expect(metadata.partyA).to.equal(partyA.address);
      expect(metadata.partyB).to.equal(partyB.address);
      expect(metadata.totalLocked).to.equal(totalLocked);
      expect(metadata.deadline).to.be.closeTo(deadline, 1000);
    });

    it("should emit CertificateMinted event", async function () {
      const totalLocked = 1000000000;
      const deadline = Date.now() + 365 * 24 * 3600;

      await expect(
        exChainCertificate.safeMint(
          owner.address,
          partyA.address,
          partyB.address,
          totalLocked,
          deadline,
          "https://example.com/metadata/1"
        )
      )
        .to.emit(exChainCertificate, "CertificateMinted")
        .withArgs(1, partyA.address, partyB.address, totalLocked, deadline);
    });
  });

  describe("Metadata", function () {
    it("should return correct token URI", async function () {
      const uri = "https://example.com/metadata/1";
      await exChainCertificate.safeMint(
        owner.address,
        partyA.address,
        partyB.address,
        1000000000,
        Date.now() + 365 * 24 * 3600,
        uri
      );
      expect(await exChainCertificate.tokenURI(1)).to.equal(uri);
    });
  });
});
