import cliTable = require("cli-table");
import "@nomiclabs/hardhat-ethers";
import {ethers, upgrades, run} from "hardhat";
import chai from "chai";
import {solidity} from "ethereum-waffle";

chai.use(solidity);
// make sure to have ethers.js 5.X required, else this will fail!

async function main() {
    const accounts = await ethers.getSigners();
    console.log("    Deployer                     ", accounts[0].address);

    let _nftTradingContract: any;
    let _nftContract1 = "0xc6237F81a4E638932369EEBF6128629E68754f82";

    const _nftTradingArtifacts = await ethers.getContractFactory("NFTTrading");
    _nftTradingContract = await upgrades.deployProxy(
        _nftTradingArtifacts,
        [_nftContract1],
        {initializer: "initialize"}
    );
    await _nftTradingContract.deployed();

    console.log("          - _nftTradingContract: ", _nftTradingContract.address);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
