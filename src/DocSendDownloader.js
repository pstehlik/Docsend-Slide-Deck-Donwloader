// Debug utility functions - only declare if not already defined
if (typeof window.isDebugMode === 'undefined') {
    window.isDebugMode = () => {
        return window.location.search.includes('downloaderDebug=true');
    };
}

if (typeof window.debugLog === 'undefined') {
    window.debugLog = (...args) => {
        if (window.isDebugMode()) {
            console.log(...args);
        }
    };
}

let connection;
let numSlides = parseInt((document.getElementsByClassName("page-label")[0].innerHTML).split(" ")[0]);
// Strip query parameters from URL to avoid malformed API endpoints
let baseUrl = window.location.origin + window.location.pathname;
let metadataEndpoint = baseUrl.charAt(baseUrl.length-1) == "/" ? baseUrl + "page_data/" : baseUrl + "/page_data/";
let slideImageUrls = [];

let slideDeckAlreadyDownloaded = false; //cannot download the slide deck more than once on the same session
let slideDeckGenerationInProgress = false;

let userIsAuthenticated = () => {
    //If prompt doesn't exist, user has entered their email address to access slide deck.
    if (document.getElementById("prompt") == null) {
        return true; 
    } else {
        return false;
    }
}

let getSlideImageUrls = async () => {
    for(let i=1; i<=numSlides; i++) {
        let url = metadataEndpoint + String(i);
        window.debugLog(`Fetching slide ${i} from:`, url);
        await fetch(url)
        .then((response) => {
            window.debugLog(`Slide ${i} response status:`, response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then((data) => {
            window.debugLog(`Slide ${i} data:`, data);
            slideImageUrls.push(data.imageUrl);
            showCustomAlert(`Fetching slide ${i}/${numSlides}...`);
        })
        .catch((error) => {
            console.error(`Error fetching slide ${i}:`, error);
        });
    }
}

// Wait for dependencies to be available
const waitForDependencies = (maxAttempts = 10, delay = 100) => {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        
        const checkDeps = () => {
            attempts++;
            window.debugLog(`Dependency check attempt ${attempts}/${maxAttempts}`);
            window.debugLog('jsPDF available:', typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined');
            window.debugLog('buildPdf available:', typeof buildPdf !== 'undefined');
            
            if (typeof window.jspdf !== 'undefined' && 
                typeof window.jspdf.jsPDF !== 'undefined' && 
                typeof buildPdf !== 'undefined') {
                window.debugLog('All dependencies ready!');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error(`Dependencies not available after ${maxAttempts} attempts`));
            } else {
                setTimeout(checkDeps, delay);
            }
        };
        
        checkDeps();
    });
};

let generateSlideDeckPdf = async () => {
    try {
        window.debugLog('=== Starting PDF generation ===');
        
        // Wait for dependencies
        await waitForDependencies();
        
        window.debugLog('Getting slide URLs...');
        await getSlideImageUrls();
        
        window.debugLog('Building PDF with', slideImageUrls.length, 'slides...');
        buildPdf(slideImageUrls);
        
    } catch (error) {
        console.error('Error in generateSlideDeckPdf:', error);
        slideDeckGenerationInProgress = false;
        hideCustomAlert();
        showDefaultAlert("ERROR: " + error.message);
    }
}

chrome.runtime.onConnect.addListener((port) => {
    connection = port;
    // MV3 service worker can be terminated mid-job (idle timeout), closing the port
    port.onDisconnect.addListener(() => { connection = null; });
    port.onMessage.addListener((message) => {
        if (userIsAuthenticated()) {
            if (message.requestType == "GENERATE_PDF") {
                slideDeckGenerationInProgress = true;
                slideDeckAlreadyDownloaded = true;
                showCustomAlert(`Generating slide deck as PDF: 0/${numSlides} slides complete...`);
                generateSlideDeckPdf();
            } 
            else if (message.requestType == "CHECK_PROGRESS") {
                if (slideDeckGenerationInProgress) {
                    showCustomAlert("Please wait. Still generating slide deck as PDF...");
                }
                else if (slideDeckAlreadyDownloaded) {
                    showDefaultAlert("Slide deck was already downloaded during this session. Please reload the page to download again.")
                } else {
                    showDefaultAlert("ERROR: Slide deck download progress unknown. Please try again.");
                }
            }
        } else {
            showDefaultAlert("You must be signed in to download this slide deck as a PDF.")
        }
    })
})


