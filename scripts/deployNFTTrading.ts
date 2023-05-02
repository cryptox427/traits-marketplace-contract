import cliTable = require("cli-table");
import "@nomiclabs/hardhat-ethers";
import {ethers, upgrades, run} from "hardhat";
import chai from "chai";
import {solidity} from "ethereum-waffle";

chai.use(solidity);
const signer = "0x4696F32B4F26476e0d6071d99f196929Df56575b";
// make sure to have ethers.js 5.X required, else this will fail!

async function main() {
    const accounts = await ethers.getSigners();
    console.log("    Deployer                     ", accounts[0].address);

    let _nftTradingContract: any;
    let _nftContract1: any;
    let _nftContract2: any;
    let _nftContract3: any;
    let _nftBreedingContract: any;

    const NFT1 = await ethers.getContractFactory("nft1");
    _nftContract1 = await NFT1.deploy();
    await _nftContract1.deployed();

    console.log("          - _nft1Contract:    ", _nftContract1.address);

    const NFT2 = await ethers.getContractFactory("nft2");
    _nftContract2 = await NFT2.deploy();
    await _nftContract2.deployed();

    console.log("          - _nft2Contract:    ", _nftContract2.address);

    const NFT3 = await ethers.getContractFactory("nft3");
    _nftContract3 = await NFT3.deploy();
    await _nftContract3.deployed();

    console.log("          - _nft3Contract:    ", _nftContract3.address);

    const _nftTradingArtifacts = await ethers.getContractFactory("NFTTrading");
    _nftTradingContract = await upgrades.deployProxy(
        _nftTradingArtifacts,
        [_nftContract1.address],
        {initializer: "initialize"}
    );
    await _nftTradingContract.deployed();

    console.log("          - _nftTradingContract: ", _nftTradingContract.address);

    const NFTBreeding = await ethers.getContractFactory("NFTBreeding");
    _nftBreedingContract = await NFTBreeding.deploy(
        _nftContract1.address,
        _nftContract2.address,
        _nftContract3.address,
        signer
    )
    await _nftBreedingContract.deployed();

    console.log("          - _nftBreedingContract: ", _nftBreedingContract.address);
    // _nftTradingContract = await upgrades.upgradeProxy("0x48D1CcB09f771788F59c8aAAB613936eDfA267b7", _nftTradingArtifacts);
    // await _nftTradingContract.deployed();


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
