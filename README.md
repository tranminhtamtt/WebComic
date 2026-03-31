<div align="center">
  <h1>📖 WebComic Platform</h1>
  <p>A Fullstack Webtoon & Manga Reading Application built with ReactJS and Spring Boot.</p>

  [![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
  [![Spring Boot](https://img.shields.io/badge/Backend-Spring_Boot_3-6DB33F?style=flat-square&logo=spring)](https://spring.io/projects/spring-boot)
  [![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
  [![TiDB](https://img.shields.io/badge/Database-TiDB_(MySQL)-4479A1?style=flat-square&logo=mysql)](https://en.pingcap.com/)
  <br />
</div>

---

## 📋 Overview (Description)
**WebComic** is a robust web application designed for reading webtoons, manga, manhwa, and manhua. It provides a seamless and localized reading experience for diverse users (Guests, Registered Users, and Administrators). 

What makes it unique is the built-in **Admin Crawling Engine** that allows system administrators to automatically fetch and sync thousands of comic chapters globally from major free APIs (such as MangaDex, Otruyen, etc.) straight into the personal Database without manual entry.

## ✨ Key Features
* **📖 Scalable Reading Interface**: High-performance, lazy-loaded reader tailored for manga, manhwa, and manhua content (Available for Guests, Users, and Admins).
* **🕷️ Automated API Crawler (Admin Only)**: Powerful admin dashboard capable of pulling and scraping complete webtoons seamlessly from:
  * [MangaDex API](https://api.mangadex.org)
  * [Otruyen API](https://otruyenapi.com/)
  * Damconuong (Custom Source)
* **🖼️ Cloud Storage Integration**: Interacts optimally with Cloudinary to handle custom cover uploads independently of scraped sources.
* **🛡️ Full Security & CORS Bypass**: Designed with an internal Spring Boot Proxy to bypass rigid hotlinking mechanics and fetch cross-origin resources flawlessly. 
* **⚡ High Concurrency Optimization**: Backend tuned with Thread Pooling, HikariCP, and Response GZIP Compression to natively support 100+ concurrent requests efficiently.

---

## 🛠️ Technology Stack
* **Frontend Workflow:**
  * **Framework:** ReactJS
  * **Build Tool:** Vite (Lightning-fast HMR)
  * **Routing:** React Router v6
* **Backend Architecture:**
  * **Core Framework:** Java + Spring Boot (Spring Web, Spring Data JPA)
* **Datastore & Storage:**
  * **Database Engine:** MySQL
  * **Cloud Image Media:** Cloudinary API
* **Cloud Infrastructure (Deployment):**
  * **Frontend Host:** [Vercel](https://vercel.com/)
  * **Backend Host:** [Render](https://render.com/)
  * **Remote Database:** [TiDB Cloud](https://tidbcloud.com/) (Distributed SQL Database compatible with MySQL)

---

## ⚙️ Environment Variables Setup

Ensure you configure the correct `.env` (Frontend) and `application.properties` (Backend) before starting locally or deploying.

### Frontend (`/comic-frontend/.env`)
```env
# Point this to your Spring Boot Server URL (Localhost or Render Hosting)
VITE_API_BASE_URL=http://localhost:8080/api
```

### Backend (`/comic-backend/src/main/resources/application.properties`)
```properties
# Database Connectivity (TiDB)
spring.datasource.url=${DB_URL:jdbc:mysql://localhost:3306/comicWeb?useSSL=false&serverTimezone=UTC}
spring.datasource.username=${DB_USERNAME:root}
spring.datasource.password=${DB_PASSWORD:123456}

# Cloudinary Integration
cloudinary.cloud-name=your_cloud_name
cloudinary.api-key=your_api_key
cloudinary.api-secret=your_api_secret

# Performance Tuning
server.compression.enabled=true
server.tomcat.threads.max=200
spring.datasource.hikari.maximum-pool-size=20
```

---

## 🚀 How to Run Locally

### 1. Database Initialization
Ensure you have MySQL installed and running on port `3306` (or mapping to TiDB credentials).
Create a database named `comicWeb` and set ```spring.jpa.hibernate.ddl-auto=update``` if it's the first run to sync the schema.

### 2. Start the Backend (Spring Boot)
Navigate to the `/comic-backend` folder. Use your IDE or run the Maven wrapper:
```bash
./mvnw spring-boot:run
```
*(Server will start on `http://localhost:8080`)*

### 3. Start the Frontend (Vite)
Open a new terminal, navigate to `/comic-frontend`, and install dependencies:
```bash
npm install
npm run dev
```
*(React App will run on `http://localhost:5173`)*

---

## 👨‍💻 Contributing & License
Contributions are welcome. Feel free to open Pull Requests for additional Scraping Sources enhancements or Reader UI updates.
