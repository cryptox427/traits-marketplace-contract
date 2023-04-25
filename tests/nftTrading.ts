const { Data } = require("./helpers/common");
import "@nomiclabs/hardhat-ethers";
import { ethers, upgrades } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import axios from "axios";

chai.use(solidity);
const { expect } = chai;

let data: any, owner: any, user1: any, user2: any;

const registrationId = 1;
const fromTokenId = [1, 2];
const toTokenId = [3, 4];
const tragetTrait = "Purple";
let signature = "";
const adminAddr4Api = "0x4696F32B4F26476e0d6071d99f196929Df56575b";
let totalTradedCount = 0;
let totalRegistrationCount = 0;
const targetRegId = 1;

async function deployContracts(displayLog = false) {
  let _nftContract: any;
  let _nftTradingContract: any;

  if (displayLog) {
    console.log("          - Deployer:        ", owner.address);
  }

  const _ERC721Artifacts = await ethers.getContractFactory("nft1");
  _nftContract = await _ERC721Artifacts.deploy();
  await _nftContract.deployed();

  if (displayLog) {
    console.log("          - _nftContract:    ", _nftContract.address);
  }

  const _NFTTradingArtifacts = await ethers.getContractFactory("NFTTrading");
  _nftTradingContract = await upgrades.deployProxy(
    _NFTTradingArtifacts,
    [_nftContract.address],
    { initializer: "initialize" }
  );
  await _nftTradingContract.deployed();
  if (displayLog) {
    console.log(
      "          - _nftTradingContract:   ",
      _nftTradingContract.address
    );
  }

  return [_nftContract, _nftTradingContract];
}

let nftContract: any, nftTradingContract: any;

describe("NFT Trading Contract", function () {
  before(async () => {
    data = new Data();
    await data.init();

    owner = data.deployerSigner;
    user1 = data.user1Signer;
    user2 = data.user2Signer;
  });

  describe("Contract Deployment", function () {
    before(async () => {
      [nftContract, nftTradingContract] = await deployContracts(true);

      // Mint NFT tokens
      let i: number;
      for (i = 0; i < fromTokenId.length; i++) {
        await nftContract.connect(user1).mint(fromTokenId[i]);
      }
      for (i = 0; i < toTokenId.length; i++) {
        await nftContract.connect(user2).mint(toTokenId[i]);
      }

      console.log("User 1", user1.address);
      console.log("User 2", user2.address);

      // Approve tokens to transfer
      for (i = 0; i < fromTokenId.length; i++) {
        await nftContract
          .connect(user1)
          .approve(nftTradingContract.address, fromTokenId[i]);
      }
      for (i = 0; i < toTokenId.length; i++) {
        await nftContract
          .connect(user2)
          .approve(nftTradingContract.address, toTokenId[i]);
      }
    });

    describe("Check Functionalities", () => {
      it("Owner should be the signer of trading contract", async () => {
        expect(await nftTradingContract.getSigner()).to.be.equal(owner.address);
      });

      it("User 1 should be owner of the nft token 1", async () => {
        expect(await nftContract.ownerOf(fromTokenId[0])).to.be.equal(
          user1.address
        );
      });

      it("User 2 should be owner of the nft token 2", async () => {
        expect(await nftContract.ownerOf(toTokenId[1])).to.be.equal(
          user2.address
        );
      });

      it("Trade NFT", async () => {
        await nftTradingContract.connect(owner).updateSigner(adminAddr4Api);
        const url =
          "http://localhost:8080/getSignature/" +
          user2.address +
          "/" +
          registrationId +
          "/" +
          toTokenId[0];
        const ret = await axios.get(url);
        signature = ret?.data?.resSig?.signature;
        const trait = ret?.data?.resColor;
        await nftTradingContract
          .connect(user1)
          .registerTrade(fromTokenId[0], tragetTrait);
        totalRegistrationCount++;
        await nftTradingContract
          .connect(user2)
          .buy(registrationId, toTokenId[0], trait, signature);
        expect(await nftContract.ownerOf(fromTokenId[0])).to.be.equal(
          user2.address
        );
        expect(await nftContract.ownerOf(toTokenId[0])).to.be.equal(
          user1.address
        );
        totalTradedCount++;
      });

      it("Get Traded Count", async () => {
        expect(await nftTradingContract.getTradedAmount()).to.be.equal(
          totalTradedCount
        );
      });

      it("Get List of Available Trades by Trait", async () => {
        const url =
          "http://localhost:8080/getSignature/" +
          user2.address +
          "/" +
          registrationId +
          "/" +
          toTokenId[1];
        const ret = await axios.get(url);
        signature = ret?.data?.resSig?.signature;
        await nftTradingContract
          .connect(user1)
          .registerTrade(fromTokenId[1], tragetTrait);
        totalRegistrationCount++;
        const listAvailable = await nftTradingContract.getListBySeller(
          user1.address
        );
        expect(await nftContract.ownerOf(fromTokenId[1])).to.be.equal(nftTradingContract.address)
        expect(listAvailable[1].from).to.be.equal(user1.address);
      });

      it('should withdraw the registration', async () => {
        const listAvailable = await nftTradingContract.getListBySeller(
            user1.address
        );
        const registration_id = parseInt(listAvailable[listAvailable.length - 1].registrationId.toString())
        await nftTradingContract
            .connect(user1)
            .withdraw(registration_id);
        const registration = await nftTradingContract.getRegistration(registration_id);
        expect(registration.withdrawn).to.be.equal(true);
        expect(await nftContract.ownerOf(registration.tokenId)).to.be.equal(user1.address)
        expect(await nftTradingContract.getRegistrationCount()).to.be.equal(totalRegistrationCount)
      });

      it('should get all registrations',  async function () {
        const list = await nftTradingContract.getRegistrationList();
        expect(list.length).to.be.equal(totalRegistrationCount)
      });
    });
  });
});
