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

// Simple PDF generation using jsPDF (MV3 compatible)
window.debugLog('=== GeneratePDF_jsPDF.js loaded ===');

let startTime;
let numSlidesComplete = 0;

// Check if jsPDF is available
const checkJsPDFAvailable = () => {
    const available = typeof window.jspdf !== 'undefined' && window.jspdf.jsPDF;
    window.debugLog('jsPDF available:', available ? 'YES' : 'NO');
    window.debugLog('window.jspdf:', typeof window.jspdf);
    if (available) {
        window.debugLog('jsPDF constructor:', typeof window.jspdf.jsPDF);
    }
    return available;
};

const loadImageAsDataURL = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // Enable CORS
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = this.naturalWidth;
                canvas.height = this.naturalHeight;
                ctx.drawImage(this, 0, 0);
                const dataURL = canvas.toDataURL('image/jpeg', 0.8);
                resolve({
                    dataURL: dataURL,
                    width: this.naturalWidth,
                    height: this.naturalHeight
                });
            } catch (error) {
                console.error('Canvas error:', error);
                reject(error);
            }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url;
    });
};

const addSlidesToPDF = async (doc, imageUrls) => {
    for (let i = 0; i < imageUrls.length; i++) {
        try {
            numSlidesComplete++;
            showCustomAlert(`Generating slide deck as PDF: ${numSlidesComplete}/${imageUrls.length} slides complete...`);
            
            window.debugLog(`Loading image ${i + 1}/${imageUrls.length}:`, imageUrls[i]);
            const imageData = await loadImageAsDataURL(imageUrls[i]);
            
            // Calculate dimensions to fit page (landscape A4: 297 x 210 mm)
            const pageWidth = 297;
            const pageHeight = 210;
            const imgAspectRatio = imageData.width / imageData.height;
            const pageAspectRatio = pageWidth / pageHeight;
            
            let width, height;
            if (imgAspectRatio > pageAspectRatio) {
                // Image is wider relative to page
                width = pageWidth;
                height = pageWidth / imgAspectRatio;
            } else {
                // Image is taller relative to page
                height = pageHeight;
                width = pageHeight * imgAspectRatio;
            }
            
            // Center the image on page
            const x = (pageWidth - width) / 2;
            const y = (pageHeight - height) / 2;
            
            // Add new page for each slide (except first)
            if (i > 0) {
                doc.addPage();
            }
            
            // Add image to PDF
            doc.addImage(imageData.dataURL, 'JPEG', x, y, width, height);
            window.debugLog(`Added slide ${i + 1} to PDF`);
            
        } catch (error) {
            console.error(`Error processing slide ${i + 1}:`, error);
            // Continue with next slide even if one fails
        }
    }
};

const buildPdf = async (imageUrls) => {
    try {
        window.debugLog('=== buildPdf called with jsPDF ===');
        
        if (!checkJsPDFAvailable()) {
            throw new Error('jsPDF library not available');
        }
        
        window.debugLog('Creating jsPDF document...');
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });
        
        window.debugLog('jsPDF document created successfully');
        startTime = new Date().getTime();
        
        await addSlidesToPDF(doc, imageUrls);
        
        window.debugLog('Generating PDF blob...');
        const pdfBlob = doc.output('blob');
        
        // Create download link
        const blobUrl = URL.createObjectURL(pdfBlob);
        let totalTime = new Date().getTime() - startTime;
        
        window.debugLog('PDF generation completed in', totalTime, 'ms');
        
        // Trigger download
        initiateDownload(blobUrl);
        hideCustomAlert();
        showDefaultAlert("Done! Slide deck PDF generated in " + String(totalTime) + " ms.");
        
        // Notify completion
        if (typeof slideDeckGenerationInProgress !== 'undefined') {
            slideDeckGenerationInProgress = false;
        }
        if (typeof connection !== 'undefined' && connection) {
            connection.postMessage({requestType: "SET_JOB_COMPLETE"});
        }
        
    } catch (error) {
        console.error('Error in buildPdf:', error);
        if (typeof slideDeckGenerationInProgress !== 'undefined') {
            slideDeckGenerationInProgress = false;
        }
        hideCustomAlert();
        showDefaultAlert("ERROR: Failed to generate PDF - " + error.message);
        throw error;
    }
};