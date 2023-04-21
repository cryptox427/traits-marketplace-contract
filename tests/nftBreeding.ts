const { Data } = require("./helpers/common");
import "@nomiclabs/hardhat-ethers";
import { ethers, upgrades } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import axios from "axios";

chai.use(solidity);
const { expect } = chai;
let data: any, owner: any, user1: any, user2: any;
const fromTokenId = [51,52,53,54,55,56,57];
const fromTokenId2 = [61,62,63,64,65,66,67];

async function deployContracts(displayLog = false) {
    let _nft1Contract: any;
    let _nft2Contract: any;
    let _nftBreedingContract: any;

    if (displayLog) {
        console.log("          - Deployer:        ", owner.address);
    }

    const NFT1 = await ethers.getContractFactory("nft1");
    _nft1Contract = await NFT1.deploy();
    await _nft1Contract.deployed();

    if (displayLog) {
        console.log("          - _nftContract:    ", _nft1Contract.address);
    }

    const NFT2 = await ethers.getContractFactory("nft2");
    _nft2Contract = await NFT2.deploy();
    await _nft2Contract.deployed();

    if (displayLog) {
        console.log("          - _nftContract:    ", _nft2Contract.address);
    }

    const NFTBreeding = await ethers.getContractFactory("NFTBreeding");
    _nftBreedingContract = await NFTBreeding.deploy(_nft1Contract.address, _nft2Contract.address);
    await _nftBreedingContract.deployed();

    if (displayLog) {
        console.log("          - _nftBreedingContract:    ", _nftBreedingContract.address);
    }

    return [_nft1Contract, _nft2Contract, _nftBreedingContract];
}

let nft1Contract: any, nft2Contract:any, nftBreedingContract: any;


describe("NFT breding Contract", function () {
    before(async () => {
        data = new Data();
        await data.init();

        owner = data.deployerSigner;
        user1 = data.user1Signer;
        user2 = data.user2Signer;
    });

    describe("Contract deployment", function () {
        before(async () => {
            [nft1Contract, nft2Contract, nftBreedingContract] = await deployContracts(true);

            // Mint NFT tokens
            let i: number;
            for (i = 0; i < fromTokenId.length; i++) {
                await nft1Contract.connect(user1).mint(fromTokenId[i]);
            }

            // Approve tokens to transfer
            for (i = 0; i < fromTokenId.length; i++) {
                await nft1Contract
                    .connect(user1)
                    .approve(nftBreedingContract.address, fromTokenId[i]);
            }

            // Mint NFT tokens
            for (i = 0; i < fromTokenId2.length; i++) {
                await nft1Contract.connect(user2).mint(fromTokenId2[i]);
            }

            // Approve tokens to transfer
            for (i = 0; i < fromTokenId2.length; i++) {
                await nft1Contract
                    .connect(user2)
                    .approve(nftBreedingContract.address, fromTokenId2[i]);
            }

            // Set burner
            await nft1Contract.setBurner(nftBreedingContract.address);
        })

        it('should check ownership of from tokens', async function () {
            expect(await nft1Contract.balanceOf(user1.address)).to.equal(7);
        });

        it('should breed', async function () {
            const id = await nftBreedingContract.connect(user1).breed(fromTokenId);
            console.log(id, '----------id')
            expect(await nft1Contract.balanceOf(user1.address)).to.equal(0);
            expect(await nft2Contract.balanceOf(user1.address)).to.equal(1);

            const id2 = await nftBreedingContract.connect(user2).breed(fromTokenId2);
            console.log(id2, '----------id')
            expect(await nft1Contract.balanceOf(user2.address)).to.equal(0);
            expect(await nft2Contract.balanceOf(user2.address)).to.equal(1);
        });

        it('should get breed amount', async function () {
            const amount = await nftBreedingContract.burnAmount();
            console.log(amount, '------amount')
            expect(await nftBreedingContract.burnAmount()).to.equal(2);
        });
    })
})
