// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ExChainCertificate is ERC721, ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct CertificateMetadata {
        address partyA;
        address partyB;
        uint256 totalLocked;
        uint256 deadline;
        uint256 createdAt;
    }

    mapping(uint256 => CertificateMetadata) public certificateMetadata;

    event CertificateMinted(
        uint256 indexed tokenId,
        address partyA,
        address partyB,
        uint256 totalLocked,
        uint256 deadline
    );

    constructor() ERC721("ExChain Relationship Certificate", "EXCR") Ownable(msg.sender) {
        _nextTokenId = 1;
    }

    function safeMint(
        address to,
        address partyA,
        address partyB,
        uint256 totalLocked,
        uint256 deadline,
        string memory uri
    ) public onlyOwner {
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        certificateMetadata[tokenId] = CertificateMetadata({
            partyA: partyA,
            partyB: partyB,
            totalLocked: totalLocked,
            deadline: deadline,
            createdAt: block.timestamp
        });

        emit CertificateMinted(tokenId, partyA, partyB, totalLocked, deadline);
    }

    // The following functions are overrides required by Solidity.

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
