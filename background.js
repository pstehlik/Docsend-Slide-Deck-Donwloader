// Debug utility functions for background script
const debugLog = (...args) => {
    // Background scripts don't have access to URL params, so we'll always log for now
    // Users can check extension console in chrome://extensions -> Inspect views: service worker
    console.log(...args);
};

let connection;
let jobInProgress = false;
let jobComplete = false;

const executeJob = async () => {
    jobInProgress = true;
    const tabs = await chrome.tabs.query({active: true, currentWindow: true});
    const currentTabId = tabs[0].id;
    
    try {
        // Debug: Log what we're about to inject
        debugLog('=== REFACTORED VERSION - USING jsPDF ===');
        debugLog('About to inject jsPDF from: ./modules/jspdf.umd.min.js');
        
        // Inject scripts in proper order - dependencies first with delays
        debugLog('Injecting jsPDF...');
        await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ["./modules/jspdf.umd.min.js"]
        });
        
        // Small delay to ensure jsPDF is fully loaded
        await new Promise(resolve => setTimeout(resolve, 200));
        
        debugLog('Injecting ModifyDocSendView...');
        await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ["./src/ModifyDocSendView.js"]
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        debugLog('Injecting GeneratePDF...');
        await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ["./src/GeneratePDF_jsPDF.js"]
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        debugLog('Injecting DocSendDownloader...');
        await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ["./src/DocSendDownloader.js"]
        });
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        debugLog('All scripts injected, connecting...');
        connection = chrome.tabs.connect(currentTabId);
        connection.postMessage({requestType: "GENERATE_PDF"});
        connection.onMessage.addListener((message) => {
            if (message.requestType == "SET_JOB_COMPLETE") {
                jobInProgress = false;
                jobComplete = true;
            }
        });
    } catch (error) {
        console.error('Script injection failed:', error);
        jobInProgress = false;
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, () => {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {hostSuffix: 'docsend.com', pathContains: 'view'},
            })],
            actions: [new chrome.declarativeContent.ShowAction()]
        }]);
    });
});


chrome.action.onClicked.addListener(() => {
    if (jobComplete || jobInProgress) {
        try {
            connection.postMessage({requestType: "CHECK_PROGRESS"});
        } 
        catch {
            //Connection closed, start new job
            executeJob();
        }
    }
    else if (!jobInProgress && !jobComplete) {
        executeJob();
    }
})