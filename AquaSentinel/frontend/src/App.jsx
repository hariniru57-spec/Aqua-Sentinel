import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [activePage, setActivePage] = useState("Dashboard");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [sonarFile, setSonarFile] = useState(null);
  const [sonarPreview, setSonarPreview] = useState(
    "/images/sonar-debris.png"
  );
  const [uploadError, setUploadError] = useState("");
  const [detectionHistory, setDetectionHistory] = useState([]);

  // ================= DATABASE =================

  const loadDetectionHistory = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:8001/api/detections"
      );

      if (!response.ok) {
        throw new Error("Failed to load detection history");
      }

      const data = await response.json();
      setDetectionHistory(data);
    } catch (error) {
      console.error(
        "Failed to load detection history:",
        error
      );
    }
  };

  useEffect(() => {
    loadDetectionHistory();
  }, []);

  // ================= SONAR UPLOAD =================

  const handleSonarFile = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp"
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadError(
        "Invalid file. Please upload a JPG, PNG or WEBP sonar image."
      );
      setSonarFile(null);
      setSonarPreview("/images/sonar-debris.png");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(
        "File too large. Maximum size is 10 MB."
      );
      setSonarFile(null);
      setSonarPreview("/images/sonar-debris.png");
      return;
    }

    setSonarFile(file);
    setUploadError("");
    setResult(null);
    setSonarPreview(URL.createObjectURL(file));
  };

  // ================= AI ANALYSIS =================

  const analyzeSonar = async () => {
    setAnalyzing(true);
    setResult(null);

    try {
      const formData = new FormData();

      if (sonarFile) {
        formData.append("file", sonarFile);
      } else {
        const imageResponse = await fetch(
          "/images/sonar-debris.png"
        );

        const imageBlob = await imageResponse.blob();

        formData.append(
          "file",
          imageBlob,
          "sonar-debris.png"
        );
      }

      const response = await fetch(
        "http://127.0.0.1:8001/api/analyze",
        {
          method: "POST",
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error("Backend analysis failed");
      }

      const data = await response.json();

      const confidenceValue = Number(data.confidence);

      let displayDetection = data.detection;

      if (
        Number.isFinite(confidenceValue) &&
        confidenceValue < 30 &&
        data.detected_object
      ) {
        displayDetection =
          `${data.detected_object.replace("_", " ")} — Low Confidence`
            .replace(/\b\w/g, (char) =>
              char.toUpperCase()
            );
      }

      setResult({
        detection: displayDetection,
        confidence: `${data.confidence}%`,
        risk: data.risk,
        location: data.location,
        recommendation: data.recommendation,
        annotatedImage: data.annotated_image
          ? `data:image/jpeg;base64,${data.annotated_image}`
          : null
      });

      // Refresh Detection History after successful analysis
      await loadDetectionHistory();

    } catch (error) {
      console.error(
        "Sonar analysis error:",
        error
      );

      setResult({
        detection: "Analysis Error",
        confidence: "—",
        risk: "UNKNOWN",
        location: "Unavailable",
        recommendation:
          "Unable to connect to the AquaSentinel analysis service. Please ensure the backend is running."
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const openSonar = () => {
    setActivePage("Sonar Analysis");
    setDashboardOpen(true);
  };

  // ================= DASHBOARD STYLES =================

  const dashboardStyle = {
    minHeight: "100vh",
    background: "#f4f8fb",
    color: "#102030",
    display: "flex",
    fontFamily: "Arial, sans-serif"
  };

  const sidebarStyle = {
    width: "230px",
    minHeight: "100vh",
    background:
      "linear-gradient(180deg,#06243a,#031827)",
    color: "#fff",
    padding: "25px 15px",
    position: "fixed",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 20
  };

  const menuItem = (name, icon) => (
    <button
      onClick={() => setActivePage(name)}
      style={{
        width: "100%",
        border: 0,
        borderRadius: "8px",
        padding: "13px 12px",
        marginBottom: "7px",
        textAlign: "left",
        cursor: "pointer",
        color:
          activePage === name
            ? "#fff"
            : "rgba(225,245,255,.72)",
        background:
          activePage === name
            ? "rgba(36,151,218,.35)"
            : "transparent",
        fontSize: "12px"
      }}
    >
      <span style={{ marginRight: "10px" }}>
        {icon}
      </span>
      {name}
    </button>
  );

  const card = {
    background: "#fff",
    border: "1px solid #e0e9ef",
    borderRadius: "10px",
    padding: "20px",
    boxShadow:
      "0 4px 18px rgba(15,45,65,.05)"
  };

  return (
    <div className="app">

      {/* ================= NAVBAR ================= */}

      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon">≋</span>

          <span className="brand-name">
            Aqua<span>Sentinel</span>
          </span>
        </a>

        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#problem">Problem</a>
          <a href="#solution">Solution</a>
          <a href="#features">Features</a>
        </nav>

        <button
          className="login-button"
          onClick={() => setLoginOpen(true)}
        >
          <span className="user-icon">●</span>
          Login
        </button>
      </header>

      {/* ================= HOME ================= */}

      <section className="hero" id="home">

        <img
          className="hero-bg"
          src="/images/hero-underwater.png"
          alt="Underwater ROV"
        />

        <div className="hero-dark"></div>
        <div className="hero-bottom"></div>

        <div className="hero-content">

          <div className="sih-badge">
            SMART INDIA HACKATHON
            <span>•</span>
            SIH26057
          </div>

          <h1>
            AI-Powered
            <br />
            <span>Underwater Intelligence</span>
          </h1>

          <p className="hero-text">
            Detecting marine debris and underwater anomalies using
            Side-Scan Sonar imagery and Artificial Intelligence
            for a cleaner, safer ocean.
          </p>

          <div className="hero-buttons">

            <button
              className="explore-button"
              onClick={openSonar}
            >
              Explore System
              <span>→</span>
            </button>

            <button
              className="demo-button"
              onClick={() => setDemoOpen(true)}
            >
              <span className="play-circle">▶</span>
              Watch Demo
            </button>

          </div>
        </div>

        <div className="safe-message">
          <small>— &nbsp; CLEAN OCEANS</small>
          <strong>SAFER TOMORROW</strong>
        </div>

        <div className="home-features">

          <div className="home-card">
            <div className="home-icon">✦</div>
            <div>
              <h3>AI Detection</h3>
              <p>Marine debris &amp; anomalies</p>
            </div>
          </div>

          <div className="home-card">
            <div className="home-icon">⌖</div>
            <div>
              <h3>Geospatial Mapping</h3>
              <p>Interactive visualization</p>
            </div>
          </div>

          <div className="home-card">
            <div className="home-icon">◇</div>
            <div>
              <h3>Risk Assessment</h3>
              <p>Prioritized alerts</p>
            </div>
          </div>

          <div className="home-card">
            <div className="home-icon">⌁</div>
            <div>
              <h3>Sustainable Oceans</h3>
              <p>Cleaner &amp; healthier marine life</p>
            </div>
          </div>

        </div>
      </section>

      {/* ================= PROBLEM ================= */}

      <section
        className="problem-section"
        id="problem"
      >

        <div className="problem-container">

          <div className="problem-content">

            <div className="section-label">
              <span></span>
              THE CHALLENGE
            </div>

            <h2>
              Understanding
              <br />
              <span>the Problem</span>
            </h2>

            <p>
              Large volumes of underwater sonar imagery require
              significant time and expertise for manual inspection.
            </p>

            <p>
              Important marine debris and underwater anomalies
              can be difficult to identify consistently.
            </p>

          </div>

          <div className="sonar-area">

            <div className="sonar-box">

              <img
                src={sonarPreview}
                alt="Side-scan sonar showing possible debris"
              />

              <div style={{ marginTop: "20px" }}>

                <input
                  id="sonar-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSonarFile}
                  style={{ display: "none" }}
                />

                <label
                  htmlFor="sonar-upload"
                  className="explore-button"
                  style={{
                    display: "inline-block",
                    cursor: "pointer"
                  }}
                >
                  Choose Sonar Image
                </label>

                {sonarFile && (
                  <p
                    style={{
                      marginTop: "12px",
                      color: "#8defff"
                    }}
                  >
                    Selected: {sonarFile.name}
                  </p>
                )}

                {uploadError && (
                  <p
                    style={{
                      marginTop: "12px",
                      color: "#ff6b6b"
                    }}
                  >
                    {uploadError}
                  </p>
                )}

              </div>

              <div className="debris-tag">
                Possible Debris
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ================= SOLUTION ================= */}

      <section
        className="solution-section"
        id="solution"
      >

        <div className="solution-heading">

          <div className="section-label center-label">
            <span></span>
            THE SOLUTION
            <span></span>
          </div>

          <h2>
            Turning Sonar Data into
            <br />
            <span>Intelligent Action</span>
          </h2>

          <p>
            From raw sonar imagery to actionable insights — our AI-powered
            workflow helps detect, assess, and visualize underwater threats
            with speed and accuracy.
          </p>

        </div>

        <div className="solution-cards">

          <div className="solution-card">
            <div className="card-number">01</div>
            <div className="solution-icon">↑</div>
            <h3>Upload</h3>
            <p>Submit Side-Scan Sonar imagery.</p>
          </div>

          <div className="solution-card">
            <div className="card-number">02</div>
            <div className="solution-icon">◎</div>
            <h3>Analyze</h3>
            <p>AI processes and detects anomalies.</p>
          </div>

          <div className="solution-card">
            <div className="card-number">03</div>
            <div className="solution-icon">◇</div>
            <h3>Assess</h3>
            <p>Confidence and risk are evaluated.</p>
          </div>

          <div className="solution-card">
            <div className="card-number">04</div>
            <div className="solution-icon">↗</div>
            <h3>Visualize</h3>
            <p>Results appear on the dashboard.</p>
          </div>

        </div>
      </section>

      {/* ================= FEATURES ================= */}

      <section
        className="features-section"
        id="features"
      >

        <div className="section-label">
          <span></span>
          CORE CAPABILITIES
        </div>

        <h2>
          Intelligent Tools for
          <br />
          <span>Marine Monitoring</span>
        </h2>

        <div className="feature-grid">

          <div className="capability">
            <div className="capability-icon">◎</div>
            <h3>Sonar Intelligence</h3>
            <p>
              AI-assisted interpretation of Side-Scan Sonar imagery.
            </p>
          </div>

          <div className="capability">
            <div className="capability-icon">⌖</div>
            <h3>Detection Mapping</h3>
            <p>
              Organize and visualize detected underwater objects.
            </p>
          </div>

          <div className="capability">
            <div className="capability-icon">◇</div>
            <h3>Risk Prioritization</h3>
            <p>
              Highlight potentially important underwater findings.
            </p>
          </div>

          <div className="capability">
            <div className="capability-icon">↗</div>
            <h3>Decision Support</h3>
            <p>
              Convert sonar observations into actionable information.
            </p>
          </div>

        </div>
      </section>

      {/* ================= LOGIN ================= */}

      {loginOpen && !dashboardOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "#f5f8fb",
            display: "grid",
            gridTemplateColumns: "1fr 1fr"
          }}
        >

          <div
            style={{
              position: "relative",
              overflow: "hidden",
              padding: "55px",
              display: "flex",
              alignItems: "flex-end"
            }}
          >

            <img
              src="/images/hero-underwater.png"
              alt="Ocean"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover"
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg,rgba(1,25,45,.25),rgba(1,12,24,.94))"
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2
              }}
            >

              <div
                style={{
                  color: "#43d9ff",
                  fontSize: "21px",
                  fontWeight: 700,
                  marginBottom: "150px"
                }}
              >
                ≋ Aqua<span style={{ color: "#fff" }}>Sentinel</span>
              </div>

              <h1
                style={{
                  color: "#fff",
                  fontSize: "46px",
                  lineHeight: 1.05,
                  margin: 0
                }}
              >
                One Ocean
                <br />
                A Safer Tomorrow
              </h1>

              <p
                style={{
                  color: "rgba(235,248,255,.76)",
                  maxWidth: "400px",
                  lineHeight: 1.7
                }}
              >
                Empowering marine conservation through
                AI-powered underwater intelligence.
              </p>

              <div
                style={{
                  marginTop: "80px",
                  color: "#fff",
                  fontSize: "18px"
                }}
              >
                AquaSentinel
              </div>

              <small
                style={{
                  color: "rgba(220,240,250,.55)"
                }}
              >
                Ministry of Earth Sciences • SIH26057
              </small>

            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "50px"
            }}
          >

            <div style={{ width: "min(420px,100%)" }}>

              <button
                onClick={() => setLoginOpen(false)}
                style={{
                  position: "fixed",
                  top: "25px",
                  right: "30px",
                  border: 0,
                  background: "transparent",
                  fontSize: "28px",
                  cursor: "pointer",
                  color: "#203040"
                }}
              >
                ×
              </button>

              <h2
                style={{
                  color: "#071525",
                  fontSize: "36px",
                  marginBottom: "8px"
                }}
              >
                Welcome Back
              </h2>

              <p style={{ color: "#718096" }}>
                Login to access the AquaSentinel dashboard
              </p>

              <label>Email address</label>

              <input
                type="email"
                placeholder="Enter your email"
                style={{
                  width: "100%",
                  height: "48px",
                  marginTop: "8px",
                  padding: "0 14px",
                  border: "1px solid #d9e2ea",
                  borderRadius: "7px",
                  background: "#fff",
                  color: "#111"
                }}
              />

              <label
                style={{
                  display: "block",
                  marginTop: "18px"
                }}
              >
                Password
              </label>

              <input
                type="password"
                placeholder="Enter your password"
                style={{
                  width: "100%",
                  height: "48px",
                  marginTop: "8px",
                  padding: "0 14px",
                  border: "1px solid #d9e2ea",
                  borderRadius: "7px",
                  background: "#fff",
                  color: "#111"
                }}
              />

              <button
                onClick={() => {
                  setLoginOpen(false);
                  setDashboardOpen(true);
                  setActivePage("Dashboard");
                }}
                style={{
                  width: "100%",
                  height: "50px",
                  marginTop: "25px",
                  border: 0,
                  borderRadius: "7px",
                  background: "#147bd1",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Login
              </button>

            </div>
          </div>

        </div>
      )}

      {/* ================= DASHBOARD ================= */}

      {dashboardOpen && (
        <div
          style={{
            ...dashboardStyle,
            position: "fixed",
            inset: 0,
            zIndex: 2500,
            overflowY: "auto"
          }}
        >

          {/* SIDEBAR */}

          <aside style={sidebarStyle}>

            <div
              style={{
                fontSize: "19px",
                fontWeight: 700,
                marginBottom: "45px",
                color: "#fff"
              }}
            >
              ≋ Aqua<span style={{ color: "#38d6ff" }}>Sentinel</span>
            </div>

            {menuItem("Dashboard", "⌂")}
            {menuItem("Sonar Analysis", "◈")}
            {menuItem("Detection History", "◉")}
            {menuItem("Map View", "⌖")}
            {menuItem("Reports", "▤")}
            {menuItem("Profile", "○")}
            {menuItem("Settings", "⚙")}

            <button
              onClick={() => {
                setDashboardOpen(false);
                setActivePage("Dashboard");
              }}
              style={{
                position: "absolute",
                bottom: "25px",
                left: "15px",
                right: "15px",
                border: 0,
                background: "transparent",
                color: "rgba(230,245,255,.7)",
                textAlign: "left",
                padding: "12px",
                cursor: "pointer"
              }}
            >
              ↩ &nbsp; Logout
            </button>

          </aside>

          {/* MAIN */}

          <main
            style={{
              marginLeft: "230px",
              width: "calc(100% - 230px)",
              minHeight: "100vh",
              padding: "32px"
            }}
          >

            {/* TOP BAR */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "30px"
              }}
            >

              <div>

                <h1
                  style={{
                    margin: 0,
                    fontSize: "27px"
                  }}
                >
                  {activePage}
                </h1>

                <p
                  style={{
                    margin: "7px 0 0",
                    color: "#718096",
                    fontSize: "12px"
                  }}
                >
                  AquaSentinel Marine Monitoring System
                </p>

              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px"
                }}
              >

                <span style={{ fontSize: "18px" }}>♧</span>

                <div
                  style={{
                    width: "34px",
                    height: "34px",
                    borderRadius: "50%",
                    background: "#087dc7",
                    color: "#fff",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "12px"
                  }}
                >
                  HU
                </div>

                <div>

                  <strong style={{ fontSize: "12px" }}>
                    System User
                  </strong>

                  <small
                    style={{
                      display: "block",
                      color: "#7b8b99",
                      fontSize: "9px"
                    }}
                  >
                    Marine Analyst
                  </small>

                </div>

              </div>

            </div>

            {/* ================= DASHBOARD PAGE ================= */}

            {activePage === "Dashboard" && (
              <>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: "14px",
                    marginBottom: "20px"
                  }}
                >

                  {[
                    ["Total Surveys", "12", "▣"],
                    ["Objects Detected", "28", "◎"],
                    ["High Risk Alerts", "4", "△"],
                    ["Areas Scanned", "320 km²", "⌖"]
                  ].map(([title, value, icon]) => (
                    <div style={card} key={title}>

                      <div
                        style={{
                          color: "#1787d1",
                          fontSize: "23px"
                        }}
                      >
                        {icon}
                      </div>

                      <small
                        style={{
                          display: "block",
                          marginTop: "12px",
                          color: "#718096"
                        }}
                      >
                        {title}
                      </small>

                      <strong
                        style={{
                          display: "block",
                          fontSize: "25px",
                          marginTop: "5px"
                        }}
                      >
                        {value}
                      </strong>

                    </div>
                  ))}

                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.5fr .8fr",
                    gap: "20px"
                  }}
                >

                  {/* MAP */}

                  <div style={card}>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "15px"
                      }}
                    >

                      <strong>Survey Area</strong>

                      <button
                        onClick={() =>
                          setActivePage("Map View")
                        }
                        style={{
                          border: 0,
                          background: "#e6f4fc",
                          color: "#087bc4",
                          borderRadius: "5px",
                          padding: "7px 12px",
                          cursor: "pointer"
                        }}
                      >
                        View Full Map
                      </button>

                    </div>

                    <div
                      style={{
                        height: "330px",
                        borderRadius: "8px",
                        background:
                          "linear-gradient(135deg,#a9d9e8,#2074a4 55%,#082f50)",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >

                      <div
                        style={{
                          position: "absolute",
                          inset: "20px",
                          border:
                            "1px solid rgba(255,255,255,.18)",
                          background:
                            "repeating-linear-gradient(0deg,transparent 0 48px,rgba(255,255,255,.08) 49px 50px),repeating-linear-gradient(90deg,transparent 0 65px,rgba(255,255,255,.08) 66px 67px)"
                        }}
                      />

                      {[
                        ["28%", "36%", "#21b85c"],
                        ["55%", "52%", "#ffca28"],
                        ["72%", "30%", "#e53935"],
                        ["48%", "70%", "#21b85c"],
                        ["78%", "68%", "#e53935"]
                      ].map(
                        ([left, top, color], i) => (
                          <span
                            key={i}
                            style={{
                              position: "absolute",
                              left,
                              top,
                              width: "12px",
                              height: "12px",
                              borderRadius: "50%",
                              background: color,
                              border: "2px solid #fff",
                              boxShadow:
                                "0 2px 8px rgba(0,0,0,.3)"
                            }}
                          />
                        )
                      )}

                      <div
                        style={{
                          position: "absolute",
                          bottom: "12px",
                          left: "12px",
                          background:
                            "rgba(255,255,255,.92)",
                          padding: "10px",
                          borderRadius: "6px",
                          fontSize: "9px",
                          lineHeight: "2"
                        }}
                      >
                        🟢 Low Risk<br />
                        🟡 Medium Risk<br />
                        🔴 High Risk
                      </div>

                    </div>

                  </div>

                  {/* RECENT */}

                  <div style={card}>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "10px"
                      }}
                    >

                      <strong>Recent Detections</strong>

                      <button
                        onClick={() =>
                          setActivePage(
                            "Detection History"
                          )
                        }
                        style={{
                          border: 0,
                          background: "#e6f4fc",
                          color: "#087bc4",
                          borderRadius: "5px",
                          padding: "6px 9px"
                        }}
                      >
                        View All
                      </button>

                    </div>

                    {detectionHistory.length === 0 ? (
                      <p
                        style={{
                          color: "#718096",
                          fontSize: "12px"
                        }}
                      >
                        No detections recorded yet.
                      </p>
                    ) : (
                      detectionHistory
                        .slice(0, 4)
                        .map((item) => (
                          <div
                            key={item.id}
                            style={{
                              padding: "15px 0",
                              borderBottom:
                                "1px solid #edf1f4"
                            }}
                          >

                            <strong
                              style={{
                                fontSize: "12px",
                                display: "block"
                              }}
                            >
                              {item.type ||
                                "Unknown Detection"}
                            </strong>

                            <small
                              style={{
                                color:
                                  item.risk === "HIGH"
                                    ? "#e53935"
                                    : item.risk ===
                                      "MEDIUM"
                                    ? "#e39b00"
                                    : "#21a65a"
                              }}
                            >
                              {item.risk ||
                                "UNCONFIRMED"}{" "}
                              Risk
                            </small>

                          </div>
                        ))
                    )}

                  </div>

                </div>

              </>
            )}

            {/* ================= SONAR PAGE ================= */}

            {activePage === "Sonar Analysis" && (
              <div style={card}>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >

                  <div>

                    <h2 style={{ margin: 0 }}>
                      Side-Scan Sonar Analysis
                    </h2>

                    <p style={{ color: "#718096" }}>
                      AI-assisted marine debris and anomaly detection
                    </p>

                  </div>

                  <span
                    style={{
                      padding: "7px 12px",
                      borderRadius: "20px",
                      background: "#e6f7ee",
                      color: "#1b8c51",
                      fontSize: "11px"
                    }}
                  >
                    ● System Ready
                  </span>

                </div>

                <div
                  style={{
                    marginTop: "25px",
                    display: "grid",
                    gridTemplateColumns: "1.4fr .7fr",
                    gap: "20px"
                  }}
                >

                  <div>

                    <img
                      src={sonarPreview}
                      alt="Side Scan Sonar"
                      style={{
                        width: "100%",
                        height: "390px",
                        objectFit: "contain",
                        background: "#071522",
                        borderRadius: "9px",
                        border:
                          "1px solid #b7dce9"
                      }}
                    />

                  </div>

                  <div
                    style={{
                      border:
                        "1px solid #dce7ed",
                      borderRadius: "9px",
                      padding: "20px",
                      background: "#f8fbfd"
                    }}
                  >

                    <small
                      style={{
                        color: "#1787d1",
                        letterSpacing: "1.5px"
                      }}
                    >
                      ANALYSIS PIPELINE
                    </small>

                    <div
                      style={{
                        marginTop: "25px"
                      }}
                    >

                      <strong>01</strong>
                      <p>Sonar image loaded</p>

                      <strong>02</strong>
                      <p>AI anomaly detection</p>

                      <strong>03</strong>
                      <p>Confidence assessment</p>

                      <strong>04</strong>
                      <p>Risk prioritization</p>

                    </div>

                    {!result && (
                      <button
                        onClick={analyzeSonar}
                        disabled={analyzing}
                        style={{
                          width: "100%",
                          height: "48px",
                          marginTop: "15px",
                          border: 0,
                          borderRadius: "7px",
                          background: "#1686d1",
                          color: "#fff",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        {analyzing
                          ? "Analyzing..."
                          : "Start AI Analysis →"}
                      </button>
                    )}

                  </div>

                </div>

                {result && (
                  <div
                    style={{
                      marginTop: "22px",
                      padding: "22px",
                      borderRadius: "9px",
                      background: "#f5fbfe",
                      border:
                        "1px solid #bde3f1"
                    }}
                  >

                    <small
                      style={{
                        color: "#1686d1",
                        letterSpacing: "2px"
                      }}
                    >
                      DETECTION RESULT
                    </small>

                    <h2>{result.detection}</h2>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(3,1fr)",
                        gap: "15px"
                      }}
                    >

                      <div style={card}>
                        <small>CONFIDENCE</small>

                        <strong
                          style={{
                            display: "block",
                            color: "#1686d1",
                            fontSize: "24px",
                            marginTop: "7px"
                          }}
                        >
                          {result.confidence}
                        </strong>
                      </div>

                      <div style={card}>
                        <small>RISK LEVEL</small>

                        <strong
                          style={{
                            display: "block",
                            color: "#d88900",
                            fontSize: "24px",
                            marginTop: "7px"
                          }}
                        >
                          {result.risk}
                        </strong>
                      </div>

                      <div style={card}>
                        <small>LOCATION</small>

                        <strong
                          style={{
                            display: "block",
                            marginTop: "7px",
                            fontSize: "13px"
                          }}
                        >
                          {result.location}
                        </strong>
                      </div>

                    </div>

                    <p>
                      <strong>
                        Recommendation:
                      </strong>{" "}
                      {result.recommendation}
                    </p>

                    {result?.annotatedImage && (
                      <div
                        style={{
                          marginTop: "20px"
                        }}
                      >

                        <p
                          style={{
                            color: "#1686d1",
                            fontSize: "13px",
                            letterSpacing: "2px",
                            marginBottom: "10px"
                          }}
                        >
                          AI DETECTION VISUALIZATION
                        </p>

                        <img
                          src={result.annotatedImage}
                          alt="AI detection result"
                          style={{
                            width: "100%",
                            maxHeight: "420px",
                            objectFit: "contain",
                            borderRadius: "16px",
                            border:
                              "1px solid rgba(0, 220, 255, 0.35)",
                            background: "#061522"
                          }}
                        />

                      </div>
                    )}

                    <button
                      onClick={() =>
                        setResult(null)
                      }
                      style={{
                        padding: "10px 18px",
                        border:
                          "1px solid #1686d1",
                        borderRadius: "6px",
                        background: "#fff",
                        color: "#1686d1",
                        cursor: "pointer",
                        marginTop: "18px"
                      }}
                    >
                      Run Analysis Again
                    </button>

                  </div>
                )}

              </div>
            )}

            {/* ================= HISTORY ================= */}

            {activePage === "Detection History" && (
              <div style={card}>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center"
                  }}
                >

                  <div>
                    <h2>Detection History</h2>

                    <p
                      style={{
                        color: "#718096"
                      }}
                    >
                      Previously identified underwater
                      objects and anomalies.
                    </p>
                  </div>

                  <button
                    onClick={loadDetectionHistory}
                    style={{
                      border: 0,
                      background: "#e6f4fc",
                      color: "#087bc4",
                      borderRadius: "6px",
                      padding: "8px 14px",
                      cursor: "pointer"
                    }}
                  >
                    ↻ Refresh
                  </button>

                </div>

                {detectionHistory.length === 0 ? (
                  <p
                    style={{
                      color: "#718096",
                      marginTop: "25px"
                    }}
                  >
                    No detections recorded yet. Run a
                    sonar analysis to create history.
                  </p>
                ) : (
                  detectionHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "2fr 1fr 1fr",
                        padding: "18px 5px",
                        borderBottom:
                          "1px solid #e8eef2",
                        gap: "15px"
                      }}
                    >

                      <div>
                        <strong>
                          {item.type ||
                            "Unknown Detection"}
                        </strong>

                        <small
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "#718096"
                          }}
                        >
                          {item.filename ||
                            "Sonar Image"}
                        </small>
                      </div>

                      <span>
                        Confidence:{" "}
                        {Number(
                          item.confidence
                        ).toFixed(1)}
                        %
                      </span>

                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            item.risk === "HIGH"
                              ? "#e53935"
                              : item.risk ===
                                "MEDIUM"
                              ? "#d88900"
                              : "#21a65a"
                        }}
                      >
                        {item.risk ||
                          "UNCONFIRMED"}{" "}
                        Risk
                      </span>

                    </div>
                  ))
                )}

              </div>
            )}

            {/* ================= MAP ================= */}

            {activePage === "Map View" && (
              <div style={card}>

                <h2>Geospatial Detection Map</h2>

                <p style={{ color: "#718096" }}>
                  Visual representation of detected underwater anomalies.
                </p>

                <div
                  style={{
                    width: "100%",
                    height: "420px",
                    borderRadius: "16px",
                    overflow: "hidden",
                    border:
                      "1px solid rgba(0, 220, 255, 0.35)",
                    background: "#061522"
                  }}
                >

                  <iframe
                    title="AquaSentinel Geospatial Map"
                    src="https://www.openstreetmap.org/export/embed.html?bbox=-180%2C-60%2C180%2C-30&layer=mapnik"
                    style={{
                      width: "100%",
                      height: "100%",
                      border: 0
                    }}
                  />

                </div>

              </div>
            )}

            {/* ================= REPORTS ================= */}

            {activePage === "Reports" && (
              <div style={card}>

                <h2>Marine Monitoring Report</h2>

                <p style={{ color: "#718096" }}>
                  AquaSentinel automated survey summary.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(3,1fr)",
                    gap: "15px",
                    marginTop: "25px"
                  }}
                >

                  <div style={card}>
                    <small>OBJECTS DETECTED</small>
                    <h2>28</h2>
                  </div>

                  <div style={card}>
                    <small>HIGH-RISK FINDINGS</small>
                    <h2>4</h2>
                  </div>

                  <div style={card}>
                    <small>AREA SCANNED</small>
                    <h2>320 km²</h2>
                  </div>

                </div>

                <button
                  style={{
                    marginTop: "25px",
                    padding: "12px 20px",
                    border: 0,
                    borderRadius: "6px",
                    background: "#1686d1",
                    color: "#fff",
                    cursor: "pointer"
                  }}
                >
                  Generate Report →
                </button>

              </div>
            )}

            {/* ================= PROFILE ================= */}

            {activePage === "Profile" && (
              <div style={card}>

                <h2>Analyst Profile</h2>

                <p>
                  Marine Monitoring Analyst
                </p>

                <p>
                  Access level:{" "}
                  <strong>System User</strong>
                </p>

              </div>
            )}

            {/* ================= SETTINGS ================= */}

            {activePage === "Settings" && (
              <div style={card}>

                <h2>System Settings</h2>

                <p
                  style={{
                    color: "#718096"
                  }}
                >
                  AquaSentinel monitoring configuration.
                </p>

                <div
                  style={{
                    padding: "15px 0",
                    borderBottom:
                      "1px solid #e5edf2"
                  }}
                >
                  Detection notifications

                  <strong
                    style={{
                      float: "right"
                    }}
                  >
                    ON
                  </strong>
                </div>

                <div
                  style={{
                    padding: "15px 0"
                  }}
                >
                  Manual verification

                  <strong
                    style={{
                      float: "right"
                    }}
                  >
                    ENABLED
                  </strong>
                </div>

              </div>
            )}

          </main>

        </div>
      )}

      {/* ================= DEMO ================= */}

      {demoOpen && !dashboardOpen && (
        <div
          className="modal-background"
          onClick={() => setDemoOpen(false)}
        >

          <div
            className="modal-box"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <button
              className="close-button"
              onClick={() => setDemoOpen(false)}
            >
              ×
            </button>

            <div className="modal-label">
              AQUASENTINEL DEMO
            </div>

            <h2>Underwater Intelligence</h2>

            <p>
              Explore the AquaSentinel workflow for
              Side-Scan Sonar analysis, anomaly detection,
              risk assessment and visualization.
            </p>

            <button
              className="explore-button modal-explore"
              onClick={() => {
                setDemoOpen(false);
                setDashboardOpen(true);
                setActivePage(
                  "Sonar Analysis"
                );
              }}
            >
              Explore Workflow →
            </button>

          </div>

        </div>
      )}

      {/* ================= FOOTER ================= */}

      {!dashboardOpen && (
        <footer>

          <div className="footer-brand">
            Aqua<span>Sentinel</span>
          </div>

          <p>
            AI-Powered Underwater Intelligence
          </p>

          <small>
            SIH26057 • Disaster Management
          </small>

        </footer>
      )}

    </div>
  );
}

export default App;
