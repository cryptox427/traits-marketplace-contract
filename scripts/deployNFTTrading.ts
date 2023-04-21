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

    let _nftTradingContract: any;
    let _nftContract: any;

    const _ERC721Artifacts = await ethers.getContractFactory("nft1");
    _nftContract = await _ERC721Artifacts.deploy();
    await _nftContract.deployed();

    console.log("          - _nftContract:    ", _nftContract.address);

    const _nftTradingArtifacts = await ethers.getContractFactory("NFTTrading");
    _nftTradingContract = await upgrades.deployProxy(
        _nftTradingArtifacts,
        [_nftContract.address],
        {initializer: "initialize"}
    );
    await _nftTradingContract.deployed();
    // _nftTradingContract = await upgrades.upgradeProxy("0x48D1CcB09f771788F59c8aAAB613936eDfA267b7", _nftTradingArtifacts);
    // await _nftTradingContract.deployed();

    console.log("          - _nftTradingContract: ", _nftTradingContract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
