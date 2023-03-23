// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity 0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract nft is ERC721Enumerable, Ownable, Pausable {

    using Strings for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private supply;
    mapping (address => uint) nftCounts;
    string public uriPrefix = "https://crazyzoo.mypinata.cloud/ipfs/QmcTyHXrXw9ZkZCo7SmjsRtyn3mSd36VkUjoBFrZKds9gw/";
    string public uriSuffix = ".json";

    uint256 constant fee = 0.01 ether;
    uint256 constant maxSupply = 45;

    uint256 constant mintAmount = 1;
    address constant public royaltiesPayoutAddress = 0xdc7257720EF672AdCCda40c078892EE62dcc6394;
    uint256 public royaltiesPercent = 1000; // out of 10000 = 10%
    uint256 public mintPrice = 0.5 ether;

    event Received(address, uint);

    receive() external payable {
        emit Received(msg.sender, msg.value);
    }

    constructor() ERC721("InFilm", "InFilm") {
        for (uint256 i = 0; i < 45; i++) {
            supply.increment();
            _safeMint(owner(), supply.current());
        }
    }

    modifier onlyOrigin () {
        require(msg.sender == tx.origin, "Contract calls are not allowed");
        _;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function mint(uint256 tokenId) public {
        supply.increment();
        _mint(msg.sender, tokenId);
    }

    function ownerMint(uint256 _mintAmount, address _receiver) external onlyOwner {

        require(supply.current() + _mintAmount <= maxSupply, "Max supply exceeded!");

        for (uint256 i = 0; i < _mintAmount; i++) {
            supply.increment();
            _safeMint(_receiver, supply.current());
        }
    }

    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "Non-existent token given!");

        uint id = _tokenId % 10;
        string memory currentBaseURI = _baseURI();
        return bytes(currentBaseURI).length > 0
        ? string(abi.encodePacked(currentBaseURI, id.toString(), uriSuffix))
        : "";
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return uriPrefix;
    }

    function totalSupply() public override view returns (uint256) {
        return supply.current();
    }

    function setUriPrefix(string memory _uriPrefix) external onlyOwner {
        uriPrefix = _uriPrefix;
    }

    function setUriSuffix(string memory _uriSuffix) external onlyOwner {
        uriSuffix = _uriSuffix;
    }

    function withdrawAll() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0);

        _withdraw(owner(), address(this).balance);
    }

    function _withdraw(address _address, uint256 _amount) private {
        (bool success, ) = _address.call{value: _amount}("");
        require(success, "Transfer failed.");
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal whenNotPaused override {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function royaltyInfo(uint256 tokenId, uint256 salePrice) external view returns (address receiver, uint256 royaltyAmount) {
        require(_exists(tokenId), "Non-existent token given!");
        require(salePrice > 0, "Sale price must be greater than 0!");
        return (royaltiesPayoutAddress, (salePrice * royaltiesPercent) / 10000);
    }

    function setRoyaltiesPercent(uint256 _royalitesPercent) external onlyOwner {
        require(_royalitesPercent > 0, "Royalties percent must be greater than 0!");
        require(_royalitesPercent <= 10000, "Royalties percent must be less than or equal to 10000!");
        royaltiesPercent = _royalitesPercent;
    }

    function userMint (uint256 amount) external payable{
        require(msg.value >= mintPrice,"You need to pay the mint price");
        require(supply.current() + amount <= maxSupply, "Max supply exceeded!");
        supply.increment();
        _safeMint(msg.sender, supply.current());
        if (address(this).balance > 0) {
            bool success;
            (success,) = royaltiesPayoutAddress.call{value: (address(this).balance), gas: 30000}("");
        }
    }
}
