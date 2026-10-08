import { useState } from "react";
import { ethers } from "ethers";
import { Html5Qrcode } from "html5-qrcode"; //QR code scanner library
import {
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
} from "./contract/contractConfig";
import { QRCodeCanvas } from "qrcode.react";
import "./App.css";

const convertFileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
};

function App() {
  const [role, setRole] = useState("student");
  const [loggedIn, setLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [blockchainCertificate, setBlockchainCertificate] = useState(null);

  const [verificationResult, setVerificationResult] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scannedData, setScannedData] = useState(null);

  const [adminStudentName, setAdminStudentName] = useState("");
  const [adminStudentEmail, setAdminStudentEmail] = useState("");
  const [adminStudentPassword, setAdminStudentPassword] = useState("");
  const [adminCourse, setAdminCourse] = useState("Computer Engineering");
  const [adminInstitution, setAdminInstitution] = useState("SPPU");
  const [adminCertificateId, setAdminCertificateId] = useState("");

  const [certificateFile, setCertificateFile] = useState(null);
  const [studentPhoto, setStudentPhoto] = useState(null);

  const [certificateHash, setCertificateHash] = useState("");
  const [hashGenerated, setHashGenerated] = useState(false);
  const [adminStatus, setAdminStatus] = useState("");

  const certificate = {
    certificateId: "CERT-2026-001",
    studentName: "Petal Test Student",
    course: "Computer Engineering",
    institution: "SPPU",
    certificateHash:
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  };

  const storedCertificate = JSON.parse(
    localStorage.getItem("issuedCertificate")
  );

  const studentCertificate = storedCertificate || certificate;

  const testBlockchainConnection = async () => {
    try {
      if (!window.ethereum) {
        alert("MetaMask is not installed.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const network = await provider.getNetwork();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const issuedCertificate = JSON.parse(
        localStorage.getItem("issuedCertificate")
      );

      if (!issuedCertificate) {
        alert("No issued certificate found.");
        return;
      }

      const blockchainCert = await contract.getCertificate(
        issuedCertificate.certificateId
      );

      setBlockchainCertificate({
        certificateId: blockchainCert[0],
        studentName: blockchainCert[1],
        course: blockchainCert[2],
        institution: blockchainCert[3],
        certificateHash: blockchainCert[4],
        documentHash: blockchainCert[5],
        issuer: blockchainCert[6],
        issueDate: blockchainCert[7],
        valid: blockchainCert[8],
      });

      console.log("Connected network:", network);
      console.log("Certificate from blockchain:", blockchainCert);

      alert(
        `Blockchain connected!\n\nCertificate: ${blockchainCert[0]}\nStudent: ${blockchainCert[1]}\nCourse: ${blockchainCert[2]}`
      );

    } catch (error) {
      console.error(error);
      alert(
        "Blockchain connection failed. Check the browser console."
      );
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();

    const email = e.target.email.value.trim();
    const password = e.target.password.value;

    // Admin login
    if (role === "admin") {
      if (
        email === "admin@college.com" &&
        password === "admin123"
      ) {
        setUserEmail(email);
        setLoggedIn(true);
      } else {
        alert("Invalid admin email or password.");
      }

      return;
    }

    // Student login
    if (role === "student") {
      const issuedCertificate = JSON.parse(
        localStorage.getItem("issuedCertificate")
      );

      const studentEmail =
        issuedCertificate?.studentEmail
          ?.replace(/^mailto:/, "")
          .trim();

      const studentPassword =
        issuedCertificate?.studentPassword;

      if (
        studentEmail &&
        studentPassword &&
        email.toLowerCase() === studentEmail.toLowerCase() &&
        password === studentPassword
      ) {
        setUserEmail(studentEmail);
        setLoggedIn(true);
      } else {
        alert(
          "Invalid student email or password. Please use the credentials provided by the Admin."
        );
      }

      return;
    }

    // Verifier login
    if (role === "verifier") {
      if (
        email === "verifier@company.com" &&
        password === "verifier123"
      ) {
        setUserEmail(email);
        setLoggedIn(true);
      } else {
        alert("Invalid verifier email or password.");
      }
    }
  };

  const viewCertificate = async () => {
    const issuedCertificate = JSON.parse(
      localStorage.getItem("issuedCertificate")
    );

    if (!issuedCertificate?.certificateFileData) {
      alert("Certificate PDF is not available.");
      return;
    }

    try {
      const response = await fetch(
        issuedCertificate.certificateFileData
      );

      const blob = await response.blob();

      const pdfUrl = URL.createObjectURL(blob);

      window.open(pdfUrl, "_blank");
    } catch (error) {
      console.error("Unable to open certificate:", error);
      alert("Unable to open certificate PDF.");
    }
  };

  const downloadCertificate = () => {
    const issuedCertificate = JSON.parse(
      localStorage.getItem("issuedCertificate")
    );

    if (!issuedCertificate?.certificateFileData) {
      alert("Certificate PDF is not available.");
      return;
    }

    const link = document.createElement("a");

    link.href = issuedCertificate.certificateFileData;
    link.download =
      issuedCertificate.certificateFileName || "certificate.pdf";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const handleLogout = () => {
    setLoggedIn(false);
    setUserEmail("");
  };

  const verifyScannedCertificate = async (qrText) => {
    try {
      const data = JSON.parse(qrText);

      setScannedData(data);

      if (!data.certificateId || !data.certificateHash) {
        setVerificationResult({
          success: false,
          message: "Invalid QR code."
        });
        return;
      }

      if (!window.ethereum) {
        setVerificationResult({
          success: false,
          message: "MetaMask is not installed."
        });
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        provider
      );

      const isValid = await contract.verifyCertificate(
        data.certificateId,
        data.certificateHash
      );

      setVerificationResult({
        success: isValid,
        message: isValid
          ? "Certificate is genuine and verified on the blockchain."
          : "Verification failed. Certificate may be fake or modified."
      });

    } catch (error) {
      console.error(error);

      setVerificationResult({
        success: false,
        message: "Invalid QR code or verification failed."
      });
    }
  };

  const issueCertificateOnBlockchain = async () => {
    try {
      if (!adminStudentName || !adminCertificateId) {
        alert("Please enter student name and certificate ID.");
        return;
      }

      if (!certificateFile) {
        alert("Please upload the certificate PDF.");
        return;
      }

      if (!certificateHash) {
        alert("Please generate the certificate hash first.");
        return;
      }

      if (!window.ethereum) {
        alert("MetaMask is not installed.");
        return;
      }

      setAdminStatus("Connecting to blockchain...");

      const provider = new ethers.BrowserProvider(window.ethereum);

      const signer = await provider.getSigner();

      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      // Check whether this certificate already exists
      const existingCertificate = await contract.getCertificate(
        adminCertificateId
      );

      if (existingCertificate[8] === true) {
        // Certificate already exists on blockchain.
        // Save the uploaded PDF locally without issuing again.

        const pdfData = await new Promise((resolve, reject) => {
          const reader = new FileReader();

          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;

          reader.readAsDataURL(certificateFile);
        });

        const photoData = studentPhoto
          ? await convertFileToBase64(studentPhoto)
          : "";

        localStorage.setItem(
          "issuedCertificate",
          JSON.stringify({
            certificateId: adminCertificateId,
            studentName: adminStudentName,
            studentEmail: adminStudentEmail,
            studentPassword: adminStudentPassword,
            course: adminCourse,
            institution: adminInstitution,
            certificateHash: certificateHash,
            certificateFileName: certificateFile.name,
            certificateFileData: pdfData,
            studentPhotoName: studentPhoto?.name || "",
            studentPhotoData: photoData,
          })
        );

        setAdminStatus(
          "✅ Certificate already exists on blockchain. PDF saved successfully!"
        );

        return;
      }

      setAdminStatus("Waiting for blockchain confirmation...");

      // Convert uploaded PDF to Base64 and save it locally
      const pdfData = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;

        reader.readAsDataURL(certificateFile);
      });


      const photoData = studentPhoto
        ? await convertFileToBase64(studentPhoto)
        : "";

      localStorage.setItem(
        "issuedCertificate",
        JSON.stringify({
          certificateId: adminCertificateId,
          studentName: adminStudentName,
          studentEmail: adminStudentEmail,
          studentPassword: adminStudentPassword,
          course: adminCourse,
          institution: adminInstitution,
          certificateHash: certificateHash,
          certificateFileName: certificateFile.name,
          certificateFileData: pdfData,
          studentPhotoName: studentPhoto?.name || "",
          studentPhotoData: photoData,
        })
      );

      const transaction = await contract.issueCertificate(
        adminCertificateId,
        adminStudentName,
        adminCourse,
        adminInstitution,
        certificateHash,
        certificateHash
      );

      await transaction.wait();

      setAdminStatus(
        "✅ Certificate issued successfully on the blockchain!"
      );

    } catch (error) {
      console.error("Certificate issuance error:", error);

      if (
        error.reason === "Certificate already exists" ||
        error.message?.includes("Certificate already exists")
      ) {
        setAdminStatus(
          "❌ Certificate ID already exists. Please use a new Certificate ID."
        );
      } else {
        setAdminStatus(
          "❌ Certificate issuance failed. Check MetaMask and Ganache."
        );
      }
    }
  };

  // STUDENT DASHBOARD
  if (loggedIn && role === "student") {
    const issuedCertificate = JSON.parse(
      localStorage.getItem("issuedCertificate")
    );

    const qrData = JSON.stringify({
      certificateId: issuedCertificate?.certificateId,
      certificateHash: issuedCertificate?.certificateHash,
    });

    return (
      <div className="dashboard">

        <header className="dashboard-header">
          <div>
            <h1>🎓 Student Dashboard</h1>
            <p>Blockchain Certificate Verification System</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">

          <section className="welcome-card">
            <div className="student-avatar">
              {studentCertificate.studentPhotoData ? (
                <img
                  src={studentCertificate.studentPhotoData}
                  alt={`${studentCertificate.studentName} profile`}
                  className="student-photo"
                />
              ) : (
                "🎓"
              )}
            </div>

            <div>
              <h2>Welcome, {studentCertificate.studentName}</h2>
              <p>{userEmail}</p>
            </div>
          </section>

          <h2 className="section-title">
            My Certificates
          </h2>

          <button
            className="action-button"
            onClick={testBlockchainConnection}
            style={{ marginBottom: "20px" }}
          >
            🔗 Test Blockchain Connection
          </button>

          <section className="certificate-card">

            <div className="certificate-info">

              <div className="certificate-icon">
                📜
              </div>

              <div>
                <h2>Computer Engineering Certificate</h2>

                <p>
                  <strong>Certificate ID:</strong>{" "}
                  {studentCertificate.certificateId}
                </p>

                <p>
                  <strong>Student:</strong>{" "}
                  {studentCertificate.studentName}
                </p>

                <p>
                  <strong>Institution:</strong>{" "}
                  {studentCertificate.institution}
                </p>

                <p>
                  <strong>Course:</strong>{" "}
                  {studentCertificate.course}
                </p>

                <div className="status-badge">
                  ✓ Certificate Issued
                </div>

              </div>

            </div>

            <div className="certificate-actions">

              <button
                className="action-button"
                onClick={viewCertificate}
              >
                👁️ View Certificate
              </button>

              <button
                className="action-button"
                onClick={downloadCertificate}
              >
                ⬇️ Download
              </button>

            </div>

          </section>

          <section className="verification-section">

            <div className="qr-card">

              <h2>📱 Verification QR Code</h2>

              <p>
                Show this QR code to an employer or verifier
                to verify your certificate.
              </p>

              <div className="qr-container">
                <QRCodeCanvas
                  value={qrData}
                  size={220}
                  level="H"
                />
              </div>

              <p className="qr-id">
                {studentCertificate.certificateId}
              </p>

            </div>

            <div className="blockchain-card">

              <h2>🔗 Blockchain Record</h2>

              <div className="blockchain-status">
                <span className="status-dot"></span>

                {blockchainCertificate
                  ? "✓ Blockchain record loaded"
                  : "Ready for blockchain verification"}
              </div>

              <div className="hash-box">
                <label>Certificate Hash</label>

                <p>
                  {blockchainCertificate
                    ? blockchainCertificate.certificateHash
                    : studentCertificate.certificateHash}
                </p>
              </div>

              <div className="info-row">
                <span>Network</span>
                <strong>Ganache Local</strong>
              </div>

              <div className="info-row">
                <span>Blockchain</span>
                <strong>Ethereum</strong>
              </div>


              <div className="info-row">
                <span>Certificate ID</span>
                <strong> {blockchainCertificate
                  ? blockchainCertificate.certificateId
                  : studentCertificate.certificateId}</strong>
              </div>

            </div>

          </section>

        </main>

      </div>
    );
  }


  // ADMIN DASHBOARD
  if (loggedIn && role === "admin") {
    return (
      <div className="dashboard">

        <header className="dashboard-header">
          <div>
            <h1>🏫 Admin Dashboard</h1>
            <p>Blockchain Certificate Verification System</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">

          <section className="welcome-card">
            <div className="student-avatar">
              🏫
            </div>

            <div>
              <h2>Welcome, Admin</h2>
              <p>{userEmail}</p>
            </div>
          </section>

          <h2 className="section-title">
            Issue New Certificate
          </h2>

          <section className="verification-section">

            <div className="qr-card">

              <h2>👨‍🎓 Student Details</h2>

              <label>Student Name</label>

              <input
                className="admin-input"
                type="text"
                placeholder="Enter student name"
                value={adminStudentName}
                onChange={(e) =>
                  setAdminStudentName(e.target.value)
                }
              />

              <label>Student Email</label>

              <input
                className="admin-input"
                type="email"
                placeholder="Enter student email"
                value={adminStudentEmail}
                onChange={(e) =>
                  setAdminStudentEmail(e.target.value)
                }
              />

              <label>Student Password</label>

              <input
                className="admin-input"
                type="password"
                placeholder="Create student password"
                value={adminStudentPassword}
                onChange={(e) =>
                  setAdminStudentPassword(e.target.value)
                }
              />

              <label>Certificate ID</label>

              <input
                className="admin-input"
                type="text"
                placeholder="Example: CERT-2026-002"
                value={adminCertificateId}
                onChange={(e) =>
                  setAdminCertificateId(e.target.value)
                }
              />

              <label>Course</label>

              <input
                className="admin-input"
                type="text"
                value={adminCourse}
                onChange={(e) =>
                  setAdminCourse(e.target.value)
                }
              />

              <label>Institution</label>

              <input
                className="admin-input"
                type="text"
                value={adminInstitution}
                onChange={(e) =>
                  setAdminInstitution(e.target.value)
                }
              />

            </div>

            <div className="blockchain-card">

              <h2>📄 Certificate Files</h2>

              <label>Certificate PDF</label>

              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => {
                  setCertificateFile(e.target.files[0]);
                  setHashGenerated(false);
                  setCertificateHash("");
                }}
              />

              {certificateFile && (
                <p className="file-selected">
                  📄 {certificateFile.name}
                </p>
              )}

              <label>Student Photo</label>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setStudentPhoto(e.target.files[0])
                }
              />

              {studentPhoto && (
                <p className="file-selected">
                  🖼️ {studentPhoto.name}
                </p>
              )}

              <button
                className="action-button"
                onClick={async () => {

                  if (!certificateFile) {
                    alert("Please upload a certificate PDF first.");
                    return;
                  }

                  try {
                    const fileBuffer =
                      await certificateFile.arrayBuffer();

                    const hashBuffer =
                      await crypto.subtle.digest(
                        "SHA-256",
                        fileBuffer
                      );

                    const hashArray =
                      Array.from(new Uint8Array(hashBuffer));

                    const hashHex =
                      hashArray
                        .map((byte) =>
                          byte.toString(16).padStart(2, "0")
                        )
                        .join("");

                    const blockchainHash =
                      "0x" + hashHex;

                    setCertificateHash(blockchainHash);
                    setHashGenerated(true);

                    setAdminStatus(
                      "Certificate hash generated successfully."
                    );

                  } catch (error) {
                    console.error(error);
                    setAdminStatus(
                      "Unable to generate certificate hash."
                    );
                  }
                }}
              >
                🔐 Generate Certificate Hash
              </button>

              {hashGenerated && (
                <button
                  className="action-button"
                  onClick={issueCertificateOnBlockchain}
                >
                  ⛓️ Issue Certificate on Blockchain
                </button>
              )}

              {hashGenerated && (
                <div className="hash-box">

                  <label>SHA-256 Certificate Hash</label>

                  <p>
                    {certificateHash}
                  </p>

                </div>
              )}

              {adminStatus && (
                <div className="verification-message">
                  <p>{adminStatus}</p>
                </div>
              )}

            </div>

          </section>

        </main>

      </div>
    );
  }

  // VERIFIER DASHBOARD
  if (loggedIn && role === "verifier") {
    const startQRScanner = async () => {
      try {
        setScanning(true);

        const scanner = new Html5Qrcode("qr-reader");

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          async (decodedText) => {
            console.log("QR detected:", decodedText);

            await scanner.stop();
            setScanning(false);

            verifyScannedCertificate(decodedText);
          },
          () => {
            // Normal scanning errors are ignored
          }
        );

      } catch (error) {
        console.error("QR scanner error:", error);
        setScanning(false);

        alert(
          "Unable to start camera. Please allow camera permission."
        );
      }
    };

    return (
      <div className="dashboard">

        <header className="dashboard-header">
          <div>
            <h1>🔍 Verifier Dashboard</h1>
            <p>Blockchain Certificate Verification System</p>
          </div>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </header>

        <main className="dashboard-content">

          <section className="welcome-card">
            <div className="student-avatar">
              🔍
            </div>

            <div>
              <h2>Welcome, Verifier</h2>
              <p>{userEmail}</p>
            </div>
          </section>

          <h2 className="section-title">
            Verify Certificate
          </h2>

          <section className="verification-section">

            <div className="qr-card">

              <h2>📷 Scan QR Code</h2>

              <p>
                Scan the student's certificate QR code
                to verify its authenticity.
              </p>


              <button
                className="action-button"
                onClick={startQRScanner}
                disabled={scanning}
              >
                {scanning ? "📷 Camera Active..." : "📷 Scan QR Code"}
              </button>

              <div
                id="qr-reader"
                style={{
                  width: "100%",
                  maxWidth: "400px",
                  marginTop: "20px",
                }}
              ></div>

            </div>

            <div className="blockchain-card">

              <h2>⛓️ Blockchain Verification</h2>

              {!verificationResult && (
                <div className="blockchain-status">
                  <span className="status-dot"></span>
                  Waiting for certificate
                </div>
              )}

              {verificationResult && (
                <div
                  className={
                    verificationResult.success
                      ? "blockchain-status verified"
                      : "blockchain-status failed"
                  }
                >
                  {verificationResult.success
                    ? "✅ Certificate Verified"
                    : "❌ Verification Failed"}
                </div>
              )}

              {scannedData && (
                <div className="hash-box">

                  <label>Certificate ID</label>

                  <p>
                    {scannedData.certificateId}
                  </p>

                  <label>Certificate Hash</label>

                  <p>
                    {scannedData.certificateHash}
                  </p>

                </div>
              )}

              {verificationResult && (
                <div className="verification-message">

                  <p>
                    {verificationResult.message}
                  </p>

                </div>
              )}

            </div>

          </section>

        </main>

      </div>
    );
  }
  // LOGIN PAGE
  return (
    <div className="app">

      <div className="login-container">

        <div className="login-header">

          <div className="logo">
            🔐
          </div>

          <h1>
            Certificate Verification System
          </h1>

          <p>
            Secure • Blockchain Powered • Tamper Proof
          </p>

        </div>

        <div className="role-selector">

          <button
            className={
              role === "admin"
                ? "role active"
                : "role"
            }
            onClick={() => setRole("admin")}
          >
            🏫
            <span>Admin</span>
          </button>

          <button
            className={
              role === "student"
                ? "role active"
                : "role"
            }
            onClick={() => setRole("student")}
          >
            🎓
            <span>Student</span>
          </button>

          <button
            className={
              role === "verifier"
                ? "role active"
                : "role"
            }
            onClick={() => setRole("verifier")}
          >
            🔍
            <span>Verifier</span>
          </button>

        </div>

        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          <h2>
            {role === "admin" && "Admin Login"}
            {role === "student" && "Student Login"}
            {role === "verifier" && "Verifier Login"}
          </h2>

          <label>Email Address</label>

          <input
            type="email"
            name="email"
            placeholder="Enter your email"
            required
          />

          <label>Password</label>

          <input
            type="password"
            name="password"
            placeholder="Enter your password"
            required
          />

          <button
            className="login-button"
            type="submit"
          >
            Login
          </button>

        </form>

        <div className="login-footer">

          <p>
            Blockchain-Based Certificate Verification
          </p>

          <span>
            Powered by Ethereum • Ganache
          </span>

        </div>

      </div>

    </div>
  );
}

export default App;
