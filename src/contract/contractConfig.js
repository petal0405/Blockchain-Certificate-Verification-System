// Address of the CertificateRegistry contract
// deployed on our local Ganache blockchain.

export const CONTRACT_ADDRESS =
  "0x16E1e4BdA65e55262685ef71A0822405c1C887b5";

// Human-readable ABI for the functions
// our React application needs.

export const CONTRACT_ABI = [
  "function issueCertificate(string _certificateId, string _studentName, string _course, string _institution, bytes32 _certificateHash, string _documentHash)",
  
  "function getCertificate(string _certificateId) view returns (string, string, string, string, bytes32, string, address, uint256, bool)",
  
  "function verifyCertificate(string _certificateId, bytes32 _certificateHash) view returns (bool)",
  
  "function revokeCertificate(string _certificateId)"
];