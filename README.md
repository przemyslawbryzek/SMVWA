
# SMVWA — Social Media Vulnerable & Secure Web Application


**A deliberately vulnerable Node.js/Express application for security training, penetration testing, and security engineering education.**

---

## Project Versions

- **Vulnerable version** (default):
   - All vulnerabilities are present by design for educational and testing purposes.
   - See this README for details and usage.

- **Secure version:**
   - All known vulnerabilities have been fixed.
   - Use as a reference for secure Node.js/Express/PostgreSQL development.
   - See [secure/README.md](secure/README.md) for details and usage instructions.

---

> Comprehensive DAST + SAST reports included. Demonstrates real-world vulnerabilities in a Twitter-like social media platform.

---

## Quick Links

- **Live Demo:** Run locally with `docker-compose up`
- **DAST Report:** [pentest/DAST/DAST_REPORT.md](pentest/DAST/DAST_REPORT.md) — 19 vulnerabilities identified
- **SAST Report:** [pentest/SAST/SAST_REPORT.md](pentest/SAST/SAST_REPORT.md) — 103 findings via Semgrep + njsscan
- **Individual Reports:** [pentest/DAST/reports/](pentest/DAST/reports/) — Detailed PoC for each vulnerability
- **Vulnerable Code:** [vulnerable/](vulnerable/) — Source code and tests
- **Secure Code** [secuer/](secure/) - Mitigate version

---

## What Is SMVWA?

SMVWA is an intentionally vulnerable social media platform (Twitter clone) built with modern web technologies. It demonstrates how security vulnerabilities are introduced in production-like codebases and how to exploit them.

**Not for Production.** This application contains critical security flaws by design.

### Use Cases
- Security training for developers and engineers
- Penetration testing practice
- OWASP Top 10 demonstration
- CTF (Capture The Flag) learning
- Security assessment practice
- Educational security conferences

### What This Project Shows

This is a **comprehensive security engineering project** demonstrating:

- **Offensive Skills:** Ability to identify, exploit, and chain multiple vulnerabilities
- **Defensive Skills:** Security code review, threat modeling, risk assessment
- **Full-Stack Knowledge:** Frontend, backend, authentication design, DevOps
- **Reporting:** Professional vulnerability documentation with PoC and remediation guidance
- **Testing:** Manual testing + SAST/DAST tooling expertise (Semgrep, njsscan, sqlmap, Burp)

### Key Metrics

- **19 distinct vulnerabilities** identified and documented
- **103 SAST findings** via static analysis
- **19 DAST reports** with PoC + remediation
- **Complete exploitation chain:** Email enumeration → brute-force → privilege escalation → RCE
- **Full-stack:** Node.js/Express backend, EJS frontend, PostgreSQL database, Docker orchestration
- **Testing:** 105+ unit/integration tests, mocked database

---

## Security Assessment Summary

### Vulnerabilities Identified

| Category | Count | CVSS Range | Key Finding |
|----------|-------|-----------|-------------|
| **Critical (RCE, SSTI)** | 4 | 10.0 | Unauthenticated server compromise possible |
| **High (SQLi, XSS, CSRF, BAC)** | 13 | 7.0–8.9 | Multiple privilege escalation paths |
| **Medium (Info Disclosure)** | 2 | 4.0–6.9 | Email enumeration, timing attacks |
| **Total** | **19** | — | **Complete application compromise in ~2 hours** |

### Exploitation Chain (Real-World Scenario)

```
1. Email Enumeration (Info-Disclosure-01)
   ↓ Identify admin: admin@smvwa.local
2. Brute-Force (BF-01, no rate limiting)
   ↓ Win after ~1000 attempts
3. Privilege Escalation (BAC-01, forged cookie)
   ↓ Instant admin access (modify auth cookie)
4. Path Traversal (PT-01, file read)
   ↓ Extract INTERNAL_SECRET
5. Lateral Movement (Bypass auth checks)
   ↓ Access all /api/* endpoints
6. Data Exfiltration (SQLi-01/02/03, unparameterized queries)
   ↓ Dump database + credentials
7. RCE (RCE-01, node-serialize deserialization)
   ↓ Full server compromise, backdoor installation
```

**Total Time:** ~2 hours (with automated tools)

### Top 5 Critical Findings

| ID | Vulnerability | Entry Point | Impact | CVSS |
|----|---|---|---|---|
| **RCE-01** | Insecure Deserialization | `auth` cookie | Unauthenticated RCE | **10.0** |
| **SSTI-01** | Server-Side Template Injection | `POST /api/profile/export` | Server-side arbitrary code execution | **10.0** |
| **SQLi-01** | SQL Injection (login) | `POST /login` email parameter | Database dump, credential theft | **9.8** |
| **SSRF-01** | Server-Side Request Forgery | `POST /api/posts/preview` | Internal API access | **9.4** |
| **BA-01** | Broken Access Control | `auth` cookie role field | Any user → admin (1 click) | **8.8** |

---

## Technology Stack

### Backend
- **Runtime:** Node.js 18
- **Framework:** Express.js 4.x
- **Database:** PostgreSQL 15 (Docker)
- **Real-time:** WebSocket (ws library)
- **Authentication:** Base64-serialized cookies (intentionally broken)
- **Key Dependencies:**
  - `pg@8.x` — PostgreSQL client
  - `bcrypt@6.x` — Password hashing
  - `node-serialize@0.0.4` — Unsafe deserialization (RCE vector)
  - `multer@2.x` — File uploads
  - `ejs@3.x` — Server-side templating

### Frontend
- **Runtime:** Node.js 18
- **Framework:** Express.js 4.x (SSR proxy + routing)
- **Templating:** EJS (unescaped output enables XSS)
- **Styling:** Tailwind CSS 4.x (CDN)
- **HTTP Client:** Axios

### Infrastructure
- **Containers:** Docker + Docker Compose
- **Database Image:** PostgreSQL 15 Alpine
- **Networking:** Docker bridge (localhost:3000 frontend, localhost:3001 backend)

---

## Quick Start

### Prerequisites
- Docker + Docker Compose
- (Optional) Node.js 18 for running tests locally

### Run the Application

```bash
cd vulnerable/

# Build and start
docker-compose up -d --build

# Initialise database with demo accounts
docker-compose exec backend node db/init.js

# Open browser
open http://localhost:3000
```

### Demo Accounts
| Email | Password | Role |
|---|---|---|
| `admin@smvwa.local` | `Admin1234!` | Admin |
| `alice@smvwa.local` | `Alice1234!` | User |
| `bob@smvwa.local` | `Bob1234!` | User |
| `mallory@smvwa.local` | `Mallory1234!` | User |

### Reset Environment

```bash
./reset-db.sh           # Soft reset (keep containers)
./reset-db.sh --hard    # Hard reset (rebuild containers + volume)
```

### Run Tests

```bash
cd vulnerable/backend/
npm install
npm test                # 105 test cases (mocked PostgreSQL)
npm run test:coverage   # Coverage report
```

---


## Disclaimer

**SMVWA is intentionally vulnerable. Do not expose it to the internet. Run only in isolated environments (local machine, private VMs, air-gapped networks).**

All vulnerabilities are **by design** for educational purposes.

---


