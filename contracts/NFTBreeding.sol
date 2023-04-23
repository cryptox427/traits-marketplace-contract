// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";

    error ToffeePetsCollectible__NotEnoughToken();
    error ToffeePetsCollectible__NotBreeding();
    error ToffeePetsCollectible__TokenNotOwned();
    error NotMatch_ParentTokenCount();

interface INFT1 {
    function ownerOf(uint256 tokenId) view external returns (address);
    function burn(uint256 tokenId) external;
}

interface INFT2 {
    function breedingMint(address _receiver) external returns (uint256);
}

contract NFTBreeding {
    using Counters for Counters.Counter;
    Counters.Counter private burnCounter;
    uint8 public constant PARENT_BREEDING_NUM = 7;
    INFT1 public nft1;
    INFT2 public nft2;

    constructor(
        address _nft1, address _nft2
    ){
        nft1 = INFT1(_nft1);
        nft2 = INFT2(_nft2);
    }

    function breed(
        uint256[] memory nft1Ids
    ) public returns (uint256) {
        uint8 tokenNum = uint8(nft1Ids.length);
        if (tokenNum != PARENT_BREEDING_NUM) {
            revert NotMatch_ParentTokenCount();
        }

        for (uint8 i = 0; i < tokenNum; i++) {
            if (nft1.ownerOf(nft1Ids[i]) != msg.sender) {
                revert ToffeePetsCollectible__TokenNotOwned();
            }
        }

        for (uint8 i = 0; i < tokenNum; i++) {
            nft1.burn(nft1Ids[i]);
        }

        uint256 newTokenId = nft2.breedingMint(msg.sender);
        burnCounter.increment();
        return newTokenId;
    }

    function burnAmount() public view returns (uint256) {
        return burnCounter.current();
    }
}
