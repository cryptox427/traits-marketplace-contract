import cliTable = require("cli-table");
import "@nomiclabs/hardhat-ethers";
import {ethers, upgrades} from "hardhat";
import chai from "chai";
import {solidity} from "ethereum-waffle";

chai.use(solidity);

// make sure to have ethers.js 5.X required, else this will fail!

async function main() {
    const accounts = await ethers.getSigners();
    console.log("    Deployer                     ", accounts[0].address);

    let _nftContract: any;

    const _ERC721Artifacts = await ethers.getContractFactory("nft1");
    _nftContract = await _ERC721Artifacts.deploy();
    await _nftContract.deployed();

    console.log("          - _nftContract:    ", _nftContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
