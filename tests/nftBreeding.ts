import {accessSync} from "fs";

const { Data } = require("./helpers/common");
import "@nomiclabs/hardhat-ethers";
import { ethers, upgrades } from "hardhat";
import chai from "chai";
import { solidity } from "ethereum-waffle";
import axios from "axios";

chai.use(solidity);
const { expect } = chai;
let data: any, owner: any, user1: any, user2: any;
const fromTokenId = [1,2,4,5,7,9, 11];
const fromTokenId2 = [21,22,24,26,31,32, 36];
const signer = "0x4696F32B4F26476e0d6071d99f196929Df56575b";

async function deployContracts(displayLog = false) {
    let _nft1Contract: any;
    let _nft2Contract: any;
    let _nft3Contract: any;
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

    const NFT3 = await ethers.getContractFactory("nft3");
    _nft3Contract = await NFT3.deploy();
    await _nft3Contract.deployed();

    if (displayLog) {
        console.log("          - _nftContract:    ", _nft3Contract.address);
    }

    const NFTBreeding = await ethers.getContractFactory("NFTBreeding");
    _nftBreedingContract = await NFTBreeding.deploy(_nft1Contract.address, _nft2Contract.address, _nft3Contract.address, signer);
    await _nftBreedingContract.deployed();

    if (displayLog) {
        console.log("          - _nftBreedingContract:    ", _nftBreedingContract.address);
    }

    return [_nft1Contract, _nft2Contract, _nft3Contract, _nftBreedingContract];
}

let nft1Contract: any, nft2Contract:any, nft3Contract:any, nftBreedingContract: any;


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
            [nft1Contract, nft2Contract, nft3Contract, nftBreedingContract] = await deployContracts(true);

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

        it('should check signer of breeding', async function () {
            expect(await nftBreedingContract.getBreedingSigner()).to.equal(signer);
        });

        it('should breed', async function () {
            let response : any = await axios.get(`http://localhost:8080/signature/breedingV1?ids=${JSON.stringify(fromTokenId)}&address=${user1.address}&type=1`)
            if (response.data.success && response.data.resSig.signature) {
                console.log('response----', response.data.resSig.signature)
                await nftBreedingContract.connect(user1).breed(fromTokenId, response.data.resSig.signature, 1);
                expect(await nft1Contract.balanceOf(user1.address)).to.equal(0);
                expect(await nft2Contract.balanceOf(user1.address)).to.equal(1);
            } else {
                expect(1).to.equal(2);
            }

            // response = await axios.get(`http://localhost:8080/signature/breedingV2?ids=${JSON.stringify(fromTokenId2)}&address=${user2.address}&type=2`)
            // if (response.data.success && response.data.resSig.signature) {
            //     console.log('response----', response.data.resSig.signature)
            //     await nftBreedingContract.connect(user2).breed(fromTokenId2, response.data.resSig.signature, 2);
            //     expect(await nft1Contract.balanceOf(user2.address)).to.equal(0);
            //     expect(await nft3Contract.balanceOf(user2.address)).to.equal(1);
            // } else {
            //     expect(1).to.equal(2);
            // }

        });

        it('should get breed amount', async function () {
            const amount = await nftBreedingContract.getBreedingCounter();
            console.log(amount, '------amount')
            expect(await nftBreedingContract.getBreedingCounter()).to.equal(1);
        });
    })
})
