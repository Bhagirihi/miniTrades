const puppeteer = require("puppeteer");
const fs = require("fs");

// File to store the cookies
const COOKIE_FILE_PATH = "./cookies.json";

// Function to check if cookies are expired (example: by checking their timestamp)
const areCookiesExpired = (cookies) => {
  if (!cookies || cookies.length === 0) {
    return true; // No cookies means they are expired
  }

  // Loop through cookies to check for expiry (if `expires` exists)
  const currentTime = Date.now() / 1000; // Get current time in seconds
  for (let cookie of cookies) {
    if (cookie.expires && cookie.expires < currentTime) {
      return true; // If any cookie is expired, return true
    }
  }
  return false; // Cookies are not expired
};

// The main function
module.exports = getCookies = async () => {
  // Launch browser in headless mode with additional arguments
  const browser = await puppeteer.launch({
    executablePath: puppeteer.executablePath(),
    headless: true,
    args: [
      "--disable-http2", // Disable HTTP/2
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled", // Bypass headless detection
      "--start-maximized", // Open the browser window maximized
      "--disable-infobars", // Disable info bars like "Chrome is being controlled"
    ],
  });

  // Create a new page
  const page = await browser.newPage();

  // Set a user agent to simulate a real browser
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
  );

  // Check if cookies file exists and if they are expired
  let cookies = [];
  if (fs.existsSync(COOKIE_FILE_PATH)) {
    cookies = JSON.parse(fs.readFileSync(COOKIE_FILE_PATH));
  }

  // Fetch cookies only if expired or not present
  if (areCookiesExpired(cookies)) {
    console.log("Cookies are expired or missing. Fetching new cookies...");

    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate to the NSE India website
    await page.goto("https://www.nseindia.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Get cookies after the page is loaded
    cookies = await page.cookies();

    // Save cookies to a file (ensure cookies persist)
    fs.writeFileSync(COOKIE_FILE_PATH, JSON.stringify(cookies, null, 2));

    console.log("New cookies saved!");
  } else {
    console.log("Cookies are valid, using existing ones.");
    // Apply existing cookies to the page
    await page.setCookie(...cookies);
  }

  // Log the cookies for debugging purposes
  console.log("Cookies:", JSON.stringify(cookies, null, 2));

  // Close the browser
  await browser.close();

  // Return cookies data
  return cookies;
};

