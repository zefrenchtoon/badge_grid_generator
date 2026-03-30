#!/usr/bin/env node

/**
 * Générateur de PDF avec gabarits de badges 32mm pour presse Vevor
 *
 * Ce script génère un PDF prêt à imprimer contenant des gabarits de badges
 * avec les marquages de découpe appropriés.
 *
 * Dimensions pour badge 32mm Vevor:
 * - Diamètre visible du badge: 32mm
 * - Diamètre de coupe (incluant le repli): ~37mm (zone de sécurité pour le pliage)
 * - Diamètre total du papier: ~44mm (zone de découpe)
 */

const PDFDocument = require('pdfkit');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { program } = require('commander');

// Constantes pour les dimensions (en mm)
const BADGE_VISIBLE_DIAMETER = 32;      // Zone visible finale du badge
const BADGE_FOLD_DIAMETER = 37;         // Zone de pliage (sécurité pour le design)
const BADGE_CUT_DIAMETER = 44;          // Zone de découpe totale

// Conversion mm vers points PDF (1 point = 1/72 pouce, 1 pouce = 25.4mm)
const MM_TO_PT = 72 / 25.4;

// Dimensions de la page A4 en points
const PAGE_WIDTH = 210 * MM_TO_PT;
const PAGE_HEIGHT = 297 * MM_TO_PT;

// Marges de la page (en mm)
const PAGE_MARGIN = 10;

/**
 * Convertit des millimètres en points PDF
 */
function mmToPt(mm) {
    return mm * MM_TO_PT;
}

/**
 * Calcule la disposition optimale des badges sur une page A4
 */
function calculateLayout() {
    const badgeSize = BADGE_CUT_DIAMETER;
    const margin = PAGE_MARGIN;

    const availableWidth = 210 - (2 * margin);
    const availableHeight = 297 - (2 * margin);

    const cols = Math.floor(availableWidth / badgeSize);
    const rows = Math.floor(availableHeight / badgeSize);

    // Centrage des badges sur la page
    const totalBadgesWidth = cols * badgeSize;
    const totalBadgesHeight = rows * badgeSize;

    const offsetX = margin + (availableWidth - totalBadgesWidth) / 2;
    const offsetY = margin + (availableHeight - totalBadgesHeight) / 2;

    return { cols, rows, offsetX, offsetY, badgesPerPage: cols * rows };
}

/**
 * Dessine les marquages de découpe pour un badge
 * @param {object} doc - Document PDF
 * @param {number} centerX - Position X du centre en mm
 * @param {number} centerY - Position Y du centre en mm
 * @param {object} options - Options d'affichage
 * @param {boolean} options.showCutGuides - Afficher les guides de découpe
 * @param {boolean} options.showFoldGuides - Afficher les guides de pliage
 * @param {boolean} options.showCenterCross - Afficher la croix de centrage
 * @param {boolean} options.showWarningText - Afficher le texte d'avertissement dans la zone de pliage
 */
