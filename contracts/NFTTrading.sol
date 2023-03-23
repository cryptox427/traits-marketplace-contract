// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.8.0;

import { EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import { Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import { Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
// import "hardhat/console.sol";

contract LibraryLockDataLayout {
  bool public initializedFlag;
}

contract NFTTradingWrapper is LibraryLockDataLayout {
    mapping(uint256 => Registration) internal registrations;

    event NewRegistration(
        uint256 indexed registrationId,
        address indexed owner
    );
    event Traded(address indexed from, address indexed to, uint256 fromTokenId, uint256 toTokenId);
    event Withdrawn(address indexed from, uint256 fromTokenId);

    struct Registration {
        uint256 registrationId;
        address from;
        address to;
        uint256 tokenId;
        string targetTrait;
        bool traded;
        uint256 timeRegistered;
        uint256 timeTraded;
        bool withdrawn;
        uint256 timeWithdrawn;
    }

    address internal nftContract;

    function initialized(address _nftContract) internal {
        nftContract = _nftContract;
    }
}

contract NFTTrading is NFTTradingWrapper, OwnableUpgradeable, ReentrancyGuardUpgradeable, ERC721Holder {
    using Strings for uint256;
    using Counters for Counters.Counter;

    address private signer;
    Counters.Counter private _registered;

    function initialize(
        address _nftContract
    ) public initializer {
        require(!initializedFlag, "Contract is already initialized");
        NFTTradingWrapper.initialized(_nftContract);
        signer = msg.sender;
        initializedFlag = true;
    }

    function getRegistration(uint256 _registrationId) external view returns (Registration memory registration) {
        return registrations[_registrationId];
    }

    function registerTrade(uint256 _tokenId, string memory color) external delegatedOnly nonReentrant {
        require(IERC721(nftContract).ownerOf(_tokenId) == msg.sender, "The placer is not the onwer of the NFT");
        _registered.increment();
        uint256 newItemId = _registered.current();
        Registration memory registration = Registration(newItemId, msg.sender, address(0), _tokenId, color, false, getTimestamp(), 0, false, 0);
        registrations[newItemId] = registration;
        IERC721(nftContract).safeTransferFrom(msg.sender, address(this), _tokenId);
        emit NewRegistration(newItemId, msg.sender);
    }

    function buy(
        uint256 _registrationId,
        uint256 _tokenId,
        string memory _trait,
        bytes memory _signature
    ) external nonReentrant {
        require(verify(abi.encodePacked(msg.sender, _registrationId, _tokenId, _trait), _signature), "Incorrect Buy");
        Registration storage registration = registrations[_registrationId];
        require(msg.sender != registration.from, "The buyer should be different from the seller");
        require(IERC721(nftContract).ownerOf(_tokenId) == msg.sender, "The buyer is not the onwer of the NFT");
        require(registration.traded == false, "The NFT is already sold out");
        require(keccak256(abi.encodePacked((registration.targetTrait))) == keccak256(abi.encodePacked((_trait))), "This NFT is not suitable for what the seller requested");

        IERC721(nftContract).safeTransferFrom(msg.sender, registration.from, _tokenId);
        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, registration.tokenId);
        registration.traded = true;
        registration.timeTraded = getTimestamp();
        emit Traded(registration.from, msg.sender, registration.tokenId, _tokenId);
    }

    function withdraw(
    uint256 _registrationId
    ) public nonReentrant {
        Registration storage registration = registrations[_registrationId];
        require(msg.sender == registration.from, "You don't have right to withdraw this trade");
        require(registration.traded == false, 'Already Traded');
        require(registration.withdrawn == false, 'Already withdrawn');

        IERC721(nftContract).safeTransferFrom(address(this), msg.sender, registration.tokenId);
        registration.withdrawn = true;
        registration.timeWithdrawn = getTimestamp();
        emit Withdrawn(registration.from, registration.tokenId);
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

    function getTradedAmount() public view returns(uint256) {
        uint256 count = 0;
        uint256 i;

        for (i = 1; i <= _registered.current(); i ++) {
            if (registrations[i].traded)
                count ++;
        }

        return count;
    }

    function getRegistrationCount() public view returns(uint256) {
        return _registered.current();
    }

    function getListByTrait(string memory _color) public view returns(Registration [] memory) {
        Registration [] memory results = new Registration[](_registered.current());
        uint256 count = 0;
        uint256 i;

        for (i = 1; i <= _registered.current(); i ++) {
            if (keccak256(bytes(registrations[i].targetTrait)) == keccak256(bytes(_color))) {
                results[count] = registrations[i];
                count++;
            }
        }

        Registration [] memory filteredResults = new Registration[](count);
        for (i = 0; i < count; i ++) {
            filteredResults[i] = results[i];
        }

        return filteredResults;
    }

    function getListBySeller(address _seller) public view returns(Registration[] memory) {
        Registration [] memory results = new Registration[](_registered.current());
        uint256 count = 0;
        uint256 i;

        for (i = 1; i <= _registered.current(); i ++) {
            if (registrations[i].from == _seller) {
                results[count] = registrations[i];
                count++;
            }
        }

        Registration [] memory filteredResults = new Registration[](count);
        for (i = 0; i < count; i ++) {
            filteredResults[i] = results[i];
        }

        return filteredResults;
    }

    function getRegistrationList() public view returns(Registration[] memory) {
        Registration [] memory results = new Registration[](_registered.current());
        uint256 count = 0;
        uint256 i;

        for (i = 1; i <= _registered.current(); i ++) {
            results[count] = registrations[i];
            count++;
        }

        return results;
    }

    function getSigner() public view returns(address) {
        return signer;
    }

    function updateSigner(address _signer) external isSigner {
        signer = _signer;
    }

    function getNFTContract() external view returns(address) {
        return nftContract;
    }

    function updateNFTContract(address _nftContract) external isSigner {
        nftContract = _nftContract;
    }

    function getTimestamp() public view virtual returns (uint256) {
        return block.timestamp;
    }

    modifier isSigner {
        require(_msgSender() == signer, "This function can only be called by an signer");
        _;
    }

    modifier delegatedOnly() {
        require(initializedFlag, "The library is locked. No direct 'call' is allowed");
        _;
    }
}
