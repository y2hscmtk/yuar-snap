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
        const a4WidthPx = 794;
        clone.style.width = `${a4WidthPx}px`;
        clone.style.height = 'auto'; // Let height adjust automatically
        clone.style.transform = 'none';
        clone.style.margin = '0';
        clone.style.padding = '20mm'; // Keep padding consistent
        clone.style.boxShadow = 'none';

        container.appendChild(clone);
        document.body.appendChild(container);

        // Wait a moment for layout to settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // --- Smart Page Break Logic ---
        // We need to ensure no content element crosses the A4 page boundary (every 1122.5px).
        // If it does, we push it to the next page using margin-top.

        const pageHeightPx = 1122.5; // A4 height in px at 96 DPI
        const buffer = 20; // Extra buffer to ensure it clears the line

        // Select all "atomic" blocks that we don't want to split
        // We target the body content specifically, and now individual list items and table rows
        // We also target divs inside list items to allow splitting between main text and sub-text
        const contentBlocks = Array.from(clone.querySelectorAll(
            '.contract-header, .info-table tr, .contract-body h3, .contract-body p, .contract-body li > div, .contract-body li:not(:has(div)), .contract-footer'
        ));

        for (const block of contentBlocks) {
            const rect = block.getBoundingClientRect();
            // We need the position relative to the container (the clone)
            // Since container is at -10000, -10000, we can use offsetTop if the parent is positioned
            // But clone has padding. Let's use offsetTop relative to the clone wrapper.

            // Actually, simply checking offsetTop of the element is enough because 
            // the clone is the offsetParent (it has position: relative from CSS class .contract-paper? 
            // Let's check CSS. .contract-paper has position: relative).

            const top = block.offsetTop;
            const height = block.offsetHeight;
            const bottom = top + height;

            // Calculate which page the top is on (0-indexed)
            const startPage = Math.floor(top / pageHeightPx);
            // Calculate which page the bottom is on
            const endPage = Math.floor(bottom / pageHeightPx);

            if (startPage !== endPage) {
                // The element crosses a page boundary.
                // Calculate how much space is left on the current page
                const boundary = (startPage + 1) * pageHeightPx;
                const diff = boundary - top;

                // Add margin-top to push it to the next page
                // We add the diff (to reach the bottom) + buffer
                // But wait, if we add margin-top, it pushes the element down.
                // We need to make sure we don't break the layout of previous elements.
                // Adding margin-top to *this* element is safe for flow layout.

                // Check if it's already pushed (to avoid double pushing if we run this multiple times, though we don't)
                const currentMargin = parseFloat(window.getComputedStyle(block).marginTop) || 0;
                block.style.marginTop = `${currentMargin + diff + buffer}px`;
            }
        }

        // Wait again for layout to update after margin changes
        await new Promise(resolve => setTimeout(resolve, 100));
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