function drawBadgeGuides(doc, centerX, centerY, options = {}) {
    const { showCutGuides = true, showFoldGuides = true, showCenterCross = true, showWarningText = true } = options;
    const centerXPt = mmToPt(centerX);
    const centerYPt = mmToPt(centerY);

    // Cercle de découpe (extérieur) - ligne pointillée
    if (showCutGuides) {
        doc.save();
        doc.strokeColor('#999999')
           .lineWidth(0.5)
           .dash(3, { space: 2 })
           .circle(centerXPt, centerYPt, mmToPt(BADGE_CUT_DIAMETER / 2))
           .stroke();
        doc.restore();
    }

    // Cercle de pliage (zone de sécurité) - ligne fine
    if (showFoldGuides) {
        doc.save();
        doc.strokeColor('#CCCCCC')
           .lineWidth(0.3)
           .circle(centerXPt, centerYPt, mmToPt(BADGE_FOLD_DIAMETER / 2))
           .stroke();
        doc.restore();
    }

    // Cercle visible (intérieur) - ligne continue
    if (showCutGuides || showFoldGuides) {
        doc.save();
        doc.strokeColor('#666666')
           .lineWidth(0.5)
           .circle(centerXPt, centerYPt, mmToPt(BADGE_VISIBLE_DIAMETER / 2))
           .stroke();
        doc.restore();
    }

    // Croix de centrage
    if (showCenterCross) {
        const crossSize = 2; // mm
        doc.save();
        doc.strokeColor('#AAAAAA')
           .lineWidth(0.25)
           .moveTo(centerXPt - mmToPt(crossSize), centerYPt)
           .lineTo(centerXPt + mmToPt(crossSize), centerYPt)
           .moveTo(centerXPt, centerYPt - mmToPt(crossSize))
           .lineTo(centerXPt, centerYPt + mmToPt(crossSize))
           .stroke();
        doc.restore();
    }

    // Texte d'avertissement dans la zone de pliage
    if (showWarningText) {
        doc.save();

        // Calculer le rayon optimal pour le texte (au milieu de la zone de pliage)
        const textRadius = (BADGE_VISIBLE_DIAMETER / 2 + BADGE_FOLD_DIAMETER / 2) / 2;
        const textRadiusPt = mmToPt(textRadius);

        // Configuration du texte
        doc.fillColor('#CC0000', 0.35) // Rouge avec 35% d'opacité
           .fontSize(3.5)
           .font('Helvetica-Bold');

        const warningText = '• NE PAS MARQUER: SURFACE VIERGE • ';

        // Fonction pour dessiner du texte en arc de cercle
        const drawTextOnArc = (text, centerX, centerY, radius, startAngle) => {
            const chars = text.split('');
            const charWidths = chars.map(char => doc.widthOfString(char));
            const totalWidth = charWidths.reduce((sum, w) => sum + w, 0);

            // Calculer l'angle total que le texte va occuper
            const spacing = 1.2; // Espacement entre caractères
            const arcLength = totalWidth * spacing;
            const totalAngle = (arcLength / radius) * (180 / Math.PI);

            // Angle de départ pour centrer le texte
            let currentAngle = startAngle - (totalAngle / 2);

            chars.forEach((char, index) => {
                const charWidth = charWidths[index];
                const angleStep = ((charWidth * spacing) / radius) * (180 / Math.PI);

                // Calculer la position du caractère
                const angleRad = (currentAngle * Math.PI) / 180;
                const x = centerX + radius * Math.cos(angleRad);
                const y = centerY + radius * Math.sin(angleRad);

                // Rotation du caractère pour qu'il suive la tangente du cercle
                // Ajustement pour que le texte soit orienté vers l'extérieur
                const rotationAngle = currentAngle + 90;

                doc.save();
                doc.translate(x, y);
                doc.rotate(rotationAngle, { origin: [0, 0] });
                doc.text(char, -charWidth / 2, -doc.currentLineHeight() / 2, {
                    lineBreak: false
                });
                doc.restore();

                currentAngle += angleStep;
            });
        };

        // Dessiner le texte sur le haut du cercle (commence à -90°)
        drawTextOnArc(warningText, centerXPt, centerYPt, textRadiusPt, -90);

        // Dessiner le texte sur le bas du cercle (commence à 90°)
        drawTextOnArc(warningText, centerXPt, centerYPt, textRadiusPt, 90);

        doc.restore();
    }
}

/**
 * Vérifie qu'une image existe et est lisible
 */
async function validateImage(imagePath) {
    try {
        await sharp(imagePath).metadata();
        return true;
    } catch (error) {
        console.error(`Erreur lors de la validation de l'image ${imagePath}:`, error.message);
        return false;
    }
}

/**
 * Génère le PDF avec les gabarits de badges
 */
