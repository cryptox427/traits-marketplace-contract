// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";


    error NotEnoughToken();
    error NotBreeding();
    error TokenNotOwned();
    error NotMatch_ParentTokenCount();

interface INFT1 {
    function ownerOf(uint256 tokenId) view external returns (address);

    function burn(uint256 tokenId) external;
}

interface INFT2 {
    function breedingMint(address _receiver) external returns (uint256);
}

contract NFTBreeding is ReentrancyGuard, Ownable, Pausable {
    address signer;
    using Counters for Counters.Counter;
    Counters.Counter private breedingCounter;
    uint8 public constant PARENT_BREEDING_NUM = 7;
    INFT1 public nft1;
    INFT2 public nft2;
    INFT2 public nft3;

    constructor(
        address _nft1, address _nft2, address _nft3, address _signer
    ){
        nft1 = INFT1(_nft1);
        nft2 = INFT2(_nft2);
        nft3 = INFT2(_nft3);
        signer = _signer;
    }

    function breed(
        uint256[] memory nft1Ids,
        bytes memory _signature,
        uint _type
    ) public nonReentrant whenNotPaused returns (uint256) {
        require(verify(abi.encodePacked(msg.sender, _type), _signature), "Incorrect Breeding");
        uint8 tokenNum = uint8(nft1Ids.length);
        if (tokenNum != PARENT_BREEDING_NUM) {
            revert NotMatch_ParentTokenCount();
        }

        for (uint8 i = 0; i < tokenNum; i++) {
            if (nft1.ownerOf(nft1Ids[i]) != msg.sender) {
                revert TokenNotOwned();
            }
        }

        for (uint8 i = 0; i < tokenNum; i++) {
            nft1.burn(nft1Ids[i]);
        }

        uint256 newTokenId;
        if (_type == 1) {
            newTokenId = nft2.breedingMint(msg.sender);
        } else {
            newTokenId = nft3.breedingMint(msg.sender);
        }
        breedingCounter.increment();
        return newTokenId;
    }

    function getBreedingCounter() public view returns (uint256) {
        return breedingCounter.current();
    }

    function verify(
        bytes memory _input,
        bytes memory _signature
    ) private view returns (bool) {
        bytes32 messageHash = getMessageHash(_input);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        return recoverSigner(ethSignedMessageHash, _signature) == signer;
    }

    function getMessageHash(bytes memory _input) private pure returns (bytes32) {
        return keccak256(abi.encodePacked(_input));
    }

    function getEthSignedMessageHash(bytes32 _messageHash)
    private
    pure
    returns (bytes32)
    {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg

        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
        keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", _messageHash)
        );
    }

    function recoverSigner(bytes32 _ethSignedMessageHash, bytes memory _signature)
    private
    pure
    returns (address)
    {
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(_signature);

        return ecrecover(_ethSignedMessageHash, v, r, s);
    }

    function splitSignature(bytes memory sig)
    private
    pure
    returns (
        bytes32 r,
        bytes32 s,
        uint8 v
    )
    {
        require(sig.length == 65, "invalid signature length");

        assembly {
        /*
        First 32 bytes stores the length of the signature

        add(sig, 32) = pointer of sig + 32
        effectively, skips first 32 bytes of signature

        mload(p) loads next 32 bytes starting at the memory address p into memory
        */

        // first 32 bytes, after the length prefix
            r := mload(add(sig, 32))
        // second 32 bytes
            s := mload(add(sig, 64))
        // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(sig, 96)))
        }

        // implicitly return (r, s, v)
    }

    function updateBreedingSigner(address _signer) external onlyOwner {
        signer = _signer;
    }

    function getBreedingSigner() external view returns (address) {
        return signer;
    }

    function updateNFTContracts(address _nft1, address _nft2, address _nft3) external onlyOwner {
        nft1 = INFT1(_nft1);
        nft2 = INFT2(_nft2);
        nft3 = INFT2(_nft3);
    }
}
