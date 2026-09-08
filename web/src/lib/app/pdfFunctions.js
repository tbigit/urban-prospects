// @ts-nocheck
import { mount, unmount } from 'svelte';
import { processChartVariables } from '$lib/app/helperFunctions.js';
import Chart from 'chart.js/auto';
import EthnicityChartWrapper from '$lib/app/EthnicityChartWrapper.svelte';
import CrimeCountChartWrapper from '$lib/app/CrimeCountChartWrapper.svelte';
import RankChartWrapper from '$lib/app/RankChartWrapper.svelte';
import AgeChartWrapper from '$lib/app/AgeChartWrapper.svelte';
import AgePyramidChartWrapper from '$lib/app/AgePyramidChartWrapper.svelte';

export async function initPdfMe() {
    // Load schemas DYNAMICALLY - THESE ARE READY PLUGINS, NOT FACTORIES
    const schemas = await import('@pdfme/schemas');
    window.textPlugin = schemas.text;     // Direct plugin object
    window.imagePlugin = schemas.image;   // Direct plugin object
    window.rectanglePlugin = schemas.rectangle;     // Rectangle plugin for boxes
    window.linePlugin = schemas.line;               // Line plugin for dividers
    window.ellipsePlugin = schemas.ellipse;         // Ellipse plugin for circles

    const common = await import('@pdfme/common');

    const generator = await import('@pdfme/generator');
    window.generatePdf = async (template, inputs) => {
      // Use plugins DIRECTLY (no invocation needed)
      const plugins = {
        text: window.textPlugin,     // Already a plugin
        image: window.imagePlugin,   // Already a plugin
        rectangle: window.rectanglePlugin,      // Rectangle plugin
        line: window.linePlugin,                 // Line plugin
        ellipse: window.ellipsePlugin            // Ellipse plugin
      };
      
      return generator.generate({ 
        template, 
        inputs, 
        plugins 
      });
    };
}