async function generatePDF(imageFiles, outputPath, options = {}) {
    const { copies = 0, showGuides = true, showCutGuides = true, showCenterCross = true, showWarningText = true, scale = 1.0 } = options;

    const layout = calculateLayout();

    // Créer la liste des images à placer
    // Si copies = 0, on remplit la page entière en répétant les images
    let imagesToPlace = [];
    if (copies === 0) {
        // Remplir une page complète en répétant les images
        const totalBadges = layout.badgesPerPage;
        for (let i = 0; i < totalBadges; i++) {
            imagesToPlace.push(imageFiles[i % imageFiles.length]);
        }
    } else {
        // Nombre de copies spécifié par l'utilisateur
        for (const imageFile of imageFiles) {
            for (let i = 0; i < copies; i++) {
                imagesToPlace.push(imageFile);
            }
        }
    }

    console.log(`Disposition: ${layout.cols} colonnes x ${layout.rows} lignes = ${layout.badgesPerPage} badges par page`);
    console.log(`Total: ${imagesToPlace.length} badges à générer`);

    const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        info: {
            Title: 'Gabarits de badges 32mm',
            Author: 'Badge Generator',
            Subject: 'Badges pour presse Vevor 32mm'
        }
    });

    const writeStream = fs.createWriteStream(outputPath);
    doc.pipe(writeStream);

    // Valider toutes les images
    console.log('Validation des images...');
    const validatedImages = new Map();
    for (const imagePath of imageFiles) {
        const isValid = await validateImage(imagePath);
        if (isValid) {
            validatedImages.set(imagePath, true);
        }
    }

    let currentBadge = 0;
    let pageCount = 0;

    while (currentBadge < imagesToPlace.length) {
        if (pageCount > 0) {
            doc.addPage();
        }
        pageCount++;

        // Ajouter un titre discret en haut de page
        doc.save();
        doc.fontSize(8)
           .fillColor('#CCCCCC')
           .text(`Badges 32mm - Page ${pageCount}`, mmToPt(PAGE_MARGIN), mmToPt(3), {
               width: mmToPt(210 - 2 * PAGE_MARGIN),
               align: 'center'
           });
        doc.restore();

        // Placer les badges sur la page
        for (let row = 0; row < layout.rows && currentBadge < imagesToPlace.length; row++) {
            for (let col = 0; col < layout.cols && currentBadge < imagesToPlace.length; col++) {
                const centerX = layout.offsetX + (col + 0.5) * BADGE_CUT_DIAMETER;
                const centerY = layout.offsetY + (row + 0.5) * BADGE_CUT_DIAMETER;

const imagePath = imagesToPlace[currentBadge];
                const isValid = validatedImages.get(imagePath);

                if (isValid) {
                    // Placer l'image originale au centre du badge (zone visible de 32mm)
                    // PDFKit se charge du redimensionnement sans rééchantillonnage
                    // On utilise width/height pour forcer l'image à remplir exactement la zone
                    // Le facteur scale permet d'ajuster si l'image ne remplit pas parfaitement le cercle
                    const imgSize = mmToPt(BADGE_VISIBLE_DIAMETER) * scale;
                    const imgX = mmToPt(centerX) - imgSize / 2;
                    const imgY = mmToPt(centerY) - imgSize / 2;

                    // Utilisation de width et height pour étirer/compresser l'image
                    // afin qu'elle remplisse exactement la zone visible
                    doc.image(imagePath, imgX, imgY, {
                        width: imgSize,
                        height: imgSize
                    });
                }

                // Dessiner les guides de découpe
                if (showGuides || !showCutGuides) {
                    drawBadgeGuides(doc, centerX, centerY, {
                        showCutGuides: showGuides && showCutGuides,
                        showFoldGuides: showGuides,
                        showCenterCross: showGuides && showCenterCross,
                        showWarningText: showGuides && showWarningText
                    });
                }

                currentBadge++;
            }
        }
    }

    // Ajouter une page de légende
    doc.addPage();
    doc.fontSize(16)
       .fillColor('#333333')
       .text('Légende des marquages', mmToPt(PAGE_MARGIN), mmToPt(20));

    doc.fontSize(10)
       .fillColor('#666666');

    let legendY = 45;

    // Exemple de badge avec légende
    const exampleX = 105;
    const exampleY = 100;

    drawBadgeGuides(doc, exampleX, exampleY);

    // Légende
    doc.fillColor('#999999')
       .text('― ― ― Ligne de découpe (44mm)', mmToPt(PAGE_MARGIN), mmToPt(legendY));
    legendY += 8;

    doc.fillColor('#CCCCCC')
       .text('―――― Zone de pliage/sécurité (37mm)', mmToPt(PAGE_MARGIN), mmToPt(legendY));
    legendY += 8;

    doc.fillColor('#666666')
       .text('―――― Zone visible du badge (32mm)', mmToPt(PAGE_MARGIN), mmToPt(legendY));
    legendY += 8;

    doc.fillColor('#AAAAAA')
       .text('  +   Centre du badge', mmToPt(PAGE_MARGIN), mmToPt(legendY));

    // Instructions
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Instructions:', mmToPt(PAGE_MARGIN), mmToPt(150));

    doc.fontSize(10)
       .fillColor('#666666')
       .text('1. Imprimez ce document à 100% (sans mise à l\'échelle)', mmToPt(PAGE_MARGIN), mmToPt(160))
       .text('2. Découpez chaque badge en suivant la ligne pointillée extérieure (44mm)', mmToPt(PAGE_MARGIN), mmToPt(172))
       .text('3. Placez le papier découpé dans la presse Vevor 32mm', mmToPt(PAGE_MARGIN), mmToPt(184))
       .text('4. Le cercle intérieur (32mm) sera la zone visible finale du badge', mmToPt(PAGE_MARGIN), mmToPt(196));

    doc.end();

    return new Promise((resolve, reject) => {
        writeStream.on('finish', () => {
            console.log(`\nPDF généré avec succès: ${outputPath}`);
            console.log(`Nombre de pages: ${pageCount + 1} (incluant la page de légende)`);
            resolve();
        });
        writeStream.on('error', reject);
    });
}

