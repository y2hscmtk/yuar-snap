import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generatePDF = async (elementId, fileName = 'contract.pdf') => {
    const originalElement = document.getElementById(elementId);
    if (!originalElement) {
        console.error('Element not found');
        return;
    }

    try {
        // Clone the element to render it at full size without scaling interference
        const clone = originalElement.cloneNode(true);

        // Create a container for the clone that mimics a desktop viewport/A4 size
        const container = document.createElement('div');
        container.style.position = 'fixed';
        container.style.top = '-10000px';
        container.style.left = '-10000px';
        container.style.width = '210mm'; // Force A4 width
        container.style.height = 'auto';
        container.style.zIndex = '-1';
        container.style.overflow = 'visible'; // Ensure nothing is clipped

        // Remove page dividers from the clone so they don't appear in the PDF
        const dividers = clone.querySelector('.page-divider-layer');
        if (dividers) {
            dividers.remove();
        }

        // Force width to A4 (210mm) in pixels at 96 DPI ≈ 794px
        // We use a slightly higher resolution for better quality, e.g., scale 2
        // We use a slightly higher resolution for better quality, e.g., scale 2
        // const a4WidthPx = 794; 
        clone.style.width = '210mm'; // Match container width exactly
        clone.style.height = 'auto'; // Let height adjust automatically
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.padding = '20mm'; // Keep padding consistent
        clone.style.boxShadow = 'none';

        container.appendChild(clone);
        document.body.appendChild(container);

        // Wait a moment for layout to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- Smart Page Break Logic Removed ---
        // User requested to remove automatic page break calculations due to bugs.
        // Content will flow naturally, and manual page breaks (if any) will be used.
        // -----------------------------

        const canvas = await html2canvas(clone, {
            scale: 2, // Higher scale for better quality
            useCORS: true, // For images
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 794, // Approx 210mm at 96 DPI
            windowHeight: 1123 // Approx 297mm at 96 DPI
        });

        // Clean up the clone
        document.body.removeChild(container);

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const imgWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 0;

        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;

        // Handle multi-page if content is long
        // Add a small tolerance (e.g., 1mm) to prevent empty pages due to rounding errors
        while (heightLeft >= 1) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
        }

        pdf.save(fileName);
    } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Failed to generate PDF. Please try again.');
    }
};
