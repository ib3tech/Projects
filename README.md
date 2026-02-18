# 🏢 HomeLink | Premium Property Management
**Live Demo:** [https://homelinkug.netlify.app/](https://homelinkug.netlify.app/)

## 📌 Engineering Highlights
While this appears to be a real estate site, the underlying architecture focuses on **scalable UI patterns** and **dynamic data rendering** using Vanilla JavaScript.

### 🛠 Technical Specification
* **Architecture:** Modular Vanilla JavaScript with an Object-Oriented approach to data management.
* **Styling:** Utility-first CSS using the Tailwind CSS engine.
* **Performance:** Optimized for "Core Web Vitals" with a focus on LCP (Largest Contentful Paint) through efficient asset loading.

### 🧩 Key Features (The "Fintech" Angle)
* **Data-Driven UI:** Instead of hard-coding listings, I implemented a central `projects` data array. This mimics how a real-world Fintech app would handle a JSON response from a banking API.
* **State Management:** The property modal uses a custom JS state handler to manage image indices and dynamic content swapping without page refreshes.
* **Defensive Coding:** Includes `onerror` image handling to ensure the UI doesn't break if a third-party asset fails to load—a critical skill in financial reliability.
* **Form Integration:** Integrated Netlify Forms with custom JS injection to pre-fill user enquiries based on the property they viewed.

## 🚀 How to Run Locally
1. Clone the repository.
2. Open `index.html` in any modern browser (No build step required due to CDN implementation).

---
*Developed as part of a professional portfolio for Fintech Engineering internships.*