/**
 * Point d'entrée principal
 */
async function main() {
    program
        .name('badge-generator')
        .description('Génère un PDF avec des gabarits de badges 32mm pour presse Vevor')
        .argument('<images...>', 'Fichiers images à utiliser comme fond des badges')
        .option('-o, --output <file>', 'Fichier PDF de sortie', 'badges.pdf')
        .option('-c, --copies <number>', 'Nombre de copies de chaque badge (0 = remplir la page)', '0')
        .option('-s, --scale <number>', 'Facteur d\'échelle pour ajuster la taille de l\'image (ex: 1.05 pour +5%)', '1.0')
        .option('--no-guides', 'Ne pas afficher les guides de découpe ni de pliage')
        .option('--no-cut-guides', 'Ne pas afficher les guides de découpe (conserve les guides de pliage)')
        .option('--no-center-cross', 'Ne pas afficher la croix de centrage')
        .option('--no-warning-text', 'Ne pas afficher le texte d\'avertissement dans la zone de pliage')
        .parse(process.argv);

    const options = program.opts();
    const imageFiles = program.args;

    // Vérifier que les fichiers existent
    const validFiles = [];
    for (const file of imageFiles) {
        const fullPath = path.resolve(file);
        if (fs.existsSync(fullPath)) {
            validFiles.push(fullPath);
        } else {
            console.warn(`Attention: Le fichier "${file}" n'existe pas, il sera ignoré.`);
        }
    }

    if (validFiles.length === 0) {
        console.error('Erreur: Aucun fichier image valide trouvé.');
        process.exit(1);
    }

    console.log('='.repeat(50));
    console.log('Générateur de badges 32mm pour presse Vevor');
    console.log('='.repeat(50));
    console.log(`\nImages à traiter: ${validFiles.length}`);
    validFiles.forEach(f => console.log(`  - ${path.basename(f)}`));
    console.log(`Copies par image: ${options.copies === '0' ? 'Remplir la page' : options.copies}`);
    console.log(`Facteur d'échelle: ${options.scale}`);
    console.log(`Fichier de sortie: ${options.output}`);
    console.log(`Guides: ${!options.guides ? 'Aucun' : (options.cutGuides ? 'Découpe + Pliage' : 'Pliage uniquement')}`);
    console.log('');

    try {
        await generatePDF(validFiles, options.output, {
            copies: parseInt(options.copies, 10),
            showGuides: options.guides,
            showCutGuides: options.cutGuides,
            showCenterCross: options.centerCross,
            showWarningText: options.warningText,
            scale: parseFloat(options.scale)
        });
    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error.message);
        process.exit(1);
    }
}

main();