export function buildTemplate(config, propertyData = null) {
    const pages = [];
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const centerX = pageWidth / 2;
    const colWidth = (pageWidth - margin * 2) / 4;

    // --- PAGE 1: COVER PAGE ---
    if (config.cover_page !== false) {
      const coverSchema = {};

      // Logo (Centered Top)
      if (config.cover_logo) {
        coverSchema['cover_logo'] = {
          type: 'image',
          position: { x: centerX - 50, y: 40 },
          width: 100,
          height: 50,
        };
      }
      // Title (H1 Size)
      coverSchema['cover_title'] = {
        type: 'text',
        position: { x: margin, y: 95 },
        width: pageWidth - margin * 2,
        height: 25,
        fontSize: 36,
        fontWeight: 'bold',
        alignment: 'center',
        fontColor: '#5c2587',
      };

      // Address (H2 Size)
      coverSchema['address'] = {
        type: 'text',
        position: { x: margin, y: 115 },
        width: pageWidth - margin * 2,
        height: 18,
        fontSize: 18,
        alignment: 'center',
      };

      // Background Image
      if (config.cover_background_image) {
        coverSchema['cover_background_image'] = {
          type: 'image',
          position: { x: 0, y: 145 },
          width: pageWidth,
          height: 120,
        };
      }

      // Purple Footer Block
      coverSchema['cover_footer_bg'] = {
        type: 'text',
        position: { x: 0, y: 255 },
        width: pageWidth,
        height: 42,
        backgroundColor: '#5c2587',
      };

      // Footer - Prepared For
      coverSchema['cover_prepared_for'] = {
        type: 'text',
        position: { x: margin, y: 272 },
        width: 90,
        height: 10,
        fontSize: 12,
        fontColor: '#ffffff',
      };

      // Footer - Date
      coverSchema['cover_prepared_date'] = {
        type: 'text',
        position: { x: 120, y: 272 },
        width: 70,
        height: 10,
        fontSize: 12,
        alignment: 'right',
        fontColor: '#ffffff',
      };

      pages.push(coverSchema);
    }

    // --- PAGE 2: OVERVIEW + SUBURB PROFILE & NEARBY ---
    const hasSuburbProfile = config.suburb_profile;
    const hasNearby = config.near_by_school || config.near_by_hospital || config.near_by_train;
    
    if (config.overview || hasSuburbProfile || hasNearby) {
      const page2Schema = {};
      let y = 20;

      // --- OVERVIEW SECTION ---
      if (config.overview) {
        const overviewStartY = y;

        // Rounded background box for overview section
        page2Schema['overview_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: 170,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        // Light grey divider line below title
        page2Schema['overview_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        // 4-Row Grid Generation (4 pairs per row, stacked label/value)
        const rowHeight = 16; // Reduced from 22 to save space
        const quarterPage = (pageWidth - margin * 2) / 4; // Four main columns per row

        // Iterate through the 14 data pairs
        let r = 1;
        let c = 1;

        for (let i = 1; i <= 28; i += 2) {
          // Calculate the column index (0, 1, 2, or 3)
          const colIndex = (c - 1) / 2;

          // Labels (info-type style: uppercase, lighter color, smaller font)
          page2Schema[`overview_row${r}_col${c}`] = {
            type: 'text',
            position: {
              x: margin + (colIndex * quarterPage),
              y: y + (r - 1) * rowHeight
            },
            width: quarterPage - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          
          // Values (larger font, darker, directly underneath)
          page2Schema[`overview_row${r}_col${c + 1}`] = {
            type: 'text',
            position: {
              x: margin + (colIndex * quarterPage),
              y: y + (r - 1) * rowHeight + 5
            },
            width: quarterPage - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
            fontColor: '#000000',
          };

          // Advance column, and if column reaches 7 (which means we finished col 1,2,3,4,5,6 logic), reset to col 1 and advance row
          if (c < 7) {
            c += 2;
          } else {
            c = 1;
            r++;
          }
        }
        
        y += 4 * rowHeight + 5; // After 4 rows + reduced padding

        // Rounded box around overview section
        const overviewEndY = y;
        page2Schema['overview_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: overviewStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: overviewEndY - overviewStartY + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
        
        y += 10; // Reduced gap before suburb section
      }

      // --- SUBURB PROFILE SECTION ---
      if (hasSuburbProfile) {
        const suburbProfileStartY = y;
        
        // Suburb Profile Title
        page2Schema['suburb_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        // Line under suburb profile title
        page2Schema['suburb_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        // ABOUT section
        page2Schema['about_label'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: (pageWidth - margin * 2) / 2 - 5,
          height: 5,
          fontSize: 6,
          fontWeight: 700,
          fontColor: '#666666',
        };
        page2Schema['infrastructure_label'] = {
          type: 'text',
          position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
          width: (pageWidth - margin * 2) / 2 - 5,
          height: 5,
          fontSize: 6,
          fontWeight: 700,
          fontColor: '#666666',
        };
        y += 6;

        page2Schema['about_text'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: (pageWidth - margin * 2) / 2 - 5,
          height: 50,
          fontSize: 7,
          lineHeight: 1.1,
        };
        page2Schema['infrastructure_text'] = {
          type: 'text',
          position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
          width: (pageWidth - margin * 2) / 2 - 5,
          height: 50,
          fontSize: 7,
          lineHeight: 1.1,
        };
        y += 55;

        // Rounded box around suburb profile section
        const suburbProfileEndY = y;
        page2Schema['suburb_profile_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: suburbProfileStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: suburbProfileEndY - suburbProfileStartY + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
        
        y += 10; // Gap before nearby section
      }

      // --- NEARBY SECTION ---
      if (hasNearby) {
        const nearbyStartY = y;

        // NEARBY section title
        page2Schema['nearby_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        // Line under nearby title
        page2Schema['nearby_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        // School (if enabled)
        if (config.near_by_school) {
          page2Schema['school_label'] = {
            type: 'text',
            position: { x: margin, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          page2Schema['school_distance_label'] = {
            type: 'text',
            position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          y += 6;

          page2Schema['school_value'] = {
            type: 'text',
            position: { x: margin, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
          };
          page2Schema['school_distance_value'] = {
            type: 'text',
            position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
          };
          y += 11;
        }

        // Hospital (if enabled)
        if (config.near_by_hospital) {
          page2Schema['hospital_label'] = {
            type: 'text',
            position: { x: margin, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          page2Schema['hospital_distance_label'] = {
            type: 'text',
            position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          y += 6;

          page2Schema['hospital_value'] = {
            type: 'text',
            position: { x: margin, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
          };
          page2Schema['hospital_distance_value'] = {
            type: 'text',
            position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
          };
          y += 11;
        }

        // Train (if enabled)
        if (config.near_by_train) {
          page2Schema['train_label'] = {
            type: 'text',
            position: { x: margin, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          page2Schema['train_distance_label'] = {
            type: 'text',
            position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 5,
            fontSize: 6,
            fontWeight: 700,
            fontColor: '#666666',
          };
          y += 6;

          page2Schema['train_value'] = {
            type: 'text',
            position: { x: margin, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
          };
          page2Schema['train_distance_value'] = {
            type: 'text',
            position: { x: margin + (pageWidth - margin * 2) / 2, y: y },
            width: (pageWidth - margin * 2) / 2 - 5,
            height: 8,
            fontSize: 9,
            fontWeight: 'bold',
          };
          y += 10;
        }

        // Rounded box around nearby section
        const nearbyEndY = y;
        page2Schema['nearby_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: nearbyStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: nearbyEndY - nearbyStartY + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      pages.push(page2Schema);
    }

    // --- PAGE 3: PERMISSIBLE USES AND SOLD HISTORY ---
    if (config.permissible_uses || config.sales_history) {
      const page3Schema = {};
      let y = 20;

      if (config.permissible_uses) {
        const puStartY = y;

        // Title
        page3Schema['pu_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        // Divider
        page3Schema['pu_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        // Permissible uses grid (4 columns, listed across rows)
        const colWidth = (pageWidth - margin * 2) / 4;
        const itemsPerRow = 4;
        const totalRows = 20;
        const rowHeight = 8;

        for (let row = 0; row < totalRows; row++) {
          for (let col = 0; col < itemsPerRow; col++) {
            page3Schema[`pu_item_r${row}_c${col}`] = {
              type: 'text',
              position: { x: margin + col * colWidth, y: y + row * rowHeight },
              width: colWidth - 5,
              height: 8,
              fontSize: 7,
            };
          }
        }

        y += totalRows * rowHeight + 10;

        // Box around permissible uses
        page3Schema['pu_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: puStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: y - puStartY + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      if (config.sales_history) {
        if (config.permissible_uses) {
          y += 10;
        }
        const shStartY = y;

        page3Schema['sh_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        page3Schema['sh_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        page3Schema['sh_na'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        const shMaxItems = config.sh_item_count !== undefined ? config.sh_item_count : 10;
        const shRowHeight = 18;
        for (let i = 0; i < shMaxItems; i++) {
          page3Schema[`sh_item_year_${i}`] = {
            type: 'text',
            position: { x: margin, y: y + i * shRowHeight },
            width: 30,
            height: 6,
            fontSize: 9,
            fontWeight: 'bold',
          };
          page3Schema[`sh_item_price_${i}`] = {
            type: 'text',
            position: { x: margin + 25, y: y + i * shRowHeight },
            width: pageWidth - margin * 2 - 25,
            height: 6,
            fontSize: 9,
            fontWeight: 'bold',
          };
          page3Schema[`sh_item_date_${i}`] = {
            type: 'text',
            position: { x: margin + 25, y: y + i * shRowHeight + 6 },
            width: pageWidth - margin * 2 - 25,
            height: 5,
            fontSize: 8,
            fontColor: '#999999',
          };
          page3Schema[`sh_item_line_${i}`] = {
            type: 'line',
            position: { x: margin, y: y + i * shRowHeight + 14 },
            width: pageWidth - margin * 2,
            height: 0.25,
            color: '#e8e8e8',
          };
        }

        if (shMaxItems === 0) {
          y += 15; // Gap for N/A text
        } else {
          y += shMaxItems * shRowHeight + 5;
        }

        page3Schema['sh_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: shStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: y - shStartY + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      pages.push(page3Schema);
    }

    // --- PAGE 4: EVERYTHING ELSE (LEP, CDC, PLANNING CONSTRAINTS, PATTERN BOOKS) ---
    const hasLep = config.local_environmental_plans;
    const hasCdc = config.comply_development || config.complying_development;
    const hasPc = config.planning_constraints;
    const hasPb = config.pattern_books;

    if (hasLep || hasCdc || hasPc || hasPb) {
      const page4Schema = {};
      let y = 20;

      const gap = 7;
      const totalBoxArea = pageWidth - margin * 2 + 10;
      const boxWidth = (totalBoxArea - gap) / 2;
      const contentWidth = boxWidth - 10;
      
      const leftBoxX = margin - 5;
      const leftX = margin;
      
      const rightBoxX = (margin - 5) + boxWidth + gap;
      const rightX = rightBoxX + 5;

      // We will place items in a grid flow (left/right columns).
      const activeSections = [];
      if (hasLep) activeSections.push('lep');
      if (hasPc) activeSections.push('pc');
      if (hasCdc) activeSections.push('cdc');
      if (hasPb) activeSections.push('pb');

      let currentBoxY = [y, y]; // Track Y position for left and right columns
      
      const fixedSectionHeight = 12 + 3 + 10 + (11 * 8); // title + div + na + 11 items
      
      // Layout helper to get the next column (0 for left, 1 for right) and update its Y position
      function placeSection() {
        const col = currentBoxY[0] <= currentBoxY[1] ? 0 : 1;
        const startY = currentBoxY[col];
        currentBoxY[col] += fixedSectionHeight + 10; // add gap
        return { col, startY };
      }

      // --- LEP SECTION ---
      if (hasLep) {
        const { col, startY: lepStartY } = placeSection();
        let lepY = lepStartY;
        const xPos = col === 0 ? leftX : rightX;
        const boxXPos = col === 0 ? leftBoxX : rightBoxX;

        page4Schema['lep_title'] = {
          type: 'text',
          position: { x: xPos, y: lepY },
          width: contentWidth,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        lepY += 12;

        page4Schema['lep_divider'] = {
          type: 'line',
          position: { x: xPos, y: lepY - 3 },
          width: contentWidth,
          height: 0.25,
          color: '#d0d0d0',
        };
        lepY += 3;

        // N/A text for when no LEP data
        page4Schema['lep_na'] = {
          type: 'text',
          position: { x: xPos, y: lepY },
          width: contentWidth,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        // LEP items (single column, fixed height for up to 10 items)
        for (let i = 0; i < 10; i++) {
          page4Schema[`lep_item_${i}`] = {
            type: 'text',
            position: { x: xPos, y: lepY + i * 8 },
            width: contentWidth,
            height: 7,
            fontSize: 8,
          };
        }

        page4Schema['lep_box'] = {
          type: 'rectangle',
          position: { x: boxXPos, y: lepStartY - 5 },
          width: boxWidth,
          height: fixedSectionHeight + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      // --- PLANNING CONSTRAINTS SECTION ---
      if (hasPc) {
        const { col, startY: pcStartY } = placeSection();
        let pcY = pcStartY;
        const xPos = col === 0 ? leftX : rightX;
        const boxXPos = col === 0 ? leftBoxX : rightBoxX;

        page4Schema['pc_title'] = {
          type: 'text',
          position: { x: xPos, y: pcY },
          width: contentWidth,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        pcY += 12;

        page4Schema['pc_divider'] = {
          type: 'line',
          position: { x: xPos, y: pcY - 3 },
          width: contentWidth,
          height: 0.25,
          color: '#d0d0d0',
        };
        pcY += 3;

        // N/A text for when no planning constraints
        page4Schema['pc_na'] = {
          type: 'text',
          position: { x: xPos, y: pcY },
          width: contentWidth,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        // PC items (1 column, fixed height for up to 10 items to match LEP height)
        for (let i = 0; i < 10; i++) {
          page4Schema[`pc_item_${i}`] = {
            type: 'text',
            position: { x: xPos, y: pcY + i * 8 },
            width: contentWidth,
            height: 7,
            fontSize: 8,
          };
        }

        page4Schema['pc_box'] = {
          type: 'rectangle',
          position: { x: boxXPos, y: pcStartY - 5 },
          width: boxWidth,
          height: fixedSectionHeight + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      // --- COMPLY DEVELOPMENT SECTION ---
      if (hasCdc) {
        const cdcItemCount = config.cdc_item_count !== undefined ? config.cdc_item_count : 11;
        const { col, startY: cdcStartY } = placeSection();
        let cdcY = cdcStartY;
        const xPos = col === 0 ? leftX : rightX;
        const boxXPos = col === 0 ? leftBoxX : rightBoxX;

        page4Schema['cdc_title'] = {
          type: 'text',
          position: { x: xPos, y: cdcY },
          width: contentWidth,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
          text: 'COMPLY DEVELOPMENT'
        };
        cdcY += 12;

        page4Schema['cdc_divider'] = {
          type: 'line',
          position: { x: xPos, y: cdcY - 3 },
          width: contentWidth,
          height: 0.25,
          color: '#d0d0d0',
        };
        cdcY += 3;

        // N/A text for when no CDC data
        page4Schema['cdc_na'] = {
          type: 'text',
          position: { x: xPos, y: cdcY },
          width: contentWidth,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        // CDC items (1 column)
        for (let i = 0; i < cdcItemCount; i++) {
          page4Schema[`cdc_item_${i}`] = {
            type: 'text',
            position: { x: xPos, y: cdcY + i * 8 },
            width: contentWidth,
            height: 7,
            fontSize: 8,
          };
        }

        page4Schema['cdc_box'] = {
          type: 'rectangle',
          position: { x: boxXPos, y: cdcStartY - 5 },
          width: boxWidth,
          height: fixedSectionHeight + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      // --- PATTERN BOOKS SECTION ---
      if (hasPb) {
        const { col, startY: pbStartY } = placeSection();
        let pbY = pbStartY;
        const xPos = col === 0 ? leftX : rightX;
        const boxXPos = col === 0 ? leftBoxX : rightBoxX;

        page4Schema['pb_title'] = {
          type: 'text',
          position: { x: xPos, y: pbY },
          width: contentWidth,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
          text: 'PATTERN BOOKS'
        };
        pbY += 12;

        page4Schema['pb_divider'] = {
          type: 'line',
          position: { x: xPos, y: pbY - 3 },
          width: contentWidth,
          height: 0.25,
          color: '#d0d0d0',
        };
        pbY += 3;

        page4Schema['pb_na'] = {
          type: 'text',
          position: { x: xPos, y: pbY },
          width: contentWidth,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
          text: 'N/A'
        };

        // Placeholder items for pattern books
        for (let i = 0; i < 11; i++) {
          page4Schema[`pb_item_${i}`] = {
            type: 'text',
            position: { x: xPos, y: pbY + i * 8 },
            width: contentWidth,
            height: 7,
            fontSize: 8,
          };
        }

        page4Schema['pb_box'] = {
          type: 'rectangle',
          position: { x: boxXPos, y: pbStartY - 5 },
          width: boxWidth,
          height: fixedSectionHeight + 5,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };
      }

      pages.push(page4Schema);
    }

    // Define exclusionToLayerMap for planning constraint maps
    const exclusionToLayerMap = {
      'activestreetfrontage': { label: 'Active Street Frontages', layer: 'frontage' },
      'australian_noise_exposure_forecast': { label: 'Airport Noise', layer: 'airport' },
      'biodiversity': { label: 'Terrestrial Biodiversity', layer: 'terrestrialbiodiversity' },
      'bushfireproneland': { label: 'Bushfire Prone', layer: 'bushfire' },
      'coastalmanagement': { label: 'Coastal Management', layer: 'coastalmanagement' },
      'contamination_activity_type': { label: 'Contaminated Sites', layer: 'contaminationsites' },
      'drinkingcatchment': { label: 'Drinking Catchment', layer: 'drinking_water_catchment' },
      'floodmapping': { label: 'Flood Zone', layer: 'floodplanning' },
      'groundwatervulnerability': { label: 'Groundwater Vulnerability', layer: 'groundwatervulnerability' },
      'h_name': { label: 'Heritage', layer: 'heritage' },
      'landsliderisk': { label: 'Landslide', layer: 'landsliderisk' },
      'mineralresoureland': { label: 'Mineral & Resource Land', layer: 'mineralresourceland' },
      'minesubsidence': { label: 'Mine Subsidence', layer: 'mine_subsidence_district' },
      'riparianlandwatercouse': { label: 'Riparian Lands and Water Courses', layer: 'riparianlandwatercourse' },
      'salinity': { label: 'Salinity', layer: 'salinity' },
      'scenicprotectionland': { label: 'Scenic Protection Lands', layer: 'scenicprotectionland' },
      'wetland': { label: 'Wetlands', layer: 'wetlands' }
    };

    // --- PLANNING CONSTRAINT MAP PAGES (before DEVELOPMENT APPLICATIONS) ---
    if (config.planning_constraint_maps && propertyData) {
      const activeExclusions = Object.entries(exclusionToLayerMap).filter(([key, val]) => propertyData[key]);
      
      for (const [exclusionKey, exclusionInfo] of activeExclusions) {
        const mapPageSchema = {};
        const keyPrefix = `pcm_${exclusionKey}`;
        let mapY = 20;

        mapPageSchema[`${keyPrefix}_title`] = {
          type: 'text',
          position: { x: margin, y: mapY },
          width: pageWidth - margin * 2,
          height: 12,
          fontSize: 14,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        mapY += 15;

        mapPageSchema[`${keyPrefix}_image`] = {
          type: 'image',
          position: { x: margin, y: mapY },
          width: pageWidth - margin * 2,
          height: 175,
        };
        mapY += 180;

        mapPageSchema[`${keyPrefix}_legend`] = {
          type: 'text',
          position: { x: margin, y: mapY },
          width: pageWidth - margin * 2,
          height: 40,
          fontSize: 8,
          fontColor: '#888888',
        };

        pages.push(mapPageSchema);
      }
    }

    // --- PAGE 5: DEVELOPMENT APPLICATIONS ---
    if (config.development_applications) {
      const page5Schema = {};
      let y = 20;
      const daStartY = y;

      page5Schema['da_title'] = {
        type: 'text',
        position: { x: margin, y: y },
        width: pageWidth - margin * 2,
        height: 10,
        fontSize: 12,
        fontWeight: 'bold',
        fontColor: '#5c2587',
      };
      y += 12;

      page5Schema['da_divider'] = {
        type: 'line',
        position: { x: margin, y: y - 3 },
        width: pageWidth - margin * 2,
        height: 0.25,
        color: '#d0d0d0',
      };
      y += 3;

      // N/A text for when no DA data
      page5Schema['da_na'] = {
        type: 'text',
        position: { x: margin, y: y },
        width: pageWidth - margin * 2,
        height: 10,
        fontSize: 10,
        fontColor: '#999999',
      };

      // Structure for up to 5 DAs on the page
      for (let i = 0; i < 5; i++) {
        // Application Type
        page5Schema[`da_type_${i}`] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 10,
          fontWeight: 'bold',
        };
        
        // App Number Label & Value
        page5Schema[`da_app_num_label_${i}`] = {
          type: 'text',
          position: { x: margin, y: y + 10 },
          width: 80,
          height: 5,
          fontSize: 6,
          fontWeight: 'bold',
          fontColor: '#666666',
        };
        page5Schema[`da_app_num_${i}`] = {
          type: 'text',
          position: { x: margin, y: y + 15 },
          width: 80,
          height: 8,
          fontSize: 8,
        };

        // Status Label & Value
        page5Schema[`da_status_label_${i}`] = {
          type: 'text',
          position: { x: margin + 85, y: y + 10 },
          width: 80,
          height: 5,
          fontSize: 6,
          fontWeight: 'bold',
          fontColor: '#666666',
        };
        page5Schema[`da_status_${i}`] = {
          type: 'text',
          position: { x: margin + 85, y: y + 15 },
          width: 80,
          height: 8,
          fontSize: 8,
        };

        // Type of Dev Label & Value
        page5Schema[`da_dev_type_label_${i}`] = {
          type: 'text',
          position: { x: margin, y: y + 25 },
          width: 80,
          height: 5,
          fontSize: 6,
          fontWeight: 'bold',
          fontColor: '#666666',
        };
        page5Schema[`da_dev_type_${i}`] = {
          type: 'text',
          position: { x: margin, y: y + 30 },
          width: 80,
          height: 12,
          fontSize: 8,
          lineHeight: 1.1,
        };

        // Council Label & Value
        page5Schema[`da_council_label_${i}`] = {
          type: 'text',
          position: { x: margin + 85, y: y + 25 },
          width: 80,
          height: 5,
          fontSize: 6,
          fontWeight: 'bold',
          fontColor: '#666666',
        };
        page5Schema[`da_council_${i}`] = {
          type: 'text',
          position: { x: margin + 85, y: y + 30 },
          width: 80,
          height: 12,
          fontSize: 8,
          lineHeight: 1.1,
        };

        y += 45; // Move to next DA block
      }

      page5Schema['da_box'] = {
        type: 'rectangle',
        position: { x: margin - 5, y: daStartY - 5 },
        width: pageWidth - margin * 2 + 10,
        height: y - daStartY + 5,
        borderWidth: 0.25,
        borderColor: '#d0d0d0',
        radius: 2,
      };

      pages.push(page5Schema);
    }

    // --- PAGE 5.5: DEVELOPMENT APPLICATIONS MAP ---
    if (config.development_applications_maps && propertyData) {
      const daMapPageSchema = {};
      let mapY = 20;

      daMapPageSchema[`da_map_title`] = {
        type: 'text',
        position: { x: margin, y: mapY },
        width: pageWidth - margin * 2,
        height: 12,
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#5c2587',
      };
      mapY += 15;

      daMapPageSchema[`da_map_image`] = {
        type: 'image',
        position: { x: margin, y: mapY },
        width: pageWidth - margin * 2,
        height: 175,
      };
      mapY += 180;

      daMapPageSchema[`da_map_legend_title`] = {
        type: 'text',
        position: { x: margin, y: mapY },
        width: pageWidth - margin * 2,
        height: 10,
        fontSize: 10,
        fontWeight: 'bold',
        fontColor: '#333333',
      };
      mapY += 10;

      const daLegends = [
        { label: 'Under Assessment', color: '#FFA500' },
        { label: 'Approved', color: '#388E3C' },
        { label: 'Withdrawn', color: '#9E9E9E' },
        { label: 'Refused', color: '#EF5350' },
        { label: 'Determined', color: '#8BC34A' }
      ];

      daLegends.forEach((leg, idx) => {
        daMapPageSchema[`da_map_legend_color_${idx}`] = {
          type: 'ellipse',
          position: { x: margin, y: mapY - 0.5 },
          width: 4,
          height: 4,
          color: leg.color,
        };
        daMapPageSchema[`da_map_legend_text_${idx}`] = {
          type: 'text',
          position: { x: margin + 6, y: mapY },
          width: 50,
          height: 6,
          fontSize: 8,
          fontColor: '#333333',
        };
        mapY += 6;
      });

      pages.push(daMapPageSchema);
    }

    // --- PAGE 6, 7...: CENSUS ---
    const hasCensus = config.census_suburb_age_profile || config.census_ancestry || config.census_country_of_birth || config.census_rent_affordability || config.census_mortgage_affordability || config.census_weekly_household_income || config.census_tenure_type || config.census_household_composition || config.census_crime_occurrence || config.census_crime_rankings;

    if (hasCensus) {
      // Create a page for Census
      const page6Schema = {};
      let y = 20;

      // We might need to split this into multiple pages depending on how many charts we have. 
      // For now, let's create placeholders for up to 10 charts across 2 pages.
      const censusCharts = [
        { id: 'age', enabled: config.census_suburb_age_profile, label: 'Suburb Age Profile' },
        { id: 'ancestry', enabled: config.census_ancestry, label: 'Ancestry' },
        { id: 'birth', enabled: config.census_country_of_birth, label: 'Country of Birth' },
        { id: 'rent', enabled: config.census_rent_affordability, label: 'Rent Affordability' },
        { id: 'mortgage', enabled: config.census_mortgage_affordability, label: 'Mortgage Affordability' },
        { id: 'income', enabled: config.census_weekly_household_income, label: 'Weekly Household Income' },
        { id: 'tenure', enabled: config.census_tenure_type, label: 'Tenure Type' },
        { id: 'household', enabled: config.census_household_composition, label: 'Household Composition' },
        { id: 'crime', enabled: config.census_crime_occurrence, label: 'Crime Occurrence' },
        { id: 'crime_rank', enabled: config.census_crime_rankings, label: 'Crime Rankings' }
      ].filter(c => c.enabled);

      let currentCensusPage = page6Schema;
      const fullChartWidth = pageWidth - margin * 2;
      const halfChartWidth = (pageWidth - margin * 2 - 10) / 2;
      const chartHeight = 85;
      const rowGap = 30;
      let startY = 40;

      let slotsUsedOnPage = 0;
      let pageIndex = 0;

      for (let i = 0; i < censusCharts.length; i++) {
        const chart = censusCharts[i];
        
        const isFullWidth = (chart.id === 'crime' || chart.id === 'crime_rank');
        const isCrimeChart = (chart.id === 'crime' || chart.id === 'crime_rank');
        
        // Force Crime charts to start on a new page to give them their own title
        if (isCrimeChart && slotsUsedOnPage > 0 && i > 0 && !['crime', 'crime_rank'].includes(censusCharts[i-1].id)) {
          slotsUsedOnPage = 4; // force new page trigger
        }

        // If we need a full width chart but we're halfway through a row, skip to next row
        if (isFullWidth && slotsUsedOnPage % 2 !== 0) {
          slotsUsedOnPage += 1;
        }

        const slotsNeeded = isFullWidth ? 2 : 1;
        
        // Start a new page if we exceed slots per page (4 slots = 2 rows)
        if (slotsUsedOnPage + slotsNeeded > 4) {
          pages.push(currentCensusPage);
          currentCensusPage = {};
          pageIndex++;
          slotsUsedOnPage = 0;
        }

        // Add page header if it's the start of a page
        if (slotsUsedOnPage === 0) {
          const pageTitleText = isCrimeChart ? 'CRIME' : 'CENSUS';

          currentCensusPage[`census_title_${pageIndex}`] = {
            type: 'text',
            position: { x: margin, y: 20 },
            width: pageWidth - margin * 2,
            height: 10,
            fontSize: 12,
            fontWeight: 'bold',
            fontColor: '#5c2587',
            text: pageTitleText
          };

          currentCensusPage[`census_divider_${pageIndex}`] = {
            type: 'line',
            position: { x: margin, y: 29 },
            width: pageWidth - margin * 2,
            height: 0.25,
            color: '#d0d0d0',
          };
        }

        const col = slotsUsedOnPage % 2;
        const row = Math.floor(slotsUsedOnPage / 2);

        const currentChartWidth = isFullWidth ? fullChartWidth : halfChartWidth;
        const xPos = isFullWidth ? margin : margin + col * (halfChartWidth + 10);
        const yPos = startY + row * (chartHeight + rowGap);

        // Add grey divider line between rows
        if (row > 0 && slotsUsedOnPage % 2 === 0) {
          currentCensusPage[`census_row_divider_${pageIndex}_${row}`] = {
            type: 'line',
            position: { x: margin, y: yPos - (rowGap / 2) },
            width: pageWidth - margin * 2,
            height: 0.25,
            color: '#e0e0e0', // light grey
          };
        }

        // Add a title above each chart
        currentCensusPage[`census_chart_title_${chart.id}`] = {
          type: 'text',
          position: { x: xPos, y: yPos },
          width: currentChartWidth,
          height: 5,
          fontSize: 8,
          fontWeight: 'bold',
          fontColor: '#000000',
          text: chart.label.toUpperCase()
        };

        // Add chart image placeholder (chart converted to png, base64 encode)
        currentCensusPage[`census_chart_${chart.id}`] = {
          type: 'image',
          position: { x: xPos, y: yPos + 5 },
          width: currentChartWidth,
          height: chartHeight,
        };

        slotsUsedOnPage += slotsNeeded;
      }

      if (Object.keys(currentCensusPage).length > 0) {
        pages.push(currentCensusPage);
      }
    }

    // --- PAGE 8: CONTRIBUTION PLANS, DEVELOPMENT CONTROL PLANS, STATE ENVIRONMENTAL PLANNING ---
    const hasCp = config.contribution_plans !== false;
    const hasDcp = config.development_control_plans !== false;
    const hasSep = config.state_environmental_planning !== false;

    if (hasCp || hasDcp || hasSep) {
      const page8Schema = {};
      let y = 20;

      // --- CONTRIBUTION PLANS ---
      if (hasCp) {
        const cpStartY = y;
        
        page8Schema['cp_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: cpStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: 40 + 10 + 12 + 10,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };

        page8Schema['cp_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        page8Schema['cp_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        page8Schema['cp_na'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        for (let i = 0; i < 5; i++) {
          page8Schema[`cp_item_${i}`] = {
            type: 'text',
            position: { x: margin, y: y + i * 8 },
            width: pageWidth - margin * 2,
            height: 7,
            fontSize: 8,
            fontColor: '#000000',
          };
        }
        y += 40 + 10;
        
        page8Schema['cp_box'].height = y - cpStartY + 5;
        y += 10;
      }

      // --- DEVELOPMENT CONTROL PLANS ---
      if (hasDcp) {
        const dcpStartY = y;
        
        page8Schema['dcp_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: dcpStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: 40 + 10 + 12 + 10,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };

        page8Schema['dcp_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        page8Schema['dcp_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        page8Schema['dcp_na'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        for (let i = 0; i < 5; i++) {
          page8Schema[`dcp_item_${i}`] = {
            type: 'text',
            position: { x: margin, y: y + i * 8 },
            width: pageWidth - margin * 2,
            height: 7,
            fontSize: 8,
            fontColor: '#000000',
          };
        }
        y += 40 + 10;
        
        page8Schema['dcp_box'].height = y - dcpStartY + 5;
        y += 10;
      }

      // --- STATE ENVIRONMENTAL PLANNING ---
      if (hasSep) {
        const sepStartY = y;
        
        page8Schema['sep_box'] = {
          type: 'rectangle',
          position: { x: margin - 5, y: sepStartY - 5 },
          width: pageWidth - margin * 2 + 10,
          height: 80 + 10 + 12 + 10,
          borderWidth: 0.25,
          borderColor: '#d0d0d0',
          radius: 2,
        };

        page8Schema['sep_title'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 12,
          fontWeight: 'bold',
          fontColor: '#5c2587',
        };
        y += 12;

        page8Schema['sep_divider'] = {
          type: 'line',
          position: { x: margin, y: y - 3 },
          width: pageWidth - margin * 2,
          height: 0.25,
          color: '#d0d0d0',
        };
        y += 3;

        page8Schema['sep_na'] = {
          type: 'text',
          position: { x: margin, y: y },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 10,
          fontColor: '#999999',
        };

        for (let i = 0; i < 10; i++) {
          page8Schema[`sep_item_${i}`] = {
            type: 'text',
            position: { x: margin, y: y + i * 8 },
            width: pageWidth - margin * 2,
            height: 7,
            fontSize: 8,
            fontColor: '#000000',
          };
        }
        y += 80 + 10;
        
        page8Schema['sep_box'].height = y - sepStartY + 5;
      }

      pages.push(page8Schema);
    }

    // --- PAGE 9: PROPERTY DISCLAIMERS ---
    const page9Schema = {};
    let disclaimerY = 20;
    
    page9Schema['disclaimer_title'] = {
      type: 'text',
      position: { x: margin, y: disclaimerY },
      width: pageWidth - margin * 2,
      height: 10,
      fontSize: 12,
      fontWeight: 'bold',
      fontColor: '#5c2587',
    };
    disclaimerY += 12;

    page9Schema['disclaimer_divider'] = {
      type: 'line',
      position: { x: margin, y: disclaimerY - 3 },
      width: pageWidth - margin * 2,
      height: 0.25,
      color: '#d0d0d0',
    };
    disclaimerY += 3;

    page9Schema['disclaimer_text'] = {
      type: 'text',
      position: { x: margin, y: disclaimerY },
      width: pageWidth - margin * 2,
      height: 200,
      fontSize: 8,
      lineHeight: 1.2,
      fontColor: '#000000',
    };
    
    // Mapbox Last Page (inserted before disclaimers)
    if (config.mapbox_last_page) {
      let mapboxPage = {};
      let mapY = 20;
      
      const saveTitle = config.save_model_title || (propertyData && propertyData.save_model_title) || "";
      
      mapboxPage['mapbox_last_page_title'] = {
        type: 'text',
        position: { x: margin, y: mapY}, // Moved up by 10 units
        width: pageWidth - margin * 2,
        height: 12,
        fontSize: 14,
        fontWeight: 'bold',
        fontColor: '#5c2587',
      };
      mapY += 15;
      
      mapboxPage['mapbox_last_page_divider'] = {
        type: 'line',
        position: { x: margin, y: mapY - 3 },
        width: pageWidth - margin * 2,
        height: 0.25,
        color: '#d0d0d0',
      };
      mapY += 3;
      
      mapboxPage['mapbox_last_page_image'] = {
        type: 'image',
        position: { x: margin, y: mapY },
        width: pageWidth - margin * 2,
        height: 175,
      };
      mapY += 178; // reduced from 180 to move text closer
      
      if (saveTitle !== "") {
        mapboxPage['save_model_title'] = {
          type: 'text',
          position: { x: margin, y: mapY - 30 },
          width: pageWidth - margin * 2,
          height: 10,
          fontSize: 10,
          fontWeight: 'bold',
          fontColor: '#333333',
        };
      }
      
      pages.push(mapboxPage);
    }

    // --- DEVELOPMENT CALCULATIONS PAGE (yield + residual), before disclaimers ---
    if (config.development_calculations && propertyData) {
      const { hasYield, hasResidual } = buildDevelopmentCalcData(propertyData);
      if (hasYield || hasResidual) {
        const calcPage = {};
        let cy = 20;

        calcPage['calc_title'] = {
          type: 'text',
          position: { x: margin, y: cy },
          width: pageWidth - margin * 2, height: 12,
          fontSize: 14, fontWeight: 'bold', fontColor: '#5c2587',
        };
        cy += 15;
        calcPage['calc_divider'] = {
          type: 'line',
          position: { x: margin, y: cy - 3 },
          width: pageWidth - margin * 2, height: 0.25, color: '#d0d0d0',
        };
        cy += 5;

        if (hasYield) {
          calcPage['calc_yield_heading'] = {
            type: 'text', position: { x: margin, y: cy },
            width: pageWidth - margin * 2, height: 8,
            fontSize: 11, fontWeight: 'bold', fontColor: '#31144D',
          };
          cy += 9;
          calcPage['calc_yield_text'] = {
            type: 'text', position: { x: margin, y: cy },
            width: pageWidth - margin * 2, height: 55,
            fontSize: 9, lineHeight: 1.4, fontColor: '#000000',
          };
          cy += 60;
        }

        if (hasResidual) {
          calcPage['calc_residual_heading'] = {
            type: 'text', position: { x: margin, y: cy },
            width: pageWidth - margin * 2, height: 8,
            fontSize: 11, fontWeight: 'bold', fontColor: '#31144D',
          };
          cy += 9;
          calcPage['calc_residual_text'] = {
            type: 'text', position: { x: margin, y: cy },
            width: pageWidth - margin * 2, height: 50,
            fontSize: 9, lineHeight: 1.4, fontColor: '#000000',
          };
          cy += 54;
          calcPage['calc_residual_value_label'] = {
            type: 'text', position: { x: margin, y: cy },
            width: pageWidth - margin * 2, height: 7,
            fontSize: 9, fontColor: '#666666',
          };
          cy += 7;
          calcPage['calc_residual_value'] = {
            type: 'text', position: { x: margin, y: cy },
            width: pageWidth - margin * 2, height: 14,
            fontSize: 18, fontWeight: 'bold', fontColor: '#5c2587',
          };
        }

        pages.push(calcPage);
      }
    }

    pages.push(page9Schema);

    // // Add page numbers to all pages except cover (index 0)
    for (let i = 1; i < pages.length; i++) {
      pages[i]['page_number'] = {
        type: 'text',
        position: { x: pageWidth - margin - 20, y: pageHeight - 15 },
        width: 20,
        height: 10,
        fontSize: 10,
        color: '#000000',
        alignment: 'right',
      };
    }

    return {
      basePdf: {
        width: 210,
        height: 297,
        padding: [0, 0, 0, 0]
      },
      schemas: pages
    };
}

// Builds the field values for the "Development Analysis" PDF page from a property's
// yield snapshot (propertyData.yield_snapshot) and residual feasibility
// (propertyData.feasibility). Returns { hasYield, hasResidual, fields } — used by both
// buildTemplate (to decide whether to add the page) and createPdf (to fill the inputs).
export function buildDevelopmentCalcData(propertyData) {
  const ys = propertyData && propertyData.yield_snapshot;
  const fz = propertyData && propertyData.feasibility;

  const hasYield = !!(ys && (ys.totalDwellings > 0 || (Array.isArray(ys.breakdown) && ys.breakdown.length)));
  const finalTotal = fz ? parseFloat(fz.final_total) : NaN;
  const hasResidual = !!(fz && fz.final_total !== undefined && fz.final_total !== null && fz.final_total !== '' && !isNaN(finalTotal));

  const money = (v) => {
    const n = Math.round(parseFloat(v) || 0);
    const s = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Math.abs(n));
    return (n < 0 ? '-$' : '$') + s;
  };

  const fields = { calc_title: 'DEVELOPMENT ANALYSIS' };

  if (hasYield) {
    const lines = [];
    lines.push(`Development type: ${ys.developmentLabel || ys.developmentType || '--'}`);
    if (ys.developmentType === 'apartments' && ys.floors) lines.push(`Levels: ${ys.floors}`);
    if (ys.gfa) lines.push(`Gross floor area: ${ys.gfa} m²`);
    if (ys.developmentType === 'subdivisions') {
      lines.push(`Total lots: ${ys.totalDwellings}`);
    } else {
      lines.push(`Total dwellings: ${ys.totalDwellings}`);
      (ys.breakdown || []).forEach((b) => lines.push(`   • ${b.count} × ${b.label}`));
    }
    fields.calc_yield_heading = 'DEVELOPMENT YIELD';
    fields.calc_yield_text = lines.join('\n');
  }

  if (hasResidual) {
    const lines = [];
    if (fz.gfa) lines.push(`Gross floor area: ${Math.round(parseFloat(fz.gfa) || 0)} m²`);
    if (fz.final_fsr) lines.push(`Final FSR: ${Math.round((parseFloat(fz.final_fsr) || 0) * 100) / 100}`);
    lines.push(`Total sales revenue: ${money(fz.price_total)}`);
    lines.push(`Construction cost: ${money(fz.cost_total)}`);
    lines.push(`Government fees & charges: ${money(fz.fees_total)}`);
    lines.push(`Consultants: ${money(fz.consulting_costs_total)}`);
    lines.push(`Holding costs: ${money(fz.holding_costs_total)}`);
    if (fz.profit_margin) lines.push(`Profit margin: ${fz.profit_margin}%`);
    fields.calc_residual_heading = 'RESIDUAL LAND CALCULATION';
    fields.calc_residual_text = lines.join('\n');
    fields.calc_residual_value_label = 'Residual Land Value';
    fields.calc_residual_value = money(fz.final_total);
  }

  return { hasYield, hasResidual, fields };
}

export async function urlToBase64(url) {
    try {
      // const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      // const fetchUrl = isLocalhost ? `https://corsproxy.io/?url=${encodeURIComponent(url)}` : url;
      const fetchUrl = url;
      
      const response = await fetch(fetchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      if (!blob.type.startsWith('image/')) {
        throw new Error(`Invalid content type: ${blob.type}`);
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.warn('Failed to convert URL to base64:', error);
      return null;
    }
}

export async function generateChartImage(censusObject, filterFn, label) {
  // We no longer use this function for PDF, we use the Svelte wrappers directly in convertCensusToCharts
  return null;
}

export async function convertCensusToCharts(censusData, property) {
    if (!censusData || censusData.length === 0) return {};
    
    const censusObject = censusData[0];
    const chartImages = {};
    
    const ageFilter = ([key, value]) => key.includes('age_') && !key.includes('mortgage');
    const rentFilter = ([key, value]) => key.includes('rent') && !key.includes('median') && !key.includes('tenure_');
    const mortgageFilter = ([key, value]) => key.includes('mortgage') && !key.includes('median') && !key.includes('tenure_');
    const tenureFilter = ([key, value]) => key.includes('tenure_');
    const householdFilter = ([key, value]) => key.includes('_households');
    const ancestryFilter = ([key, value]) => key.includes('ancestry_') && value !== null;
    const birthFilter = ([key, value]) => key.includes('country_of_birth_') && value !== null;
    const weeklyIncomeFilter = ([key, value]) => key.includes('_income') && key.includes('median');

    const ageData = processChartVariables(censusObject, ageFilter);
    const rentData = processChartVariables(censusObject, rentFilter);
    const mortgageData = processChartVariables(censusObject, mortgageFilter);
    const tenureData = processChartVariables(censusObject, tenureFilter);
    const householdData = processChartVariables(censusObject, householdFilter);
    const ancestryData = processChartVariables(censusObject, ancestryFilter);
    const birthData = processChartVariables(censusObject, birthFilter);
    const weeklyIncomeData = processChartVariables(censusObject, weeklyIncomeFilter);

    // Disable Chart.js animations globally for PDF generation to avoid timing issues
    const originalAnimation = Chart.defaults.animation;
    Chart.defaults.animation = false;

    // Crime Data processing
    let crimeCountObject = [];
    let yearsArray = [];
    let crimeRankObject = [];
    let lga = property?.lga_name;

    if (property?.crime && lga) {
      crimeCountObject = property.crime.property_crime[0]
        .filter(e => e.lga.toLowerCase() === lga.toLowerCase())
        .map(({ year, count, lga }) => {
          const violentCrimeEntry = property.crime.violent_crime[0]?.find(v => v.year === year && v.lga === lga);
          const violentCrimeCount = violentCrimeEntry ? violentCrimeEntry.count : 0;
          return { year, lga, propertyCount: count, violentCount: violentCrimeCount };
        })
        .sort((a, b) => a.year - b.year);
      yearsArray = crimeCountObject.map(e => e.year);
      
      crimeRankObject = property.crime.property_crime[0]
        .filter(e => e.year == '2024')
        .map(({ lga, rank, year }) => {
            const violentCrimeRank = property.crime.violent_crime[0].find(e => e.lga === lga && e.year === year).rank;
            return { lga, propertyRank: rank, violentRank: violentCrimeRank, year }
        });
    }

    // Helper to mount Svelte chart component
    function mountChart(Component, props, customHeight = '800px', customWidth = '800px') {
      const div = document.createElement('div');
      div.style.width = customWidth; 
      div.style.height = customHeight;
      div.style.position = 'fixed';
      div.style.top = '0px';
      div.style.left = '0px';
      div.style.zIndex = '-9999';
      div.style.opacity = '0';
      div.style.pointerEvents = 'none';
      document.body.appendChild(div);

      // Svelte 5: components are mounted with mount(), not `new Component()`
      // (which throws component_api_invalid_new and surfaced as "Property not found").
      const comp = mount(Component, {
        target: div,
        props: { ...props, customHeight: customHeight, customFontSize: 24 }
      });
      return { comp, div };
    }

    const instances = [];

    if (ageData && ageData.data.length > 0) {
      instances.push({ key: 'suburb_age_profile', ...mountChart(AgePyramidChartWrapper, {
        dataLabels: ageData.labels.slice().reverse(),
        dataSet: ageData.data.slice().reverse(),
        chartType: "bar",
        legendDisplay: false
      }, '800px')});
    }

    if (ancestryData && ancestryData.data.length > 0) {
      instances.push({ key: 'ancestry', ...mountChart(EthnicityChartWrapper, {
        dataLabels: ancestryData.labels,
        dataSet: ancestryData.data,
        chartType: "pie",
        legendDisplay: true
      }, '680px')});
    }

    if (birthData && birthData.data.length > 0) {
      instances.push({ key: 'country_of_birth', ...mountChart(EthnicityChartWrapper, {
        dataLabels: birthData.labels,
        dataSet: birthData.data,
        chartType: "pie",
        legendDisplay: true
      }, '680px')});
    }

    if (rentData && rentData.data.length > 0) {
      instances.push({ key: 'rent_affordability', ...mountChart(AgeChartWrapper, {
        dataLabels: rentData.labels,
        dataSet: rentData.data,
        chartType: "pie",
        legendDisplay: true
      }, '680px')});
    }

    if (mortgageData && mortgageData.data.length > 0) {
      instances.push({ key: 'mortgage_affordability', ...mountChart(AgeChartWrapper, {
        dataLabels: mortgageData.labels,
        dataSet: mortgageData.data,
        chartType: "pie",
        legendDisplay: true
      }, '680px')});
    }

    if (weeklyIncomeData && weeklyIncomeData.data.length > 0) {
      instances.push({ key: 'weekly_household_income', ...mountChart(AgePyramidChartWrapper, {
        dataLabels: weeklyIncomeData.labels.slice().reverse(),
        dataSet: weeklyIncomeData.data.slice().reverse(),
        chartType: "bar",
        legendDisplay: false
      }, '560px')});
    }

    if (tenureData && tenureData.data.length > 0) {
      instances.push({ key: 'tenure_type', ...mountChart(AgeChartWrapper, {
        dataLabels: tenureData.labels,
        dataSet: tenureData.data,
        chartType: "pie",
        legendDisplay: true
      }, '680px')});
    }

    if (householdData && householdData.data.length > 0) {
      instances.push({ key: 'household_composition', ...mountChart(AgeChartWrapper, {
        dataLabels: householdData.labels,
        dataSet: householdData.data,
        chartType: "pie",
        legendDisplay: true
      }, '680px')});
    }

    if (crimeCountObject && crimeCountObject.length > 0) {
      instances.push({ key: 'crime_occurrence', ...mountChart(CrimeCountChartWrapper, {
        dataSet: crimeCountObject,
        dataLabels: yearsArray,
        chartType: "line",
        legendDisplay: true
      }, '800px', '1600px')});
    }

    if (crimeRankObject && crimeRankObject.length > 0) {
      instances.push({ key: 'crime_rankings', ...mountChart(RankChartWrapper, {
        dataSet: crimeRankObject,
        dataLabels: [],
        chartType: "bubble",
        legendDisplay: false,
        lga: lga
      }, '800px', '1600px')});
    }

    // Wait for charts to finish rendering using a Promise polling loop
    await new Promise(resolve => {
      let attempts = 0;
      const checkInterval = setInterval(() => {
        let allReady = true;
        for (const inst of instances) {
          try {
            const canvas = inst.div.querySelector('canvas');
            if (canvas) {
              const dataUrl = canvas.toDataURL('image/png');
              // A blank 600x400 canvas is usually very small (< 4kb).
              // We assume anything over 6000 bytes has drawn something meaningful.
              if (dataUrl.length < 6000) {
                allReady = false;
                break;
              }
            } else {
              allReady = false;
              break;
            }
          } catch (e) {
            // Ignore error
          }
        }
        attempts++;
        if (allReady || attempts > 30) { // max 30 * 100ms = 3 seconds timeout
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    // Restore original animation default
    Chart.defaults.animation = originalAnimation;

    // Extract base64 images and cleanup
    for (const inst of instances) {
      try {
        const canvas = inst.div.querySelector('canvas');
        if (canvas) {
          chartImages[inst.key] = canvas.toDataURL('image/png');
        }
      } catch (e) {
        console.warn(`Failed to generate chart for ${inst.key}:`, e);
      }
      unmount(inst.comp);
      inst.div.remove();
    }
    
    return chartImages;
}

export async function getPropertyData(api_domain, pdf_property_or_obj, pdf_config, buy_report) {
    try {
      let viewing_property;
      let censusData;
      
      if (typeof pdf_property_or_obj === 'object' && pdf_property_or_obj !== null) {
        viewing_property = JSON.parse(JSON.stringify(pdf_property_or_obj));
        censusData = viewing_property.census; 
      } else {
        // 1. Get main property data
        const property_response = await fetch(`${api_domain}/property/` + pdf_property_or_obj, {
          method: 'GET',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
        });
        viewing_property = (await property_response.json())[0];

        if (!viewing_property) return null;

        // 2. Fetch DA details with links
        if (viewing_property.das && viewing_property.das.length > 0) {
          await Promise.all(viewing_property.das.map(async (da) => {
            const response = await fetch(`${api_domain}/development_applications`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ da_number: da.da_number, lga: viewing_property.lga_name || '' })
            });
            const daLinks = await response.json();
            da.da_application_url = daLinks.da_application || null;
            da.lga_url = daLinks.lga_url || null;
          }));
        }

        // 3. Get permissible uses
        const ps_response = await fetch(`${api_domain}/permissibleuse`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"lga": viewing_property.lga_name, "zone": viewing_property.lzn_label})
        });
        const ps_data = await ps_response.json();
        viewing_property.permissibleuse = ps_data ? ps_data.map(item => item.permissiblelanduse) : [];

        // 4. Get census data
        const census_response = await fetch(`${api_domain}/census`, {
          method: 'POST',
          cache: "no-cache",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({"suburbname": viewing_property.suburbname, "postcode": viewing_property.postcode})
        });
        censusData = await census_response.json();
        
        // 5. Get crime data (must be done before converting census to charts)
        const crime_response = await fetch(`${api_domain}/crime`);
        if (crime_response.ok) {
          viewing_property.crime = await crime_response.json();
        }
      }

      // 6. Get suburb profile (always fetch if missing and suburbname exists)
      if (viewing_property.suburbname && !viewing_property.suburb_profile_data) {
        try {
          const suburb_profile_url = `https://io.imsstratus.com.au/upapp/app/js/suburb-profile-short/${viewing_property.suburbname}.json`;
          const profile_res = await fetch(suburb_profile_url);
          if (profile_res.ok) {
            viewing_property.suburb_profile_data = await profile_res.json();
          }
        } catch (error) {
          viewing_property.suburb_profile_data = null;
        }
      }

      // Convert census data to base64 charts
      viewing_property.census = await convertCensusToCharts(censusData, viewing_property);

      // 6. Add default cover values if cover page is enabled
      if (pdf_config.cover_page) {
        // Set default cover values
        viewing_property.cover_title = buy_report ? 'Due Diligence Report' : (pdf_config.cover_title || 'Property Report');
        viewing_property.cover_prepared_for = viewing_property.first_name && viewing_property.last_name 
          ? `${viewing_property.first_name} ${viewing_property.last_name}` 
          : '';
        
        // Format today's date as dd/mm/yyyy
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = today.getFullYear();
        viewing_property.cover_prepared_date = `${dd}/${mm}/${yyyy}`;
      }

      return viewing_property;
    } catch (error) {
      console.error('Failed to fetch property data:', error);
      return null;
    }
}

export async function createPdf(gurasid_or_obj, api_domain, pdf_config, custom_logo_url, user_first_name, user_last_name, buy_report) {
    try {
      if (!window.generatePdf) {
        alert('PDF libraries still loading...');
        return;
      }

      const property = await getPropertyData(api_domain, gurasid_or_obj, pdf_config, buy_report);
      if (!property) return alert('Property not found');

      const gurasid_for_filename = property.gurasid || (typeof gurasid_or_obj === 'string' ? gurasid_or_obj : 'Report');

      // 1. Convert Images to Base64 (Using your helper)
      const DEFAULT_LOGO_URL = 'https://io.imsstratus.com.au/upapp/app/images/pdf-logo.png';
      let logoBase64 = null;
      
      // Try custom logo first, then fall back to default
      if (custom_logo_url) {
        if (custom_logo_url.startsWith('data:image')) {
          logoBase64 = custom_logo_url;
        } else {
          logoBase64 = await urlToBase64(custom_logo_url);
        }
      }
      
      // If custom logo failed or wasn't provided, try default logo
      if (!logoBase64) {
        logoBase64 = await urlToBase64(DEFAULT_LOGO_URL);
      }
      
      // If both fail, use a transparent 1x1 pixel as placeholder
      if (!logoBase64) {
        logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
      }
      
      let streetViewBase64 = null;
      if (property.address) {
        const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x360&radius=15&return_error_code=true&source=outdoor&location=${property.address.toLowerCase().replace(/\s/g, '-')}-${property?.postcode || ""}&key=AIzaSyC5I6s5Rym9KnniWrQX9pOhH6LaCi3sW9Q`;
        streetViewBase64 = await urlToBase64(streetViewUrl);
      }
      
      // Optional: If you have census data, you can prep it here too:
      // const censusCharts = await convertCensusToCharts(property.census_data);

      // 2. Prepare Date (dd/mm/yyyy)
      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Generate dynamic census titles
      const dynamicCensusTitles = {};
      if (property?.census) {
        const censusChartsConfig = [
          { id: 'age', enabled: pdf_config.census_suburb_age_profile },
          { id: 'ancestry', enabled: pdf_config.census_ancestry },
          { id: 'birth', enabled: pdf_config.census_country_of_birth },
          { id: 'rent', enabled: pdf_config.census_rent_affordability },
          { id: 'mortgage', enabled: pdf_config.census_mortgage_affordability },
          { id: 'income', enabled: pdf_config.census_weekly_household_income },
          { id: 'tenure', enabled: pdf_config.census_tenure_type },
          { id: 'household', enabled: pdf_config.census_household_composition },
          { id: 'crime', enabled: pdf_config.census_crime_occurrence },
          { id: 'crime_rank', enabled: pdf_config.census_crime_rankings }
        ].filter(c => c.enabled);

        let slotsUsed = 0;
        let pageIdx = 0;
        for (let i = 0; i < censusChartsConfig.length; i++) {
          const chart = censusChartsConfig[i];
          const isCrime = chart.id === 'crime' || chart.id === 'crime_rank';
          
          if (isCrime && slotsUsed > 0 && i > 0 && !['crime', 'crime_rank'].includes(censusChartsConfig[i-1].id)) {
            slotsUsed = 4;
          }
          if (isCrime && slotsUsed % 2 !== 0) slotsUsed += 1;
          const needed = isCrime ? 2 : 1;
          
          if (slotsUsed + needed > 4) {
            pageIdx++;
            slotsUsed = 0;
          }
          
          if (slotsUsed === 0) {
            dynamicCensusTitles[`census_title_${pageIdx}`] = isCrime ? 'CRIME' : 'CENSUS';
          }
          slotsUsed += needed;
        }
      }

      // Generate Planning Constraint Maps data
      const exclusionToLayerMap = {
        'activestreetfrontage': { label: 'Active Street Frontages', layer: 'frontage' },
        'australian_noise_exposure_forecast': { label: 'Airport Noise', layer: 'airport' },
        'biodiversity': { label: 'Terrestrial Biodiversity', layer: 'terrestrialbiodiversity' },
        'bushfireproneland': { label: 'Bushfire Prone', layer: 'bushfire' },
        'coastalmanagement': { label: 'Coastal Management', layer: 'coastalmanagement' },
        'contamination_activity_type': { label: 'Contaminated Sites', layer: 'contaminationsites' },
        'drinkingcatchment': { label: 'Drinking Catchment', layer: 'drinking_water_catchment' },
        'floodmapping': { label: 'Flood Zone', layer: 'floodplanning' },
        'groundwatervulnerability': { label: 'Groundwater Vulnerability', layer: 'groundwatervulnerability' },
        'h_name': { label: 'Heritage', layer: 'heritage' },
        'landsliderisk': { label: 'Landslide', layer: 'landsliderisk' },
        'mineralresoureland': { label: 'Mineral & Resource Land', layer: 'mineralresourceland' },
        'minesubsidence': { label: 'Mine Subsidence', layer: 'mine_subsidence_district' },
        'riparianlandwatercouse': { label: 'Riparian Lands and Water Courses', layer: 'riparianlandwatercourse' },
        'salinity': { label: 'Salinity', layer: 'salinity' },
        'scenicprotectionland': { label: 'Scenic Protection Lands', layer: 'scenicprotectionland' },
        'wetland': { label: 'Wetlands', layer: 'wetlands' }
      };

      const planningConstraintMapData = {};
      const activeExclusions = Object.entries(exclusionToLayerMap).filter(([key]) => property[key]);

      const layerNameMap = {
        'activestreetfrontage': 'frontage',
        'australian_noise_exposure_forecast': 'airport',
        'biodiversity': 'terrestrialbiodiversity',
        'bushfireproneland': 'bushfire',
        'coastalmanagement': 'coastalmanagement',
        'contamination_activity_type': 'contaminationsites',
        'drinkingcatchment': 'drinking_water_catchment',
        'floodmapping': 'floodplanning',
        'groundwatervulnerability': 'groundwatervulnerability',
        'h_name': 'heritage',
        'landsliderisk': 'landsliderisk',
        'mineralresoureland': 'mineralresourceland',
        'minesubsidence': 'mine_subsidence_district',
        'riparianlandwatercouse': 'riparianlandwatercourse',
        'salinity': 'salinity',
        'scenicprotectionland': 'scenicprotectionland',
        'wetland': 'wetlands'
      };

      for (const [exclusionKey, exclusionInfo] of activeExclusions) {
        const exclusionValues = property[exclusionKey];
        const mapKey = `pcm_${exclusionKey}`;
        const layerName = layerNameMap[exclusionKey];

        let mapImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

        try {
          const hiddenMaps = window.planningConstraintMaps;
          
          if (hiddenMaps && hiddenMaps[exclusionKey]) {
            const map = hiddenMaps[exclusionKey];
            const containerId = `mapbox-map-planning-constraint-${exclusionKey}`;
            const container = document.getElementById(containerId);
            
            // Check if debug mode is on
            const isDebugMode = container && (container.style.top === '0px' || container.style.top === '0');
            
            // Position off-screen but keep visible
            if (container) {
              if (!container.getAttribute('data-original-style')) {
                container.setAttribute('data-original-style', container.style.cssText);
              }
              container.style.position = 'fixed';
              container.style.top = '-9999px';
              container.style.left = '-9999px';
              container.style.width = '800px';
              container.style.height = '600px';
              container.style.visibility = 'visible';
            }
            
            map.resize();
            map.triggerRepaint();
            
            // Force show the specific planning constraint layer
            const planningLayerId = layerNameMap[exclusionKey];
            if (planningLayerId && map.getLayer(planningLayerId)) {
              map.setLayoutProperty(planningLayerId, 'visibility', 'visible');
            }
            
            // Wait for render
            await new Promise(r => setTimeout(r, 2000));
            
            const canvas = map.getCanvas();
            console.log('Canvas:', canvas?.width, 'x', canvas?.height, 'ctx:', !!canvas?.getContext('2d'));
            
            // Try different capture methods for Safari
            if (canvas && canvas.width > 0) {
              const ctx = canvas.getContext('2d');
              console.log('Context type:', ctx ? ctx.canvas.width : 'no ctx');
              
              if (ctx) {
                // Check if there's actual pixel data
                const testPixel = ctx.getImageData(0, 0, 1, 1);
                console.log('Test pixel:', testPixel.data[0], testPixel.data[1], testPixel.data[2], testPixel.data[3]);
              }
              
              // Try toDataURL
              try {
                mapImageBase64 = canvas.toDataURL('image/png');
                console.log('toDataURL success:', mapImageBase64.length, 'bytes');
              } catch (e) {
                console.log('toDataURL failed:', e.message);
                // Try toBlob
                try {
                  const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob((b) => {
                      if (b) resolve(b);
                      else reject(new Error('No blob'));
                    }, 'image/png');
                  });
                  console.log('toBlob success:', blob.size, 'bytes');
                  // Convert blob to base64
                  const reader = new FileReader();
                  mapImageBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                  });
                  console.log('Blob to base64:', mapImageBase64.length, 'bytes');
                } catch (e2) {
                  console.log('toBlob also failed:', e2.message);
                }
              }
            }
            
            // Restore debug mode visibility
            if (container && isDebugMode && container.getAttribute('data-original-style')) {
              container.style.cssText = container.getAttribute('data-original-style');
              map.resize();
            }
          }
        } catch (err) {
          console.error('Error capturing hidden map:', err);
        }

        planningConstraintMapData[`${mapKey}_title`] = `${exclusionInfo.label.toUpperCase()} MAP`;
        planningConstraintMapData[`${mapKey}_image`] = mapImageBase64;
        planningConstraintMapData[`${mapKey}_legend`] = exclusionValues;
      }
      // DEVELOPMENT APPLICATIONS MAP
      let daMapImageBase64 = null;
      if (pdf_config.development_applications_maps) {
        try {
          const daMap = window.daHiddenMap;
          if (daMap) {
            const containerId = 'mapbox-map-da-surrounding';
            const container = document.getElementById(containerId);
            const isDebugMode = container && (container.style.top === '0px' || container.style.top === '0');
            
            if (container) {
              if (!container.getAttribute('data-original-style')) {
                container.setAttribute('data-original-style', container.style.cssText);
              }
              container.style.position = 'fixed';
              container.style.top = '-9999px';
              container.style.left = '-9999px';
              container.style.width = '800px';
              container.style.height = '600px';
              container.style.visibility = 'visible';
            }
            
            daMap.resize();
            daMap.triggerRepaint();
            
            await new Promise(r => setTimeout(r, 2000));
            
            const canvas = daMap.getCanvas();
            // console.log('DA Map canvas element:', canvas, 'Width:', canvas?.width, 'Height:', canvas?.height);

            if (canvas && canvas.width > 0) {
              try {
                daMapImageBase64 = canvas.toDataURL('image/png');
                // console.log('DA Map toDataURL output length:', daMapImageBase64 ? daMapImageBase64.length : 'null');
                if (!daMapImageBase64 || daMapImageBase64 === 'data:,') {
                   // console.error('DA Map toDataURL returned empty/invalid image. Tainted canvas or preserveDrawingBuffer issue on Safari?');
                }
              } catch (e) {
                // console.error('DA Map toDataURL exception in Safari:', e);
                try {
                  const blob = await new Promise((resolve, reject) => {
                    canvas.toBlob((b) => {
                      if (b) resolve(b);
                      else reject(new Error('No blob'));
                    }, 'image/png');
                  });
                  const reader = new FileReader();
                  daMapImageBase64 = await new Promise((resolve) => {
                    reader.onloadend = () => {
                        // console.log('DA Map FileReader fallback successful. Length:', reader.result ? reader.result.length : 'null');
                        resolve(reader.result);
                    };
                    reader.readAsDataURL(blob);
                  });
                } catch (e2) {
                    // console.error('DA Map canvas toBlob fallback also failed:', e2);
                }
              }
            } else {
                // console.error('DA Map canvas is missing or has 0 width.');
            }
            
            if (container && isDebugMode && container.getAttribute('data-original-style')) {
              container.style.cssText = container.getAttribute('data-original-style');
              daMap.resize();
            }
          }
        } catch (err) {
          console.error('Error capturing DA hidden map:', err);
        }
      }

      // 3. Map Data to Inputs (Matching the schema keys exactly)
      const { fields: devCalcFields } = buildDevelopmentCalcData(property);

      const inputs = [{
        // PAGE 1: COVER
        cover_logo: logoBase64,
        cover_background_image: (pdf_config.mapbox_cover && pdf_config.mapbox_image_base64) ? pdf_config.mapbox_image_base64 : (streetViewBase64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='), // transparent fallback
        cover_footer_bg: ' ',
        cover_title: buy_report ? 'Due Diligence Report' : (pdf_config.cover_title || "Property Report"),
        address: (property.address +  ' ' + property.postcode) || 'Address Not Available',
        cover_prepared_for: (user_first_name || user_last_name) 
          ? `${user_first_name || ''} ${user_last_name || ''}`.trim() 
          : "Urban Prospects",
        cover_prepared_date: `Date: ${formattedDate}`,
        
        // PAGE 2: OVERVIEW
        overview_title: "PROPERTY OVERVIEW",

        // Row 1
        overview_row1_col1: "FRONTAGE WIDTH",
        overview_row1_col2: `${property.primary_frontage_length_m ?? property.width ?? '--'} m`,
        overview_row1_col3: "DEPTH",
        overview_row1_col4: `${property.depth || '--'} m`,
        overview_row1_col5: "PERMISSIBLE HEIGHT",
        overview_row1_col6: `${property.hob_max_b_h || '--'} m`,
        overview_row1_col7: "FLOOR SPACE RATIO",
        overview_row1_col8: `${property.fsr_fsr || '--'} fsr`,

        // Row 2
        overview_row2_col1: property?.property_description && property.property_description.includes(',') && property.property_description.includes('/') ? "PLAN NO" : "LOT NO",
        overview_row2_col2: `${property.lotnumber}/${property.planlabel}`,
        overview_row2_col3: "MIN LOT SIZE",
        overview_row2_col4: property.lot_size ? `${parseInt(property.lot_size)} sqm` : '-- sqm',
        overview_row2_col5: "AREA OF LAND",
        overview_row2_col6: property.area ? `${parseInt(property.area)} sqm` : '-- sqm',
        overview_row2_col7: "ZONING",
        overview_row2_col8: `${property.lzn_label || '--'}: ${property.lzn_lay_class || '--'}`,

        // Row 3
        overview_row3_col1: "ESTIMATED PRICE",
        overview_row3_col2: property.estimated_price ? `$${property.estimated_price}` : '--',
        overview_row3_col3: "NO OF BEDS",
        overview_row3_col4: String(property.no_of_beds || '--'),
        overview_row3_col5: "NO OF BATHS",
        overview_row3_col6: String(property.no_of_baths || '--'),
        overview_row3_col7: "NO OF CARS",
        overview_row3_col8: String(property.no_of_cars || '--'),

        // Row 4
        overview_row4_col1: "GFA",
        overview_row4_col2: `${Math.round((property.fsr_fsr || 0) * (property.area || 0))} sqm`,
        overview_row4_col3: "WALKABLE SCORE",
        overview_row4_col4: String(property.walkable_score || '--'),

        // PAGE 3: SUBURB PROFILE & NEARBY
        suburb_title: `${property?.suburbname || ''} SUBURB PROFILE`,
        
        // About section
        about_label: "ABOUT",
        about_text: property?.suburb_profile_data?.suburb_profile
          ? property.suburb_profile_data.suburb_profile.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim()
          : '',
        
        infrastructure_label: "INFRASTRUCTURE & SERVICES",
        infrastructure_text: property?.suburb_profile_data?.infrastructure_and_services
          ? property.suburb_profile_data.infrastructure_and_services.replace(/\[\d+\]/g, '').replace(/\s{2,}/g, ' ').trim()
          : '',
        
        // Nearby section
        nearby_title: "NEARBY",
        
        // School
        school_label: "SCHOOL",
        school_value: property?.closest_school || '--',
        school_distance_label: "DISTANCE",
        school_distance_value: property?.closest_school_distance
          ? `${Math.round((property.closest_school_distance / 1000) * 10) / 10} km`
          : '--',
        
        // Hospital
        hospital_label: "HOSPITAL",
        hospital_value: property?.closest_hospital || '--',
        hospital_distance_label: "DISTANCE",
        hospital_distance_value: property?.closest_hospital_distance
          ? `${Math.round((property.closest_hospital_distance / 1000) * 10) / 10} km`
          : '--',
        
        // Train
        train_label: "TRAIN",
        train_value: property?.closest_railway_station || '--',
        train_distance_label: "DISTANCE",
        train_distance_value: property?.closest_railway_station_distance
          ? `${Math.round((property.closest_railway_station_distance / 1000) * 10) / 10} km`
          : '--',

        // LEP SECTION
        lep_title: "LOCAL ENVIRONMENTAL PLANS",
        lep_na: (property?.lep || []).length === 0 ? "N/A" : "",
        ...Object.fromEntries(
          (property?.lep || []).slice(0, 10).map((plep, i) => [
            `lep_item_${i}`,
            plep?.epi_name || ''
          ])
        ),

        // PAGE 3: PERMISSIBLE USES SECTION
        pu_title: "PERMISSIBLE USES",
        pu_na: (property?.permissibleuse || []).length === 0 ? "N/A" : "",
        // Distribute permissible uses across rows (4 items per row)
        ...Object.fromEntries(
          (property?.permissibleuse || []).slice(0, 80).map((ps, i) => {
            const row = Math.floor(i / 4); // 0-19
            const col = i % 4; // 0-3
            return [`pu_item_r${row}_c${col}`, ps || ''];
          })
        ),

        // SOLD HISTORY SECTION
        ...(pdf_config.sales_history ? {
          sh_title: "SOLD HISTORY",
          sh_na: (property?.sold_history || []).length === 0 ? "N/A" : "",
          ...Object.fromEntries(
            (property?.sold_history || []).slice(0, 10).flatMap((sh, i) => {
              const year = sh.settlement_date ? sh.settlement_date.substring(0, 4) : (sh.contract_date ? sh.contract_date.substring(0, 4) : '');
              const priceNum = parseInt(sh.purchase_price);
              const price = !isNaN(priceNum) ? priceNum.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace('$', '$') : '';
              
              let dateStr = '';
              if (sh.settlement_date) {
                const d = new Date(sh.settlement_date);
                dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
              } else if (sh.contract_date) {
                const d = new Date(sh.contract_date);
                dateStr = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
              }

              return [
                [`sh_item_year_${i}`, year],
                [`sh_item_price_${i}`, `SOLD ${price}`],
                [`sh_item_date_${i}`, dateStr]
              ];
            })
          )
        } : {}),

        // COMPLY DEVELOPMENT SECTION
        cdc_title: "COMPLY DEVELOPMENT",
        cdc_na: (() => {
          const cdcItems = [
            property?.cdc_dual_occupancy ? 'Dual Occupancy' : null,
            property?.cdc_multi_dwelling_terraces ? 'Terraces' : null,
            property?.cdc_secondary_dwellings ? 'Secondary Dwellings' : null,
            property?.cdc_dwelling_houses ? 'Dwellings' : null,
            property?.cdc_manor_homes ? 'Manor Homes' : null,
            property?.cdc_rural_housing ? 'Rural Housing' : null,
            property?.cdc_inland_dwelling_houses ? 'Dwellings Houses' : null,
            property?.cdc_inland_farm_buildings ? 'Farm Buildings' : null,
            property?.cdc_greenfield_housing ? 'Greenfield Housing' : null,
            property?.cdc_agritourism ? 'Agritourism' : null,
            property?.cdc_farmsta ? 'Farmstay' : null
          ].filter(Boolean);
          return cdcItems.length > 0 ? "" : "N/A";
        })(),
        ...(() => {
          const cdcItems = [
            property?.cdc_dual_occupancy ? 'Dual Occupancy' : null,
            property?.cdc_multi_dwelling_terraces ? 'Terraces' : null,
            property?.cdc_secondary_dwellings ? 'Secondary Dwellings' : null,
            property?.cdc_dwelling_houses ? 'Dwellings' : null,
            property?.cdc_manor_homes ? 'Manor Homes' : null,
            property?.cdc_rural_housing ? 'Rural Housing' : null,
            property?.cdc_inland_dwelling_houses ? 'Dwellings Houses' : null,
            property?.cdc_inland_farm_buildings ? 'Farm Buildings' : null,
            property?.cdc_greenfield_housing ? 'Greenfield Housing' : null,
            property?.cdc_agritourism ? 'Agritourism' : null,
            property?.cdc_farmsta ? 'Farmstay' : null
          ].filter(Boolean);
          return cdcItems.length > 0 ? Object.fromEntries(cdcItems.map((label, i) => [`cdc_item_${i}`, label])) : {};
        })(),
        
        // PATTERN BOOKS SECTION
        pb_title: "PATTERN BOOKS",
        pb_na: "N/A",

        // DEVELOPMENT APPLICATIONS
        da_title: "DEVELOPMENT APPLICATIONS",
        da_na: (property?.das && property.das.length > 0) ? "" : "N/A",
        ...(property?.das && property.das.length > 0 ? Object.fromEntries(
          property.das.filter(da => da !== null).slice(0, 5).flatMap((da, i) => [
            [`da_type_${i}`, (da.application_type || "").toUpperCase()],
            [`da_app_num_label_${i}`, "APPLICATION NUMBER"],
            [`da_app_num_${i}`, da.planning_portal_app_number || ""],
            [`da_status_label_${i}`, "STATUS"],
            [`da_status_${i}`, da.status || ""],
            [`da_dev_type_label_${i}`, "TYPE OF DEVELOPMENT"],
            [`da_dev_type_${i}`, (da.type_of_development || "").replace(/\,/g, ', ')],
            [`da_council_label_${i}`, "COUNCIL"],
            [`da_council_${i}`, da.council_name || ""]
          ])
        ) : {}),

        // PLANNING CONSTRAINTS SECTION
        pc_title: "PLANNING CONSTRAINTS",
        pc_na: (() => {
          const hasConstraints = ['strata', 'multiplefrontage', 'h_name', 'floodmapping', 'landslidrisk',
            'minesubsidence', 'activestreetfrontage', 'bushfireproneland', 'drinkingcatchment',
            'wetland', 'coastalmanagement', 'australian_noise_exposure_forecast',
            'groundwatervulnerability', 'mineralresoureland', 'riparianlandwatercouse',
            'salinity', 'scenicprotectionland', 'biodiversity', 'contaminationactivitytype']
            .some(key => property?.[key]);
          return hasConstraints ? '' : 'N/A';
        })(),
        ...Object.fromEntries(
          Object.entries({
            strata: 'Strata Lots',
            multiplefrontage: 'Multiple Frontage',
            h_name: 'Heritage',
            floodmapping: 'Flood Zone',
            landslidrisk: 'Landslide',
            minesubsidence: 'Mine Subsidence',
            activestreetfrontage: 'Active Street Frontages',
            bushfireproneland: 'Bushfire Prone',
            drinkingcatchment: 'Drinking Catchment',
            wetland: 'Wetlands',
            coastalmanagement: 'Coastal Management',
            australian_noise_exposure_forecast: 'Airport Noise',
            groundwatervulnerability: 'Groundwater Vulnerability',
            mineralresoureland: 'Mineral and Resource land',
            riparianlandwatercouse: 'Riparian lands and Water Courses',
            salinity: 'Salinity',
            scenicprotectionland: 'Scenic Protection lands',
            biodiversity: 'Terrestrial Biodiversity',
            contaminationactivitytype: 'Contaminated Sites',
          })
            .filter(([key]) => property?.[key])
            .slice(0, 10)
            .map(([key, label], i) => [
              `pc_item_${i}`,
              `${label}: ${property[key].split(',').slice(0, 3).join(', ')}`
            ])
        ),

        // CONTRIBUTION PLANS
        cp_title: "CONTRIBUTION PLANS",
        cp_na: (property?.contribution_plan && property.contribution_plan.length > 0) ? "" : "N/A",
        ...Object.fromEntries(
          (property?.contribution_plan || []).slice(0, 5).map((cp, i) => [
            `cp_item_${i}`,
            cp?.plan_name || ''
          ])
        ),

        // DEVELOPMENT CONTROL PLANS
        dcp_title: "DEVELOPMENT CONTROL PLANS",
        dcp_na: (property?.development_control_plan && property.development_control_plan.length > 0) ? "" : "N/A",
        ...Object.fromEntries(
          (property?.development_control_plan || []).slice(0, 5).map((dcp, i) => [
            `dcp_item_${i}`,
            dcp?.plan_name || ''
          ])
        ),

        // STATE ENVIRONMENTAL PLANNING
        sep_title: "STATE ENVIRONMENTAL PLANNING",
        sep_na: (property?.state_environmental_planning_policy && property.state_environmental_planning_policy.length > 0) ? "" : "N/A",
        ...Object.fromEntries(
          (property?.state_environmental_planning_policy || []).slice(0, 10).map((sep, i) => [
            `sep_item_${i}`,
            sep?.sepp_name || ''
          ])
        ),

        // DEVELOPMENT ANALYSIS (yield + residual) — values present only when available
        ...devCalcFields,

        // DISCLAIMERS
        disclaimer_title: 'PROPERTY DISCLAIMERS',
        disclaimer_text: 'The search results on the Urban Prospects are for guidance only based on your search criteria and the property data sourced from NSW Government. The sites may not suit your specific needs and may already be developed to their full potential. You should verify the information provided with a site visit and professional advise.\n\nYou should also note that there are planning controls within Environmental Planning Instruments and Development Control Plan that could affect your development. Therefore, you should consult with a town planner or professional property advisor / architect about the suitability of a site for development.',

        // CENSUS SECTION
        ...(property?.census ? {
          ...dynamicCensusTitles,
          census_chart_age: property.census.suburb_age_profile || '',
          census_chart_title_age: 'SUBURB AGE PROFILE',
          census_chart_ancestry: property.census.ancestry || '',
          census_chart_title_ancestry: 'ANCESTRY',
          census_chart_birth: property.census.country_of_birth || '',
          census_chart_title_birth: 'COUNTRY OF BIRTH',
          census_chart_rent: property.census.rent_affordability || '',
          census_chart_title_rent: 'RENT AFFORDABILITY',
          census_chart_mortgage: property.census.mortgage_affordability || '',
          census_chart_title_mortgage: 'MORTGAGE AFFORDABILITY',
          census_chart_income: property.census.weekly_household_income || '',
          census_chart_title_income: 'WEEKLY HOUSEHOLD INCOME',
          census_chart_tenure: property.census.tenure_type || '',
          census_chart_title_tenure: 'TENURE TYPE',
          census_chart_household: property.census.household_composition || '',
          census_chart_title_household: 'HOUSEHOLD COMPOSITION',
          census_chart_crime: property.census.crime_occurrence || '',
          census_chart_title_crime: 'CRIME OCCURRENCE',
          census_chart_crime_rank: property.census.crime_rankings || '',
          census_chart_title_crime_rank: 'CRIME RANKINGS'
        } : {}),

        // PLANNING CONSTRAINT MAPS
        ...planningConstraintMapData,
        
        // DA MAP
        ...(pdf_config.development_applications_maps ? {
          da_map_title: "SURROUNDING DEVELOPMENT APPLICATIONS",
          da_map_image: daMapImageBase64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          da_map_legend_title: "Development Application Status",
          da_map_legend_color_0: "",
          da_map_legend_text_0: "Under Assessment",
          da_map_legend_color_1: "",
          da_map_legend_text_1: "Approved",
          da_map_legend_color_2: "",
          da_map_legend_text_2: "Withdrawn",
          da_map_legend_color_3: "",
          da_map_legend_text_3: "Refused",
          da_map_legend_color_4: "",
          da_map_legend_text_4: "Determined"
        } : {}),

        // LAST PAGE MAPBOX MAP
        ...(pdf_config.mapbox_last_page ? {
          mapbox_last_page_title: "DESIGN",
          mapbox_last_page_image: pdf_config.mapbox_image_base64 || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
          ...(pdf_config.save_model_title || (property && property.save_model_title) ? {
            save_model_title: pdf_config.save_model_title || (property && property.save_model_title) || ""
          } : {})
        } : {})
      }];

      // Mapbox Image Capture (Cover / Last Page)
      if (pdf_config.mapbox_cover || pdf_config.mapbox_last_page) {
        let useSavedView = false;
        try {
          const savedView = localStorage.getItem('saved_model_view');
          if (savedView) {
            pdf_config.mapbox_image_base64 = savedView;
            inputs[0].cover_background_image = (pdf_config.mapbox_cover && pdf_config.mapbox_image_base64) ? pdf_config.mapbox_image_base64 : inputs[0].cover_background_image;
            if (pdf_config.mapbox_last_page) inputs[0].mapbox_last_page_image = pdf_config.mapbox_image_base64;
            useSavedView = true;
          }
        } catch (e) {
          // localStorage might be inaccessible
        }

        if (!useSavedView) {
          try {
            if (window.mapboxgl && property.geom && property.geom.coordinates) {
              const containerId = 'pdf-mapbox-hidden-container';
              let container = document.getElementById(containerId);
              if (!container) {
                container = document.createElement('div');
                container.id = containerId;
                container.style.cssText = 'position: fixed; top: -9999px; left: -9999px; width: 800px; height: 600px; visibility: visible;';
                document.body.appendChild(container);
              }

              const center = [property.geom.coordinates[0], property.geom.coordinates[1]];
              const mapStyle = window.mapboxMap ? window.mapboxMap.getStyle() : 'mapbox://styles/mapbox/standard';

              const pdfMap = new window.mapboxgl.Map({
                container: containerId,
                style: mapStyle,
                center: center,
                zoom: 18,
                interactive: false,
                attributionControl: false,
                preserveDrawingBuffer: true
              });

              await new Promise((resolve) => {
                pdfMap.once('idle', () => {
                  setTimeout(resolve, 2000); // give it an extra 2s to render
                });
                setTimeout(resolve, 6000); // fallback timeout
              });

              const canvas = pdfMap.getCanvas();
              if (canvas && canvas.width > 0) {
                try {
                  pdf_config.mapbox_image_base64 = canvas.toDataURL('image/png');
                  inputs[0].cover_background_image = (pdf_config.mapbox_cover && pdf_config.mapbox_image_base64) ? pdf_config.mapbox_image_base64 : inputs[0].cover_background_image;
                  if (pdf_config.mapbox_last_page) inputs[0].mapbox_last_page_image = pdf_config.mapbox_image_base64;
                } catch (e) {
                  // Ignore
                }
              }
              pdfMap.remove();
            }
          } catch (err) {
            console.error("Error capturing Mapbox map for PDF", err);
          }
        }
      }

      // Calculate cdc_item_count so buildTemplate can adjust height
      const cdc_items = [
        property.cdc_dual_occupancy ? 'Dual Occupancy' : null,
        property.cdc_multi_dwelling_terraces ? 'Terraces' : null,
        property.cdc_secondary_dwellings ? 'Secondary Dwellings' : null,
        property.cdc_dwelling_houses ? 'Dwellings' : null,
        property.cdc_manor_homes ? 'Manor Homes' : null,
        property.cdc_rural_housing ? 'Rural Housing' : null,
        property.cdc_inland_dwelling_houses ? 'Dwellings Houses' : null,
        property.cdc_inland_farm_buildings ? 'Farm Buildings' : null,
        property.cdc_greenfield_housing ? 'Greenfield Housing' : null,
        property.cdc_agritourism ? 'Agritourism' : null,
        property.cdc_farmsta ? 'Farmstay' : null
      ].filter(Boolean);
      pdf_config.cdc_item_count = cdc_items.length;
      pdf_config.sh_item_count = Math.min((property.sold_history || []).length, 10);

      // 4. Generate
      const template = buildTemplate(pdf_config, property);
      
      const pdf = await window.generatePdf(template, inputs);

      // 5. Download
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Property_Report_${gurasid_for_filename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ PDF Error:', error);
      alert('PDF failed: ' + error.message);
    }
}

